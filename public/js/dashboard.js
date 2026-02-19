import { db, auth } from './services/firebaseConfig.js';
import { collection, getDocs, getDoc, updateDoc, doc, query, where, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { protectRoute } from './modules/authGuard.js';
import { formatDateSpanish } from './modules/utils.js';

// 1. Protección de ruta inmediata (reemplaza el bloque manual de auth)
protectRoute();

// Inicialización de EmailJS
emailjs.init("IyDvp3Qr5cKPcCyWS");

const table = document.querySelector('#applicationsTable tbody');
const btnAdd = document.getElementById('fabAdd');

/**
 * Limpieza automática de eventos pasados: Cambia estado a "Concluida"
 */
async function updateFinishedRequests() {
    const requestsRef = collection(db, 'solicitudes');
    const q = query(requestsRef, where("state", "==", "Aceptada"));

    try {
        const snapshot = await getDocs(q);
        const now = new Date();
        const nowString = now.toISOString().slice(0, 10);
        const nowTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        let updatedCount = 0;
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const eventDate = data.date;
            const endTime = data.endTime;

            if (eventDate < nowString || (eventDate === nowString && endTime < nowTime)) {
                await updateDoc(doc(db, "solicitudes", docSnap.id), { state: "Concluida" });
                updatedCount++;
            }
        }
        if (updatedCount > 0) console.log(`[Limpieza] ${updatedCount} eventos concluidos.`);
    } catch (error) {
        console.error("Error en limpieza:", error);
    }
}

/**
 * Carga y renderizado de solicitudes pendientes
 */
async function loadPendingRequests() {
    await updateFinishedRequests();

    const requestsRef = collection(db, 'solicitudes');
    const q = query(
        requestsRef,
        where("state", "==", "Pendiente"),
        orderBy('date', 'asc'),
        orderBy('startTime', 'asc')
    );

    try {
        const snapshot = await getDocs(q);
        table.innerHTML = "";

        if (snapshot.empty) {
            table.innerHTML = `<tr><td colspan="9" class="empty-row">No hay solicitudes pendientes</td></tr>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${data.name}</td>
                <td>${data.activityType}</td>
                <td>${data.activityName}</td>
                <td>${data.description}</td>
                <td>${formatDateSpanish(data.date)}</td>
                <td>${data.startTime}</td>
                <td>${data.endTime}</td>
                <td>${data.place}</td>
                <td class="actions">
                    <button data-id="${docSnap.id}" class="aprobar">Aceptar</button>
                    <button data-id="${docSnap.id}" class="rechazar">Rechazar</button>
                </td>
            `;
            table.appendChild(row);
        });
    } catch (error) {
        console.error("Error cargando solicitudes:", error);
    }
}

// Escuchar cambios de autenticación para cargar datos
onAuthStateChanged(auth, (user) => {
    if (user) loadPendingRequests();
});

/**
 * Delegación de eventos para Aceptar/Rechazar
 */
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("aprobar") || e.target.classList.contains("rechazar")) {
        const id = e.target.dataset.id;
        const newState = e.target.classList.contains("aprobar") ? "Aceptada" : "Rechazada";

        const { isConfirmed } = await Swal.fire({
            title: `¿Marcar como ${newState}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí',
            confirmButtonColor: newState === 'Aceptada' ? '#22c55e' : '#ef4444'
        });

        if (!isConfirmed) return;

        Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const requestRef = doc(db, "solicitudes", id);
            const requestSnap = await getDoc(requestRef);
            const data = requestSnap.data();

            await updateDoc(requestRef, { state: newState, reminderSent: false });

            // Envío de correo mediante EmailJS
            await emailjs.send("service_r39dndx", "template_xja6qwb", {
                name: data.name,
                state: newState,
                activity: data.activityName,
                date: data.date,
                startTime: data.startTime,
                place: data.place,
                email: data.email
            });

            Swal.fire("Éxito", `Solicitud ${newState}`, "success").then(() => loadPendingRequests());
        } catch (error) {
            Swal.fire("Error", "No se pudo procesar la solicitud", "error");
        }
    }
});

/**
 * Modal para agendar evento rápido (Gestor)
 */
btnAdd.addEventListener('click', async () => {
    const { value: formValues } = await Swal.fire({
        title: 'Agendar Evento',
        width: '1000px',
        html: `
            <p class="swal-subtitle">Este evento se registrará como <b>Aceptado</b>.</p>
            <div class="swal-form-grid">
                <div class="swal-column">
                    <h4 class="swal-section-title"><span>1</span> Identificación</h4>
                    <input id="swal-title" class="swal-input-custom" placeholder="Título">
                    <select id="swal-type" class="swal-select-custom">
                        <option value="">Tipo</option>
                        <option value="Conferencia">Conferencia</option>
                        <option value="Taller">Taller</option>
                    </select>
                </div>
                <div class="swal-column">
                    <h4 class="swal-section-title"><span>2</span> Detalles</h4>
                    <textarea id="swal-description" class="swal-textarea-custom"></textarea>
                </div>
                <div class="swal-column">
                    <h4 class="swal-section-title"><span>3</span> Logística</h4>
                    <input id="swal-date" type="date" class="swal-input-custom">
                    <div class="swal-time-row">
                        <input id="swal-start" type="time" class="swal-input-custom">
                        <input id="swal-end" type="time" class="swal-input-custom">
                    </div>
                    <select id="swal-place" class="swal-select-custom">
                        <option value="">Lugar</option>
                        <option value="Auditorio">Auditorio</option>
                        <option value="Aula 1">Aula 1</option>
                    </select>
                </div>
            </div>`,
        showCancelButton: true,
        preConfirm: () => {
            const data = {
                activityName: document.getElementById('swal-title').value,
                activityType: document.getElementById('swal-type').value,
                date: document.getElementById('swal-date').value,
                startTime: document.getElementById('swal-start').value,
                endTime: document.getElementById('swal-end').value,
                place: document.getElementById('swal-place').value
            };
            if (!data.activityName || !data.date || !data.startTime || !data.endTime) {
                Swal.showValidationMessage('Completa los campos obligatorios');
                return false;
            }
            return data;
        }
    });

    if (formValues) {
        try {
            await addDoc(collection(db, "solicitudes"), {
                ...formValues,
                name: "Gestor",
                email: "gestor@unievent.com",
                state: "Aceptada",
                registerDate: new Date(),
                reminderSent: false
            });
            Swal.fire('Éxito', 'Evento agendado', 'success').then(() => loadPendingRequests());
        } catch (e) { Swal.fire('Error', 'Error al guardar', 'error'); }
    }
});