import { db, auth } from "./firebaseConfig.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
    const q = query (requestsRef, where("state", "==", "Rechazada"));
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
        <td>${data.state}</td>
    `;
        table.appendChild(row);
    });
});
