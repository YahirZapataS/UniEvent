import { db, auth } from './services/firebaseConfig.js';
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { formatDateSpanish, toMinutes, minutesToTimeStr } from './modules/utils.js';

const table = document.querySelector('#applicationsTable tbody');
const availabilityCache = new Map();
let currentEditingId = null;

const loadRequestsByStatus = async (status) => {
    const requestsRef = collection(db, 'solicitudes');
    const q = query(requestsRef, where("state", "==", status), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);

    table.innerHTML = "";

    if (snapshot.empty) {
        table.innerHTML = `<tr><td colspan="9" class="empty-row">No hay solicitudes para mostrar</td></tr>`;
        return;
    }

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const row = document.createElement("tr");

        if (status === 'Aceptada') {
            row.innerHTML = `
            <td>${data.name}</td>
            <td>${data.activityType}</td>
            <td>${data.activityName}</td>
            <td>${data.description}</td>
            <td>${formatDateSpanish(data.date)}</td>
            <td>${data.startTime} - ${data.endTime}</td>
            <td>${data.place}</td>
            <td><span class="status-badge">${data.state}</span></td>
            <td>
                <button onclick="editEvent('${docSnap.id}')" class="btn-edit"></button>
                <button onclick="deleteEvent('${docSnap.id}')" class="btn-delete"></button>
            </td>
        `;
            table.appendChild(row);
        } else {
            row.innerHTML = `
            <td>${data.name}</td>
            <td>${data.activityType}</td>
            <td>${data.activityName}</td>
            <td>${data.description}</td>
            <td>${formatDateSpanish(data.date)}</td>
            <td>${data.startTime} - ${data.endTime}</td>
            <td>${data.place}</td>
            <td><span class="status-badge">${data.state}</span></td>
        `;
            table.appendChild(row);
        }
    });
};

window.deleteEvent = async (id) => {
    const result = await Swal.fire({
        title: '<span style="color: #0f172a;">¿Cancelar evento?</span>',
        text: "Esta acción no se puede deshacer y el espacio quedará disponible nuevamente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#f1f5f9',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No',
        reverseButtons: true
    });

    if (result.isConfirmed) {
        // Mostrar Loading
        Swal.fire({
            title: 'Cancelando...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            await deleteDoc(doc(db, "solicitudes", id));
            Swal.fire({
                title: 'Cancelado',
                text: 'El evento ha sido cancelado exitosamente.',
                icon: 'success',
                confirmButtonColor: '#2563eb'
            }).then(() => location.reload());
        } catch (error) {
            console.error("Error al cancelar:", error);
            Swal.fire('Error', 'No se pudo cancelar el evento.', 'error');
        }
    }
};

window.editEvent = async (id) => {
    const docRef = doc(db, "solicitudes", id);
    const snap = await getDoc(docRef);
    const data = snap.data();

    // Precargar disponibilidad antes de abrir el modal
    await preloadMonthAvailability(new Date(), data.place);

    const { value: formValues } = await Swal.fire({
        title: '<span style="color: #0f172a; font-weight: 800;">Editar Logística</span>',
        width: '550px',
        padding: '2rem',
        background: '#ffffff',
        html: `
            <div style="text-align: left; display: flex; flex-direction: column; gap: 20px;">
                <div class="swal-field">
                    <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 8px;">Fecha del Evento</label>
                    <input id="sw-date" type="text" class="swal2-input" placeholder="Selecciona fecha" readonly 
                        style="margin: 0; width: 100%; height: 45px; border-radius: 10px; font-size: 1rem; background: #f8fafc; border: 1px solid #e2e8f0;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="swal-field">
                        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 8px;">Hora Inicio</label>
                        <select id="sw-start" class="swal2-select" style="margin: 0; width: 100%; height: 45px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0;">
                            <option value="${data.startTime}">${data.startTime}</option>
                        </select>
                    </div>
                    <div class="swal-field">
                        <label style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 8px;">Hora Fin</label>
                        <select id="sw-end" class="swal2-select" style="margin: 0; width: 100%; height: 45px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0;">
                            <option value="${data.endTime}">${data.endTime}</option>
                        </select>
                    </div>
                </div>
            </div>
        `,
        didOpen: () => {
            const dateInput = document.getElementById('sw-date');
            const startSelect = document.getElementById('sw-start');
            const endSelect = document.getElementById('sw-end');

            // Inicializar Flatpickr con la lógica de colores de la solicitud
            flatpickr(dateInput, {
                defaultDate: data.date,
                dateFormat: "Y-m-d",
                minDate: "today",
                locale: "es",
                disable: [date => (date.getDay() === 0 || date.getDay() === 6)],
                onDayCreate: (dObj, dStr, fp, dayElem) => {
                    const dateString = fp.formatDate(dayElem.dateObj, "Y-m-d");
                    const color = availabilityCache.get(`${dateString}-${data.place}`);
                    if (color) dayElem.classList.add(`availability-${color}`);
                },
                onChange: () => {
                    // Reutilizar la lógica de carga de horas dinámicas
                    updateAvailableStartTimes_Edit(dateInput.value, data.place, startSelect, endSelect);
                }
            });

            // Al cargar el modal, llenar horarios disponibles iniciales
            updateAvailableStartTimes_Edit(data.date, data.place, startSelect, endSelect, data.startTime);

            startSelect.addEventListener('change', () => {
                updateAvailableEndTimes_Edit(dateInput.value, data.place, startSelect.value, endSelect, data.endTime);
            });
        },
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            return {
                date: document.getElementById('sw-date').value,
                startTime: document.getElementById('sw-start').value,
                endTime: document.getElementById('sw-end').value
            };
        }
    });

    if (formValues) {
        Swal.fire({ title: 'Actualizando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        await updateDoc(docRef, formValues);
        Swal.fire('Éxito', 'Evento actualizado', 'success').then(() => location.reload());
    }
};


onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const currentPath = window.location.pathname.toLowerCase();

    if (currentPath.includes("dashboard-approved")) {
        loadRequestsByStatus("Aceptada");
    } else if (currentPath.includes("dashboard-declined")) {
        loadRequestsByStatus("Rechazada");
    } else if (snapshot.empty) {
        table.innerHTML = `<tr><td colspan="5">No hay actividades concluidas</td></tr>`;
        return;
    }


});

