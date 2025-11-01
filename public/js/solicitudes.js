import { db } from "./firebaseConfig.js";
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_EMAIL = "zs21021768@estudiantes.uv.mx";
const EMAILJS_SERVICE_ID_NEW = "service_jhvkojp";
const EMAILJS_TEMPLATE_ID_NEW = "template_547yaif";

const form = document.getElementById("formSolicitud");
const dateInput = document.getElementById("date");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const placeInput = document.getElementById("place");

const availabilityCache = new Map();
let fp;

async function preloadMonthAvailability(dateObj, place) {
    if (!place) {
        availabilityCache.clear();
        return;
    }

    try {
        const requestsRef = collection(db, "solicitudes");
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const monthString = String(month).padStart(2, '0');

        const monthCache = new Map();

        const q = query(
            requestsRef,
            where("place", "==", place),
            where("state", "in", ["Pendiente", "Aceptada"])
        );

        const snapshot = await getDocs(q);

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const eventDate = data.date;

            if (eventDate.startsWith(`${year}-${monthString}`)) {
                monthCache.set(eventDate, (monthCache.get(eventDate) || 0) + 1);
            }
        });

        monthCache.forEach((count, dateString) => {
            let color;
            if (count === 0) {
                color = 'green';
            } else if (count < 5) {
                color = 'yellow';
            } else {
                color = 'red';
            }
            availabilityCache.set(`${dateString}-${place}`, color);
        });

    } catch (error) {
        console.error("Error al precargar disponibilidad:", error);
    }
}

async function initFlatpickr() {
    fp = flatpickr(dateInput, {
        dateFormat: "Y-m-d",
        minDate: "today",
        locale: flatpickr.l10ns.es,

        disable: [
            function (date) {
                return (date.getDay() === 0 || date.getDay() === 6);
            }
        ],

        onMonthChange: (selectedDates, dateStr, instance) => {
            const currentDisplayDate = new Date(instance.currentYear, instance.currentMonth, 1);

            if (placeInput.value) {
                preloadMonthAvailability(currentDisplayDate, placeInput.value).then(() => {
                    instance.redraw();
                });
            } else {
                instance.redraw();
            }
        },

        onDayCreate: (dObj, dStr, fpInstance, dayElem) => {
            const dateString = dayElem.dateObj.toISOString().split('T')[0];
            const place = placeInput.value;

            const availability = availabilityCache.get(`${dateString}-${place}`);

            if (availability) {
                dayElem.classList.add(`availability-${availability}`);
            }
        }
    });

    if (placeInput.value) {
        await preloadMonthAvailability(new Date(), placeInput.value);
        fp.redraw();
    }
}

document.addEventListener('DOMContentLoaded', initFlatpickr);

placeInput.addEventListener('change', async () => {
    availabilityCache.clear();

    const currentViewDate = fp.selectedDates.length > 0 ? fp.selectedDates[0] : new Date();

    if (fp && placeInput.value) {
        await preloadMonthAvailability(currentViewDate, placeInput.value);
        fp.redraw();
    } else {
        availabilityCache.clear();
        fp.redraw();
    }
});

const nomenclaturaBtn = document.getElementById('nomenclaturaBtn');

