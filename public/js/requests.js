import { db } from './services/firebaseConfig.js';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toMinutes, minutesToTimeStr, populatePlacesSelect } from './modules/utils.js';

const EMAILJS_SERVICE_ID_NEW = "service_r39dndx";
const EMAILJS_TEMPLATE_ID_NEW = "template_547yaif";

const form = document.getElementById("formSolicitud");
const placeInput = document.getElementById("place");
const dateInput = document.getElementById("date");
const btnHelp = document.getElementById('btnHelp');

// Elementos para lógica de múltiples fechas y horarios
const toggleMultipleDates = document.getElementById('toggleMultipleDates');
const btnAddTimeSlot = document.getElementById('btnAddTimeSlot');
const timeSlotsContainer = document.getElementById('timeSlotsContainer');

const availabilityCache = new Map();
let calendarInstance = null;

async function getAdminConfig() {
    const docRef = doc(db, 'config', 'adminSettings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return { ADMIN_EMAIL: "admin_default@uv.mx" };
}

// 1. Precarga los colores de disponibilidad del mes consultado
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

        // Asignamos Verde (Libre) por defecto a los días válidos a futuro
        for (let i = 1; i <= daysInMonth; i++) {
            const currentLoopDate = new Date(year, month, i);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayOfWeek = currentLoopDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && currentLoopDate >= now) {
                availabilityCache.set(`${dateStr}-${place}`, 'green');
            }
        }

        // Consultamos las solicitudes existentes de ese mes
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

        // Aplicamos la lógica de colores (Amarillo: Medio, Rojo: Saturado)
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

// 2. Inicializador del Calendario Flatpickr
function initCalendar(mode) {
    if (calendarInstance) {
        calendarInstance.destroy();
    }
    dateInput.value = '';

    calendarInstance = flatpickr(dateInput, {
        mode: mode,
        dateFormat: "Y-m-d",
        minDate: "today",
        locale: "es",
        disable: [date => (date.getDay() === 0 || date.getDay() === 6)],
        // Pinta los días al crearlos
        onDayCreate: (dObj, dStr, fp, dayElem) => {
            const dateString = fp.formatDate(dayElem.dateObj, "Y-m-d");
            const color = availabilityCache.get(`${dateString}-${placeInput.value}`);
            if (color) dayElem.classList.add(`availability-${color}`);
        },
        // Mantiene los colores al cambiar de mes
        onMonthChange: async (selectedDates, dateStr, instance) => {
            const currentMonth = new Date(instance.currentYear, instance.currentMonth, 1);
            await preloadMonthAvailability(currentMonth, placeInput.value);
            instance.redraw();
        },
        onYearChange: async (selectedDates, dateStr, instance) => {
            const currentMonth = new Date(instance.currentYear, instance.currentMonth, 1);
            await preloadMonthAvailability(currentMonth, placeInput.value);
            instance.redraw();
        },
        onChange: () => updateAllTimeSlots()
    });
}

// 3. Funciones de ayuda para obtener ocupación de MÚLTIPLES fechas a la vez
async function getOccupiedTimesForSelectedDates(place, dates) {
    let occupied = [];
    for (const date of dates) {
        const q = query(
            collection(db, "solicitudes"),
            where("date", "==", date),
            where("place", "==", place),
            where("state", "in", ["Pendiente", "Aceptada"])
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
            occupied.push({ start: toMinutes(doc.data().startTime), end: toMinutes(doc.data().endTime) });
        });
    }
    return occupied;
}

async function updateAllTimeSlots() {
    const startSelects = document.querySelectorAll('.startTime');
    for (const select of startSelects) {
        await updateAvailableStartTimes(select);
        const endElem = select.closest('.time-slot-row').querySelector('.endTime');
        if (endElem) endElem.innerHTML = '<option value="">Hora Fin</option>';
    }
}

