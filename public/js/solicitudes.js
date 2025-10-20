import { db } from "./firebaseConfig.js";
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const ADMIN_EMAIL = "zs21021768@estudiantes.uv.mx";
const EMAILJS_SERVICE_ID_NEW = "service_jhvkojp";
const EMAILJS_TEMPLATE_ID_NEW = "template_547yaif";

const form = document.getElementById("formSolicitud");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById('tituloPersona').value;
    const name = document.getElementById("name").value;
    const cargo = document.getElementById('puestoTrabajo').value;
    const activityType = document.getElementById("activityType").value;
    const activityName = document.getElementById("activityName").value;
    const description = document.getElementById("description").value;
    const date = document.getElementById("date").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const place = document.getElementById("place").value;
    const email = document.getElementById("email").value;

    // Validación de la hora
    if (startTime >= endTime) {
        Swal.fire("Upss!", "La hora de inicio debe ser anterior a la hora de finalización.", "warning");
        return;
    }

    try {
        const requestsRef = collection(db, "solicitudes");
        const toMinutes = (timeStr) => {
            const [hour, minute] = timeStr.split(":").map(Number);
            return hour * 60 + minute;
        };

        const newStart = toMinutes(startTime);
        const newEnd = toMinutes(endTime);

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

            if (newStart < end && newEnd > start) {
                conflictFound = true;
            }
        });

        if (conflictFound) {
            Swal.fire("Conflicto de horario", "Ya existe una actividad registrada en ese espacio en el horario solicitado. Intenta con otro horario o lugar", "warning");
            return;
        }

        // Guardar solicitud
        await addDoc(collection(db, "solicitudes"), {
            title,
            name,
            cargo,
            activityType,
            activityName,
            description,
            date,
            startTime,
            endTime,
            place,
            state: "Pendiente",
            email,
            registerDate: new Date().toISOString()
        });

        // Envío de correo al administrador usando EmailJS (como en dashboard.js)
        try {
            const templateParams = {
                to_email: ADMIN_EMAIL,
                responsible_name: `${title} ${name}`,
                activity_title: activityName,
                activity_type: activityType,
                request_date: date,
                request_time: `${startTime} - ${endTime}`,
                request_place: place
            };

            await emailjs.send(EMAILJS_SERVICE_ID_NEW, EMAILJS_TEMPLATE_ID_NEW, templateParams);
            console.log("Notificación al administrador enviada con éxito mediante EmailJS.");

        } catch (emailError) {
            console.error("Error al enviar el correo con EmailJS:", emailError);
        }

        Swal.fire('¡Enviado!', 'Su solicitud ha sido registrada correctamente. Te notificaremos cuando sea aprobada.', 'success');
        form.reset();

    } catch (error) {
        console.error("Error al guardar:", error);
        Swal.fire('Error', 'Hubo un problema al enviar tu solicitud. Inténtalo de nuevo más tarde.', 'error');
    }
});