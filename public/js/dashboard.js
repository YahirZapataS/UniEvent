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
                throw newError("La solicitud no existe.");
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
        title: 'Crear Evento Directo',
        html:
            '<p class="swal-text">Este evento se registrará inmediatamente como <b>Aceptado</b>.</p>' +
            '<input id="swal-title" class="swal2-input" placeholder="Nombre de la Actividad" required>' +
            '<select id="swal-type" class="swal2-select" required>' +
            '<option value="">Seleccione Tipo de Actividad</option>' +
            '<option value="Conferencia">Conferencia</option>' +
            '<option value="Taller">Taller</option>' +
            '<option value="Curso">Curso</option>' +
            '<option value="Junta">Junta / Reunión</option>' +
            '</select>' +
            '<input id="swal-description" class="swal2-input" placeholder="Descripción breve (Opcional)">' +
            '<input id="swal-date" class="swal2-input" type="date" placeholder="Fecha (YYYY-MM-DD)" required>' +
            '<input id="swal-start" class="swal2-input" type="time" placeholder="Hora de Inicio (HH:MM)" required>' +
            '<input id="swal-end" class="swal2-input" type="time" placeholder="Hora de Fin (HH:MM)" required>' +
            '<select id="swal-place" class="swal2-select" required>' +
            '<option value="">Seleccione un espacio</option>' +
            '<option value="Auditorio">Auditorio C.P.A. Josefine Góngora Espitia</option>' +
            '<option value="Aula 1">Aula 1</option>' +
            '<option value="Aula 2">Aula 2</option>' +
            '<option value="Aula 3">Aula 3</option>' +
            '<option value="Aula 4">Aula 4</option>' +
            '<option value="Aula 5">Aula 5</option>' +
            '<option value="Aula 6">Aula 6</option>' +
            '<option value="Aula 7">Aula 9</option>' +
            '<option value="Aula 8">Aula 10</option>' +
            '<option value="Aula 9">Aula 11</option>' +
            '<option value="Aula 10">Aula 12</option>' +
            '<option value="Aula 11">Aula 13</option>' +
            '<option value="Aula 12">Aula 14</option>' +
            '<option value="Aula 13">Aula 15</option>' +
            '<option value="Aula 14">Aula 16</option>' +
            '<option value="Aula 15">Aula 17</option>' +
            '<option value="Aula 16">Aula 18</option>' +
            '<option value="Aula 17">Laboratorio de LIS</option>' +
            '<option value="Aula 18">Laboratorio de LSCA</option>' +
            '</select>',

        preConfirm: () => {
            const activityName = document.getElementById('swal-title').value;
            const activityType = document.getElementById('swal-type').value;
            const description = document.getElementById('swal-description').value;
            const date = document.getElementById('swal-date').value;
            const startTime = document.getElementById('swal-start').value;
            const endTime = document.getElementById('swal-end').value;
            const place = document.getElementById('swal-place').value;
            
            if (!activityName || !activityType || !date || !startTime || !endTime || !place) {
                Swal.showValidationMessage('Por favor, completa todos los campos requeridos.');
                return false;
            }
            if (startTime >= endTime) {
                Swal.showValidationMessage('La hora de inicio debe ser anterior a la hora de fin.');
                return false;
            }

            return { activityName, activityType, description, date, startTime, endTime, place };
        }
    });
    if (formValues) {
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

            Swal.fire('¡Éxito!', 'El evento ha sido registrado y aprobado directamente.', 'success')
                .then((result) => {
                    if (result.isConfirmed || result.dismiss === Swal.DismissReason.timer) {
                        location.reload();
                    }
                });

        } catch (error) {
            console.error("Error al crear el evento directo:", error);
            Swal.fire('Error', 'Hubo un problema al guardar el evento. Intenta de nuevo.', 'error');
        }
    }
});

btnClose.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
});