async function updateAvailableStartTimes(specificStartSelect = null) {
    const startElem = specificStartSelect || document.querySelector('.startTime');
    if (!startElem) return;

    const dates = dateInput.value.split(', ').filter(d => d.trim() !== '');
    const place = placeInput.value;
    const endElem = startElem.closest('.time-slot-row').querySelector('.endTime');

    if (dates.length === 0 || !place) {
        startElem.innerHTML = '<option value="">Hora Inicio</option>';
        if (endElem) endElem.innerHTML = '<option value="">Hora Fin</option>';
        return;
    }

    startElem.innerHTML = '<option value="">Cargando...</option>';
    if (endElem) endElem.innerHTML = '<option value="">Hora Fin</option>';

    try {
        const occupied = await getOccupiedTimesForSelectedDates(place, dates);

        const START_LIMIT = 480;
        const END_LIMIT = 1200;
        const STEP = 30;
        const MIN_DURATION = 60;

        let optionsHtml = '<option value="">Hora Inicio</option>';
        for (let time = START_LIMIT; time < END_LIMIT; time += STEP) {
            const isOccupied = occupied.some(slot => time >= slot.start && time < slot.end);

            if (!isOccupied) {
                let limitForThisSlot = END_LIMIT;
                occupied.forEach(slot => {
                    if (slot.start > time && slot.start < limitForThisSlot) {
                        limitForThisSlot = slot.start;
                    }
                });
                if ((limitForThisSlot - time) >= MIN_DURATION) {
                    const timeStr = minutesToTimeStr(time);
                    optionsHtml += `<option value="${timeStr}">${timeStr}</option>`;
                }
            }
        }
        startElem.innerHTML = optionsHtml;
    } catch (error) { console.error(error); }
}

async function updateAvailableEndTimes(startSelect, endSelect) {
    const startTimeStr = startSelect.value;
    if (!startTimeStr) {
        endSelect.innerHTML = '<option value="">Hora Fin</option>';
        return;
    }

    const startMinutes = toMinutes(startTimeStr);
    const dates = dateInput.value.split(', ').filter(d => d.trim() !== '');
    const place = placeInput.value;
    const STEP = 30;
    const MIN_DURATION = 60;
    const END_LIMIT = 1200;

    const occupied = await getOccupiedTimesForSelectedDates(place, dates);

    let limitForEnd = END_LIMIT;
    occupied.forEach(slot => {
        if (slot.start > startMinutes && slot.start < limitForEnd) {
            limitForEnd = slot.start;
        }
    });

    let optionsHtml = '<option value="">Hora Fin</option>';
    for (let time = startMinutes + MIN_DURATION; time <= limitForEnd; time += STEP) {
        const timeStr = minutesToTimeStr(time);
        optionsHtml += `<option value="${timeStr}">${timeStr}</option>`;
    }
    endSelect.innerHTML = optionsHtml;
}

// 4. Inicialización y Listeners
document.addEventListener('DOMContentLoaded', async () => {
    await populatePlacesSelect(placeInput, "Seleccione el lugar");
    initCalendar("single");

    const initialStart = document.querySelector('.startTime');
    const initialEnd = document.querySelector('.endTime');
    if (initialStart && initialEnd) {
        initialStart.addEventListener('change', () => updateAvailableEndTimes(initialStart, initialEnd));
    }
});

placeInput.addEventListener('change', async () => {
    availabilityCache.clear();
    if (placeInput.value) {
        const currentMonth = calendarInstance ? new Date(calendarInstance.currentYear, calendarInstance.currentMonth, 1) : new Date();
        await preloadMonthAvailability(currentMonth, placeInput.value);
        if (calendarInstance) calendarInstance.redraw();
        updateAllTimeSlots();
    }
});

toggleMultipleDates?.addEventListener('change', (e) => {
    initCalendar(e.target.checked ? "multiple" : "single");
});

