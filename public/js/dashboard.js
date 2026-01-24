import { db, auth } from './firebaseConfig.js';
import { collection, getDocs, getDoc, updateDoc, doc, query, where, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

emailjs.init("IyDvp3Qr5cKPcCyWS");

const table = document.querySelector('#applicationsTable tbody');
const btnClose = document.getElementById('cerrarSesion');
const btnAdd = document.getElementById('fabAdd');

async function updateFinishedRequests() {
    const requestsRef = collection(db, 'solicitudes');
    const q = query(requestsRef, where("state", "==", "Aceptada"));

    try {
        const snapshot = await getDocs(q);
        const now = new Date();
        const nowString = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const nowTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }); // HH:MM

        let updatedCount = 0;

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const docId = docSnap.id;

            const eventDate = data.date;
            const endTime = data.endTime;

            if (eventDate < nowString || (eventDate === nowString && endTime < nowTime)) {

                const docRef = doc(db, "solicitudes", docId);
                await updateDoc(docRef, { state: "Concluida" });
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            console.log(`[Limpieza] ${updatedCount} solicitudes han sido marcadas como Concluidas.`);
        }

    } catch (error) {
        console.error("Error al actualizar solicitudes a 'Concluido':", error);
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    await updateFinishedRequests();

    const requestsRef = collection(db, 'solicitudes');
    const q = query(
        requestsRef,
        where("state", "==", "Pendiente"),
        orderBy('registerDate', 'desc'),
        orderBy('startTime', 'asc')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        table.innerHTML = `<tr><td colspan="7">No hay solicitudes pendientes</td></tr>`;
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
        <td>${data.date}</td>
        <td>${data.startTime}</td>
        <td>${data.endTime}</td>
        <td>${data.place}</td>
        <td>
        <button data-id="${docSnap.id}" class="aprobar">Aceptar</button>
        <button data-id="${docSnap.id}" class="rechazar">Rechazar</button>
        </td>
    `;
        table.appendChild(row);
    });
});

document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("aprobar") || e.target.classList.contains("rechazar")) {
        const id = e.target.dataset.id;
        const newState = e.target.classList.contains("aprobar") ? "Aceptada" : "Rechazada";

        const confirm = await Swal.fire({
            title: `¿Deseas marcar como ${newState} esta solicitud?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;

        try {
            const requestRef = doc(db, "solicitudes", id);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                throw new Error("La solicitud no existe.");
            }

            await updateDoc(requestRef, { state: newState });
            if (newState === "Aceptada") {
                updateDoc.reminderSent = false;
            }

            const data = requestSnap.data();
            await emailjs.send("service_jhvkojp", "template_xja6qwb", {
                title: data.title,
                name: data.name,
                state: newState,
                activity: data.activityName,
                description: data.description,
                date: data.date,
                startTime: data.startTime,
                place: data.place,
                email: data.email
            });
            Swal.fire("Actualizado", `Solicitud ${newState}`, "success").then(() => location.reload());
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "No se pudo procesar la solicitud", "error");
        }
    }
});

