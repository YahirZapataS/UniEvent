import { db, auth } from './firebaseConfig.js';
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const table = document.querySelector('#applicationsTable tbody');

const formatDateSpanish = (dateStr) => {
    if (!dateStr) return "Sin fecha";
    const [year, month, day] = dateStr.split("-");
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }

    // Ordenado por fecha para el historial
    const q = query(collection(db, "solicitudes"), where("state", "==", "Concluida"), orderBy("date", "asc"));
    const snapshot = await getDocs(q);

    table.innerHTML = "";
    if (snapshot.empty) {
        table.innerHTML = `<tr><td colspan="5">No hay actividades concluidas</td></tr>`;
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${data.name}</td>
            <td>${data.activityType}</td>
            <td>${data.activityName}</td>
            <td>${formatDateSpanish(data.date)}</td>
            <td>${data.startTime}</td>
            <td>${data.place}</td>
        `;
        table.appendChild(row);
    });
});

document.getElementById("cerrarSesion").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
});