// Funciones adaptadas para la lógica de edición en Dashboard
async function updateAvailableStartTimes_Edit(date, place, startSelect, endSelect, currentStart = "") {
    if (!date || !place) return;
    try {
        const q = query(collection(db, "solicitudes"), where("date", "==", date), where("place", "==", place), where("state", "in", ["Pendiente", "Aceptada"]));
        const snapshot = await getDocs(q);

        // Excluir el documento actual de la ocupación para que no se bloquee a sí mismo
        let occupied = snapshot.docs
            .filter(doc => doc.id !== currentEditingId)
            .map(doc => ({ start: toMinutes(doc.data().startTime), end: toMinutes(doc.data().endTime) }));

        const START_LIMIT = 480; const END_LIMIT = 1200; const STEP = 30; const BUFFER = 30; const MIN_DURATION = 60;
        let optionsHtml = '<option value="">Hora Inicio</option>';

        for (let time = START_LIMIT; time < END_LIMIT; time += STEP) {
            const isOccupied = occupied.some(slot => time >= slot.start && time < (slot.end + BUFFER));
            if (!isOccupied) {
                const timeStr = minutesToTimeStr(time);
                const selected = timeStr === currentStart ? "selected" : "";
                optionsHtml += `<option value="${timeStr}" ${selected}>${timeStr}</option>`;
            }
        }
        startSelect.innerHTML = optionsHtml;
    } catch (e) { console.error(e); }
}

async function updateAvailableEndTimes_Edit(date, place, startTimeStr, endSelect, currentEnd = "") {
    if (!startTimeStr) return;
    const startMinutes = toMinutes(startTimeStr);
    const END_LIMIT = 1200; const BUFFER = 30; const MIN_DURATION = 60; const STEP = 30;

    const q = query(collection(db, "solicitudes"), where("date", "==", date), where("place", "==", place), where("state", "in", ["Pendiente", "Aceptada"]));
    const snapshot = await getDocs(q);
    let occupied = snapshot.docs.map(doc => ({ start: toMinutes(doc.data().startTime), end: toMinutes(doc.data().endTime) }));

    let limitForEnd = END_LIMIT;
    occupied.forEach(slot => {
        if (slot.start > startMinutes && (slot.start - BUFFER) < limitForEnd) limitForEnd = slot.start - BUFFER;
    });

    let optionsHtml = '<option value="">Hora Fin</option>';
    for (let time = startMinutes + MIN_DURATION; time <= limitForEnd; time += STEP) {
        const timeStr = minutesToTimeStr(time);
        const selected = timeStr === currentEnd ? "selected" : "";
        optionsHtml += `<option value="${timeStr}" ${selected}>${timeStr}</option>`;
    }
    endSelect.innerHTML = optionsHtml;
}

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