btnAdd.addEventListener('click', async () => {
    const { value: formValues } = await Swal.fire({
        title: 'Agendar Evento',
        width: '1000px',
        padding: '2rem',
        background: '#ffffff',
        html: `
            <p class="swal-subtitle">Este evento se registrará automáticamente como <b>Aceptado</b>.</p>
            <div class="swal-form-grid">
                <div class="swal-column">
                    <h4 class="swal-section-title"><span>1</span> Identificación</h4>
                    <div class="swal-field">
                        <label>Nombre de la Actividad</label>
                        <input id="swal-title" class="swal-input-custom">
                    </div>
                    <div class="swal-field">
                        <label>Tipo de Actividad</label>
                        <select id="swal-type" class="swal-select-custom">
                            <option value="">Seleccione tipo</option>
                            <option value="Conferencia">Conferencia</option>
                            <option value="Taller">Taller</option>
                            <option value="Curso">Curso</option>
                            <option value="Junta">Junta / Reunión</option>
                        </select>
                    </div>
                </div>

                <div class="swal-column">
                    <h4 class="swal-section-title"><span>2</span> Detalles</h4>
                    <div class="swal-field">
                        <label>Descripción del Evento</label>
                        <textarea id="swal-description" class="swal-textarea-custom" placeholder="Objetivo y audiencia..."></textarea>
                    </div>
                </div>

                <div class="swal-column">
                    <h4 class="swal-section-title"><span>3</span> Logística</h4>
                    <div class="swal-field">
                        <label>Fecha</label>
                        <input id="swal-date" type="date" class="swal-input-custom">
                    </div>
                    <div class="swal-time-row">
                        <div class="swal-field">
                            <label>Inicio</label>
                            <input id="swal-start" type="time" class="swal-input-custom">
                        </div>
                        <div class="swal-field">
                            <label>Fin</label>
                            <input id="swal-end" type="time" class="swal-input-custom">
                        </div>
                    </div>
                    <div class="swal-field">
                        <label>Espacio Académico</label>
                        <select id="swal-place" class="swal-select-custom">
                            <option value="">Seleccione el lugar</option>
                                <option value="Auditorio">Auditorio C.P.A. Josefina Góngora Espitía</option>
                                <option value="Aula 1">Aula 1</option>
                                <option value="Aula 2">Aula 2</option>
                                <option value="Aula 3">Aula 3</option>
                                <option value="Aula 4">Aula 4</option>
                                <option value="Aula 5">Aula 5</option>
                                <option value="Aula 6">Aula 6</option>
                                <option value="Aula 9">Aula 9</option>
                                <option value="Aula 10">Aula 10</option>
                                <option value="Aula 11">Aula 11</option>
                                <option value="Aula 12">Aula 12</option>
                                <option value="Aula 13">Aula 13</option>
                                <option value="Aula 14">Aula 14</option>
                                <option value="Aula 15">Aula 15</option>
                                <option value="Aula 16">Aula 16</option>
                                <option value="Aula 17">Aula 17</option>
                                <option value="Aula 18">Aula 18</option>
                                <option value="Aula 19">Laboratorio de LIS</option>
                                <option value="Aula 20">Laboratorio de LSCA</option>
                        </select>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Confirmar y Agendar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            const activityName = document.getElementById('swal-title').value;
            const activityType = document.getElementById('swal-type').value;
            const description = document.getElementById('swal-description').value;
            const date = document.getElementById('swal-date').value;
            const startTime = document.getElementById('swal-start').value;
            const endTime = document.getElementById('swal-end').value;
            const place = document.getElementById('swal-place').value;

            // 1. Validación de campos obligatorios
            if (!activityName || !activityType || !date || !startTime || !endTime || !place) {
                Swal.showValidationMessage('Por favor, completa todos los campos requeridos.');
                return false;
            }

            // 2. Validación de fin de semana (Sábado=5, Domingo=6 en getDay con ajuste UTC o local)
            const selectedDate = new Date(date + "T00:00:00");
            const dayOfWeek = selectedDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                Swal.showValidationMessage('No se pueden agendar eventos en fines de semana.');
                return false;
            }

            // 3. Validación de rango horario (07:00 a 20:00)
            const startHour = parseInt(startTime.split(":")[0]);
            const endHour = parseInt(endTime.split(":")[0]);

            if (startHour < 7 || endHour > 20 || (endHour === 20 && parseInt(endTime.split(":")[1]) > 0)) {
                Swal.showValidationMessage('El horario permitido es de 07:00 AM a 08:00 PM.');
                return false;
            }

            // 4. Validación lógica de tiempo
            if (startTime >= endTime) {
                Swal.showValidationMessage('La hora de inicio debe ser anterior a la de fin.');
                return false;
            }

            return { activityName, activityType, description, date, startTime, endTime, place };
        }
    });

    if (formValues) {
        // Ejecución del guardado en Firebase...
        Swal.fire({
            title: 'Registrando Evento...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            await addDoc(collection(db, "solicitudes"), {
                name: "Gestor",
                title: "C.",
                cargo: "Gestor de Espacios",
                email: "gestor@unievent.com",
                activityName: formValues.activityName,
                activityType: formValues.activityType,
                description: formValues.description,
                date: formValues.date,
                startTime: formValues.startTime,
                endTime: formValues.endTime,
                place: formValues.place,
                state: "Aceptada",
                registerDate: new Date(),
                reminderSent: false
            });

            Swal.fire('¡Éxito!', 'El evento ha sido registrado y aprobado.', 'success')
                .then(() => location.reload());

        } catch (error) {
            Swal.fire('Error', 'Hubo un problema al guardar.', 'error');
        }
    }
});

btnClose.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
});