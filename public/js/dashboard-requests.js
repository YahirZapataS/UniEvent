import { db, auth } from "./firebaseConfig.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const table = document.querySelector('#applicationsTable tbody');

const loadRequestsByStatus = async (status) => {
    const requestsRef = collection(db, 'solicitudes');
    const q = query(requestsRef, where("state", "==", status));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        table.innerHTML = `<tr><td colspan="8">No hay solicitudes ${status.toLowerCase()}s para mostrar</td></tr>`;
        return;
    }

    table.innerHTML = ""; 

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
};


onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const currentPath = window.location.pathname;
    
    // Obtener el estado basado en el nombre del archivo
    if (currentPath.includes("dashboard-approved.html")) {
        loadRequestsByStatus("Aceptada");
    } else if (currentPath.includes("dashboard-declined.html")) {
        loadRequestsByStatus("Rechazada");
    }
});