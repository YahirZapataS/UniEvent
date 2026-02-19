import { db } from './services/firebaseConfig.js';
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { protectRoute } from './modules/authGuard.js';
import { formatDateSpanish } from './modules/utils.js';

protectRoute();

const table = document.querySelector('#applicationsTable tbody');

const loadFinishedEvents = async () => {
    if (!table) return;
    
    try {
        const q = query(
            collection(db, "solicitudes"), 
            where("state", "==", "Concluida"), 
            orderBy("date", "asc")
        );
        const snapshot = await getDocs(q);

        table.innerHTML = "";
        if (snapshot.empty) {
            table.innerHTML = `<tr><td colspan="6" class="empty-row">No hay actividades concluidas</td></tr>`;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${data.name}</td>
                <td>${data.activityName}</td>
                <td>${formatDateSpanish(data.date)}</td>
                <td>${data.startTime} - ${data.endTime}</td>
                <td>${data.place}</td>
                <td><span class="status-badge status-concluida">Concluida</span></td>
            `;
            table.appendChild(row);
        });
    } catch (error) {
        console.error("Error cargando historial:", error);
    }
};

document.addEventListener('DOMContentLoaded', loadFinishedEvents);