btnAddTimeSlot?.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'time-grid time-slot-row';
    row.style.gridTemplateColumns = '1fr 1fr 40px';

    row.innerHTML = `
        <select class="startTime" required><option value="">Hora Inicio</option></select>
        <select class="endTime" required><option value="">Hora Fin</option></select>
        <button type="button" class="btn-remove-slot" title="Quitar horario">X</button>
    `;

    timeSlotsContainer.appendChild(row);

    const startSelect = row.querySelector('.startTime');
    const endSelect = row.querySelector('.endTime');

    startSelect.addEventListener('change', () => updateAvailableEndTimes(startSelect, endSelect));

    row.querySelector('.btn-remove-slot').addEventListener('click', () => {
        row.remove();
        updateAllTimeSlots();
    });

    updateAvailableStartTimes(startSelect);
});

// 5. Envío dividido de Formulario
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fechasSeleccionadas = dateInput.value.split(', ').filter(d => d.trim() !== '');
    const timeRows = document.querySelectorAll('.time-slot-row');
    const horarios = Array.from(timeRows).map(row => ({
        start: row.querySelector('.startTime').value,
        end: row.querySelector('.endTime').value
    })).filter(h => h.start && h.end);

    if (fechasSeleccionadas.length === 0 || horarios.length === 0) {
        Swal.fire('Atención', 'Debes seleccionar al menos una fecha y un horario válido.', 'warning');
        return;
    }

    Swal.fire({ title: 'Procesando reservaciones...', text: 'Generando solicitudes', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const adminConfig = await getAdminConfig();
        const baseData = {
            name: document.getElementById("name").value,
            activityType: document.getElementById("activityType").value,
            activityName: document.getElementById("activityName").value,
            description: document.getElementById("description").value,
            place: placeInput.value,
            email: document.getElementById("email").value,
            comments: document.getElementById("comments").value || "",
            state: "Pendiente",
            registerDate: new Date(),
            reminderSent: false
        };

        const promesas = [];

        fechasSeleccionadas.forEach(fecha => {
            horarios.forEach(horario => {
                const formData = {
                    ...baseData,
                    date: fecha,
                    startTime: horario.start,
                    endTime: horario.end
                };
                promesas.push(addDoc(collection(db, "solicitudes"), formData));
            });
        });

        await Promise.all(promesas);

        await emailjs.send(EMAILJS_SERVICE_ID_NEW, EMAILJS_TEMPLATE_ID_NEW, {
            to_email: adminConfig.ADMIN_EMAIL,
            responsible_name: baseData.name,
            activity_title: baseData.activityName,
            request_date: fechasSeleccionadas.length > 1 ? "Múltiples (Ver panel)" : fechasSeleccionadas[0],
            request_time: horarios.length > 1 ? "Múltiples (Ver panel)" : `${horarios[0].start} - ${horarios[0].end}`,
            request_place: baseData.place,
            applicant_email: baseData.email
        });

        Swal.fire('¡Enviado!', `Se han registrado ${promesas.length} solicitud(es) exitosamente.`, 'success').then(() => window.location.href = "index.html");
    } catch (error) {
        Swal.fire('Error', 'Hubo un problema al procesar.', 'error');
        console.error(error);
    }
});

// 6. Modal de Ayuda
if (btnHelp) {
    const adminConfig = await getAdminConfig();
    const adminEmail = adminConfig.ADMIN_EMAIL;
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
                            Panel del Solicitante
                        </div>
                        <div style="padding: 15px; font-size: 0.9rem; background: #f8fafc;">
                            Ingresa tus datos para solicitar el espacio. El correo institucional es obligatorio para recibir la respuesta oficial de tu solicitud.
                        </div>
                    </div>

                    <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: #10b981; color: white; padding: 10px 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                            Detalles de la Actividad
                        </div>
                        <div style="padding: 15px; font-size: 0.9rem; background: #f8fafc;">
                            Define el <b>Tipo de Actividad</b> y describe el evento de forma clara. Esta información ayuda al gestor a validar y priorizar las solicitudes.
                        </div>
                    </div>

                    <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: #f59e0b; color: white; padding: 10px 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                            Logística y Calendario
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
                            <p>Si necesitas un espacio en fin de semana, favor de contactar a <a href="mailto:${adminEmail}" style="color: #2563eb;">${adminEmail}</a></p>
                        </ul>
                    </div>
                </div>
            `
        });
    });
}