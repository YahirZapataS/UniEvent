import { db } from "./firebaseConfig.js";
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_EMAIL = "kroblero@uv.mx";
const EMAILJS_SERVICE_ID_NEW = "service_jhvkojp";
const EMAILJS_TEMPLATE_ID_NEW = "template_547yaif";

const form = document.getElementById("formSolicitud");
const placeInput = document.getElementById("place");
const dateInput = document.getElementById("date");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const btnHelp = document.getElementById('btnHelp');

const availabilityCache = new Map();

// --- HELPERS DE TIEMPO ---
const toMinutes = (timeStr) => {
    const [hour, minute] = timeStr.split(":").map(Number);
    return hour * 60 + minute;
};

const minutesToTimeStr = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// --- LÓGICA DE DISPONIBILIDAD VISUAL (COLORES) ---
async function preloadMonthAvailability(dateObj, place) {
    if (!place) {
        availabilityCache.clear();
        return;
    }
    try {
        const requestsRef = collection(db, "solicitudes");
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        availabilityCache.clear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            const currentLoopDate = new Date(year, month, i);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayOfWeek = currentLoopDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && currentLoopDate >= now) {
                availabilityCache.set(`${dateStr}-${place}`, 'green');
            }
        }

        const q = query(requestsRef, where("place", "==", place), where("state", "in", ["Pendiente", "Aceptada"]));
        const snapshot = await getDocs(q);
        const monthCounts = new Map();

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const eventDate = data.date;
            if (eventDate && eventDate.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
                monthCounts.set(eventDate, (monthCounts.get(eventDate) || 0) + 1);
            }
        });

        monthCounts.forEach((count, dateString) => {
            const key = `${dateString}-${place}`;
            if (availabilityCache.has(key)) {
                let color = 'green';
                if (count >= 6) color = 'red';
                else if (count > 0) color = 'yellow';
                availabilityCache.set(key, color);
            }
        });
    } catch (error) {
        console.error("Error al precargar disponibilidad:", error);
    }
}

// --- LÓGICA DE HORARIOS DINÁMICOS ---
async function updateAvailableStartTimes() {
    const date = dateInput.value;
    const place = placeInput.value;
    if (!date || !place) return;

    startTimeInput.innerHTML = '<option value="">Cargando...</option>';
    endTimeInput.innerHTML = '<option value="">Hora Fin</option>';

    try {
        const q = query(collection(db, "solicitudes"), where("date", "==", date), where("place", "==", place), where("state", "in", ["Pendiente", "Aceptada"]));
        const snapshot = await getDocs(q);
        let occupied = snapshot.docs.map(doc => ({ start: toMinutes(doc.data().startTime), end: toMinutes(doc.data().endTime) }));

        const START_LIMIT = 480; // 08:00 AM
        const END_LIMIT = 1200;  // 08:00 PM
        const STEP = 30;
        const BUFFER = 30;
        const MIN_DURATION = 60;

        let optionsHtml = '<option value="">Hora Inicio</option>';
        for (let time = START_LIMIT; time < END_LIMIT; time += STEP) {
            const isOccupied = occupied.some(slot => time >= slot.start && time < (slot.end + BUFFER));
            if (!isOccupied) {
                let limitForThisSlot = END_LIMIT;
                occupied.forEach(slot => {
                    if (slot.start > time && (slot.start - BUFFER) < limitForThisSlot) {
                        limitForThisSlot = slot.start - BUFFER;
                    }
                });
                if ((limitForThisSlot - time) >= MIN_DURATION) {
                    const timeStr = minutesToTimeStr(time);
                    optionsHtml += `<option value="${timeStr}">${timeStr}</option>`;
                }
            }
        }
        startTimeInput.innerHTML = optionsHtml;
    } catch (error) { console.error(error); }
}

async function updateAvailableEndTimes() {
    const startTimeStr = startTimeInput.value;
    if (!startTimeStr) {
        endTimeInput.innerHTML = '<option value="">Hora Fin</option>';
        return;
    }
    const startMinutes = toMinutes(startTimeStr);
    const date = dateInput.value;
    const place = placeInput.value;
    const STEP = 30;
    const BUFFER = 30;
    const MIN_DURATION = 60;
    const END_LIMIT = 1200;

    const q = query(collection(db, "solicitudes"), where("date", "==", date), where("place", "==", place), where("state", "in", ["Pendiente", "Aceptada"]));
    const snapshot = await getDocs(q);
    let occupied = snapshot.docs.map(doc => ({ start: toMinutes(doc.data().startTime), end: toMinutes(doc.data().endTime) }));

    let limitForEnd = END_LIMIT;
    occupied.forEach(slot => {
        if (slot.start > startMinutes && (slot.start - BUFFER) < limitForEnd) {
            limitForEnd = slot.start - BUFFER;
        }
    });

    let optionsHtml = '<option value="">Hora Fin</option>';
    for (let time = startMinutes + MIN_DURATION; time <= limitForEnd; time += STEP) {
        const timeStr = minutesToTimeStr(time);
        optionsHtml += `<option value="${timeStr}">${timeStr}</option>`;
    }
    endTimeInput.innerHTML = optionsHtml;
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    flatpickr(dateInput, {
        dateFormat: "Y-m-d",
        minDate: "today",
        locale: "es",
        disable: [date => (date.getDay() === 0 || date.getDay() === 6)],
        onDayCreate: (dObj, dStr, fp, dayElem) => {
            const dateString = fp.formatDate(dayElem.dateObj, "Y-m-d");
            const color = availabilityCache.get(`${dateString}-${placeInput.value}`);
            if (color) dayElem.classList.add(`availability-${color}`);
        },
        onChange: () => updateAvailableStartTimes()
    });
});

