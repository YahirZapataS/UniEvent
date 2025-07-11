import { db, auth } from './firebaseConfig.js';
import { collection, getDocs, getDoc, updateDoc, doc, query, where} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

emailjs.init("IyDvp3Qr5cKPcCyWS");

const table = document.querySelector('#applicationsTable tbody');
const btnClose = document.getElementById('cerrarSesion');

// Validate auth
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Pending requests
    const requestsRef = collection (db, 'solicitudes');
    const q = query (requestsRef, where("state", "==", "Pendiente"));
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
        <td>${data.place}</td>
        <td>
        <button data-id="${docSnap.id}" class="aprobar">✅ Aceptar</button>
        <button data-id="${docSnap.id}" class="rechazar">❌ Rechazar</button>
        </td>
    `;
        table.appendChild(row);
    });
});


// Approve or Decline
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("aprobar") || e.target.classList.contains("rechazar")) {
        const id = e.target.dataset.id;
        const newState = e.target.classList.contains("aprobar") ? "Aceptada" : "Rechazada";

        const confirm = await Swal.fire({
            title: `¿Deseas ${newState} esta solicitud?`,
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
            const data = requestSnap.data();
            await emailjs.send("service_jhvkojp", "template_xja6qwb", {
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

btnClose.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
});