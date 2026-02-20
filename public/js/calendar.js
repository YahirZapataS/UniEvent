import { db } from './services/firebaseConfig.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { protectRoute } from "./modules/authGuard.js";

protectRoute();

document.addEventListener('DOMContentLoaded', async () => {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    try {
        const q = query(
            collection(db, "solicitudes"),
            where("state", "==", "Aceptada")
        );

        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                title: data.activityName,
                start: data.date,
                extendedProps: {
                    name: data.name,
                    description: data.description,
                    time: data.startTime,
                    place: data.place,
                },
            };
        });

        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: "dayGridMonth",
            locale: "es",
            events: events,
            dateClick: function (info) {
                const selectedEvents = events.filter((ev) => ev.start === info.dateStr);
                if (selectedEvents.length > 0) {
                    let html = selectedEvents.map(ev => `
                        <b>${ev.title || 'Sin título'}</b><br>
                        Responsable: ${ev.extendedProps.name || 'Desconocido'}<br>
                        Hora: ${ev.extendedProps.time || 'Sin hora'}<br>
                        Lugar: ${ev.extendedProps.place || 'Sin lugar'}<br>
                        Descripción: ${ev.extendedProps.description || "Sin descripción"}<br><hr>
                    `).join("");

                    Swal.fire({
                        title: `Actividades del ${info.dateStr}`,
                        html: html,
                        width: "600px",
                        confirmButtonText: "Cerrar",
                    });
                } else {
                    Swal.fire("Sin actividades", "No hay actividades agendadas para este día.", "info");
                }
            },
        });

        calendar.render();
    } catch (error) {
        console.error("Error al cargar el calendario:", error);
    }
});