if (nomenclaturaBtn) {
    nomenclaturaBtn.addEventListener('click', () => {
        Swal.fire({
            title: '<strong>Nomenclatura de Colores</strong>',
            icon: 'info',
            html: `
                    <p style="text-align: left;">Los colores indican la disponibilidad general del <b>lugar seleccionado</b> para ese día:</p>
                    <ul style="text-align: left; margin-top: 15px; list-style-position: inside;">
                        <li style="margin-bottom: 8px;">
                            <span style="color:#008000; font-weight: bold;">Verde:</span> Día disponible.
                        </li>
                        <li style="margin-bottom: 8px;">
                            <span style="color:#aa8400; font-weight: bold;">Amarillo:</span> Disponibilidad limitada.
                        </li>
                        <li style="margin-bottom: 8px;">
                            <span style="color:#cc0000; font-weight: bold;">Rojo:</span> Día muy ocupado.
                        </li>
                    </ul>
                    <hr>
                    <p style="text-align: left; font-style: italic;">
                        Por favor, <b>selecciona un lugar primero</b>. La disponibilidad del horario exacto se revisará al enviar la solicitud.
                    </p>
                `,
            confirmButtonText: 'Entendido'
        });
    });
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    Swal.fire({
        title: 'Enviando Solicitud...',
        html: 'Por favor espera mientras verificamos y registramos tu petición.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const title = document.getElementById('tituloPersona').value;
    const name = document.getElementById("name").value;
    const cargo = document.getElementById('puestoTrabajo').value;
    const activityType = document.getElementById("activityType").value;
    const activityName = document.getElementById("activityName").value;
    const description = document.getElementById("description").value;
    const date = dateInput.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const place = placeInput.value;
    const email = document.getElementById("email").value;
    const comments = document.getElementById("comments").value;

    const toMinutes = (timeStr) => {
        const [hour, minute] = timeStr.split(":").map(Number);
        return hour * 60 + minute;
    };

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);
    const MIN_TIME_MINUTES = 480;
    const MAX_TIME_MINUTES = 1260;

    if (newStart < MIN_TIME_MINUTES || newEnd > MAX_TIME_MINUTES || newStart >= newEnd) {
        Swal.close();
        if (newStart < MIN_TIME_MINUTES || newEnd > MAX_TIME_MINUTES) {
            Swal.fire("Límite de horario", "Solo se permite apartar espacios entre las 8:00 AM y las 8:00 PM.", "warning");
        } else {
            Swal.fire("Upss!", "La hora de inicio debe ser anterior a la hora de finalización.", "warning");
        }
        return;
    }

    try {
        const requestsRef = collection(db, "solicitudes");
        const q = query(
            requestsRef,
            where("date", "==", date),
            where("place", "==", place),
            where("state", "in", ["Pendiente", "Aceptada"])
        );
        const snapshot = await getDocs(q);
        let conflictFound = false;

        snapshot.forEach(docSnap => {
            const request = docSnap.data();
            const start = toMinutes(request.startTime);
            const end = toMinutes(request.endTime);
            if (newStart < end && newEnd > start) { conflictFound = true; }
        });

        if (conflictFound) {
            Swal.fire("Conflicto de horario", "Ya existe una actividad registrada en ese espacio en el horario solicitado. Intenta con otro horario o lugar", "warning");
            return;
        }

        await addDoc(collection(db, "solicitudes"), {
            title, name, cargo, activityType, activityName, description,
            date, startTime, endTime, place, email, comments,
            state: "Pendiente", reminderSent: false,
            registerDate: new Date()
        });

        try {
            const templateParams = {
                to_email: ADMIN_EMAIL,
                responsible_name: `${title} ${name}`, activity_title: activityName,
                activity_type: activityType, request_date: date,
                request_time: `${startTime} - ${endTime}`, request_place: place,
                description: description, applicant_email: email
            };
            await emailjs.send(EMAILJS_SERVICE_ID_NEW, EMAILJS_TEMPLATE_ID_NEW, templateParams);
        } catch (emailError) {
            console.error("Error al enviar el correo con EmailJS al gestor:", emailError);
        }

        availabilityCache.clear();
        await preloadMonthAvailability(new Date(date), place);
        fp.redraw();

        Swal.fire('¡Enviado!', 'Su solicitud ha sido registrada correctamente. Te notificaremos cuando sea aprobada.', 'success')
            .then((result) => {
                if (result.isConfirmed || result.dismiss === Swal.DismissReason.timer) {
                    window.location.href = "index.html";
                }
            });

    } catch (error) {
        console.error("Error al guardar:", error);
        Swal.fire('Error', 'Hubo un problema al enviar tu solicitud. Inténtalo de nuevo más tarde.', 'error');

    } finally {
    }
});