placeInput.addEventListener('change', async () => {
    availabilityCache.clear();
    if (placeInput.value) {
        await preloadMonthAvailability(new Date(), placeInput.value);
        if (dateInput._flatpickr) dateInput._flatpickr.redraw();
    }
});

startTimeInput.addEventListener('change', updateAvailableEndTimes);

// --- ENVÍO ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formData = {
        title: document.getElementById('tituloPersona').value,
        name: document.getElementById("name").value,
        cargo: document.getElementById('puestoTrabajo').value,
        activityType: document.getElementById("activityType").value,
        activityName: document.getElementById("activityName").value,
        description: document.getElementById("description").value,
        place: placeInput.value,
        date: dateInput.value,
        startTime: startTimeInput.value,
        endTime: endTimeInput.value,
        email: document.getElementById("email").value,
        comments: document.getElementById("comments").value || "",
        state: "Pendiente",
        registerDate: new Date()
    };

    try {
        await addDoc(collection(db, "solicitudes"), formData);
        await emailjs.send(EMAILJS_SERVICE_ID_NEW, EMAILJS_TEMPLATE_ID_NEW, {
            to_email: ADMIN_EMAIL,
            responsible_name: `${formData.title} ${formData.name}`,
            activity_title: formData.activityName,
            request_date: formData.date,
            request_time: `${formData.startTime} - ${formData.endTime}`,
            request_place: formData.place,
            applicant_email: formData.email
        });
        Swal.fire('¡Enviado!', 'Su solicitud ha sido registrada.', 'success').then(() => window.location.href = "index.html");
    } catch (error) {
        Swal.fire('Error', 'Hubo un problema al procesar.', 'error');
    }
});

if (btnHelp) {
    btnHelp.addEventListener('click', () => {
        Swal.fire({
            title: '<span style="color: #2563eb; font-weight: 800;">Guía de Reservación</span>',
            html: `
                <div style="text-align: left; font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.5; font-size: 0.9rem;">
                    
                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #2563eb; margin-bottom: 5px; border-bottom: 1px solid #e2e8f0;">1. Información Personal</h4>
                        <p style="margin: 0;">Ingresa tu <b>Grado Académico</b>, nombre y cargo. Asegúrate de usar tu <b>Correo Institucional</b> para recibir la respuesta oficial.</p>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #2563eb; margin-bottom: 5px; border-bottom: 1px solid #e2e8f0;">2. Detalles de la Actividad</h4>
                        <p style="margin: 0;">Define el <b>Tipo de Evento</b> y añade una descripción clara. Esta información ayuda al gestor a priorizar las aprobaciones.</p>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #2563eb; margin-bottom: 5px; border-bottom: 1px solid #e2e8f0;">3. Logística y Disponibilidad</h4>
                        <p style="margin: 0 0 8px 0;">Selecciona el <b>Lugar</b> primero. El calendario mostrará colores según la ocupación:</p>
                        <div style="padding-left: 10px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span style="width: 12px; height: 12px; background: #22c55e; border-radius: 50%;"></span> <b>Verde:</b> Libre.
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span style="width: 12px; height: 12px; background: #eab308; border-radius: 50%;"></span> <b>Amarillo:</b> Medio.
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="width: 12px; height: 12px; background: #ef4444; border-radius: 50%;"></span> <b>Rojo:</b> Alto.
                            </div>
                        </div>
                    </div>

                    <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border-left: 4px solid #2563eb;">
                        <h4 style="color: #2563eb; margin: 0 0 5px 0;">Reglas de Tiempo</h4>
                        <ul style="margin: 0; padding-left: 18px;">
                            <li>Duración mínima obligatoria: <b>1 hora</b>.</li>
                            <li>Margen de limpieza entre eventos: <b>30 minutos</b>.</li>
                            <li>Horarios permitidos: <b>08:00 AM - 08:00 PM</b>.</li>
                        </ul>
                    </div>
                </div>
            `,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#2563eb',
            width: '550px'
        });
    });
}