import { db, auth } from './firebaseConfig.js';
import {
    collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const table = document.querySelector('#applicationsTable tbody');

// Validar sesión
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const q = query(collection(db, "solicitudes"), where("state", "==", "Aceptada"));
    const snapshot = await getDocs(q);

    const now = new Date();

    let count = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        const fullDate = new Date(`${data.date}T${data.startTime}`);

        if (fullDate < now) {
            const row = document.createElement("tr");
            row.innerHTML = `
        <td>${data.name}</td>
        <td>${data.activityName}</td>
        <td>${data.date}</td>
        <td>${data.startTime}</td>
        <td>${data.place}</td>
        `;
            table.appendChild(row);
            count++;
        }
    });

    if (count === 0) {
        table.innerHTML = `<tr><td colspan="5">No hay actividades concluidas</td></tr>`;
    }
});

// Logout
document.getElementById("cerrarSesion").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
});
