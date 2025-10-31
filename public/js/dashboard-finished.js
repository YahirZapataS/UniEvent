import { db, auth } from './firebaseConfig.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const table = document.querySelector('#applicationsTable tbody');

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const q = query(collection(db, "solicitudes"), where("state", "==", "Aceptada"));
    const snapshot = await getDocs(q);

    const now = new Date();
    let hasFinishedActivities = false;

    snapshot.forEach(doc => {
        const data = doc.data();
        const activityDateTime = new Date(`${data.date}T${data.endTime}`);
        if (activityDateTime < now) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${data.name}</td>
                <td>${data.activityName}</td>
                <td>${data.date}</td>
                <td>${data.startTime}</td>
                <td>${data.place}</td>
            `;
            table.appendChild(row);
            hasFinishedActivities = true;
        }
    });

    if (!hasFinishedActivities) {
        table.innerHTML = `<tr><td colspan="5">No hay actividades concluidas</td></tr>`;
    }
});

document.getElementById("cerrarSesion").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
});