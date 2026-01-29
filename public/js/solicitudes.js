import { db } from "./firebaseConfig.js";
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_EMAIL = "kroblero@uv.mx";
const EMAILJS_SERVICE_ID_NEW = "service_r39dndx";
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

// --- LÓGICA DE HORARIOS DINÁMICOS (SIN BUFFER) ---
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
        const MIN_DURATION = 60;

        let optionsHtml = '<option value="">Hora Inicio</option>';
        for (let time = START_LIMIT; time < END_LIMIT; time += STEP) {
            // Se eliminó el BUFFER de la validación de ocupación
            const isOccupied = occupied.some(slot => time >= slot.start && time < slot.end);
            
            if (!isOccupied) {
                let limitForThisSlot = END_LIMIT;
                occupied.forEach(slot => {
                    if (slot.start > time && slot.start < limitForThisSlot) {
                        limitForThisSlot = slot.start; // El límite es exactamente el inicio del siguiente evento
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
    const MIN_DURATION = 60;
    const END_LIMIT = 1200;

    const q = query(collection(db, "solicitudes"), where("date", "==", date), where("place", "==", place), where("state", "in", ["Pendiente", "Aceptada"]));
    const snapshot = await getDocs(q);
    let occupied = snapshot.docs.map(doc => ({ start: toMinutes(doc.data().startTime), end: toMinutes(doc.data().endTime) }));

    let limitForEnd = END_LIMIT;
    occupied.forEach(slot => {
        // Se eliminó el BUFFER para permitir que el fin coincida con el inicio del siguiente
        if (slot.start > startMinutes && slot.start < limitForEnd) {
            limitForEnd = slot.start;
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
        name: document.getElementById("name").value,
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
            responsible_name: `${formData.name}`,
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

// --- GUÍA DE RESERVACIÓN ---
if (btnHelp) {
    btnHelp.addEventListener('click', () => {
        Swal.fire({
            title: '<span style="color: #2563eb; font-weight: 800; font-size: 1.6rem;">Manual de Reservación</span>',
            width: '650px',
            padding: '2rem',
            background: '#ffffff',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#2563eb',
            html: `
                <div style="text-align: left; font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6;">
                    
                    <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: #2563eb; color: white; padding: 10px 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                            👤 Panel del Solicitante
                        </div>
                        <div style="padding: 15px; font-size: 0.9rem; background: #f8fafc;">
                            Ingresa tu <b>Grado Académico</b>, nombre y cargo. El correo institucional es obligatorio para recibir la respuesta oficial de tu solicitud.
                        </div>
                    </div>

                    <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: #10b981; color: white; padding: 10px 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                            📂 Detalles de la Actividad
                        </div>
                        <div style="padding: 15px; font-size: 0.9rem; background: #f8fafc;">
                            Define el <b>Tipo de Actividad</b> y describe el evento de forma clara. Esta información ayuda al gestor a validar y priorizar las solicitudes.
                        </div>
                    </div>

                    <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: #f59e0b; color: white; padding: 10px 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                            📍 Logística y Calendario
                        </div>
                        <div style="padding: 15px; font-size: 0.9rem; background: #f8fafc;">
                            <p style="margin-bottom: 10px;"><b>Selecciona primero el Lugar</b>. El calendario se iluminará con colores según la ocupación actual:</p>
                            <div style="display: flex; gap: 15px; font-weight: 600;">
                                <span style="color: #22c55e;">● Verde: Libre</span>
                                <span style="color: #eab308;">● Amarillo: Medio</span>
                                <span style="color: #ef4444;">● Rojo: Saturado</span>
                            </div>
                        </div>
                    </div>

                    <div style="background: #f1f5f9; padding: 15px; border-radius: 12px; font-size: 0.85rem; color: #475569;">
                        <strong>Reglas de Reservación:</strong>
                        <ul style="margin-top: 5px; padding-left: 18px;">
                            <li>Duración mínima del evento: 1 hora.</li>
                            <li>Horarios permitidos: 08:00 AM a 08:00 PM.</li>
                            <li>Días de atención: Lunes a Viernes.</li>
                        </ul>
                    </div>
                </div>
            `
        });
    });
}