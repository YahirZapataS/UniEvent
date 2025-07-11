
import { db } from "./firebaseConfig.js";
import { collection, addDoc, getDoc, query, where, getDocs} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

emailjs.init("IyDvp3Qr5cKPcCyWS");

const form = document.getElementById("formSolicitud");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const activityType = document.getElementById("activityType").value;
    const activityName = document.getElementById("activityName").value;
    const description = document.getElementById("description").value;
    const date = document.getElementById("date").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const place = document.getElementById("place").value;
    const email = document.getElementById("email").value;
    
    // Validation

    if(startTime >= endTime) {
        Swal.fire("Upss!","La hora de inicio debe ser anterior a la hora de finalización.", "warning");
        return;
    }

    try {

        const requestsRef = collection(db, "solicitudes");
        const toMinutes = (timeStr) => {
            const [hour, minute] = timeStr.split(":").map(Number);
            return hour * 60 + minute;
        };

        const newStart = toMinutes(startTime) - 30;
        const newEnd = toMinutes(endTime) + 30;

        const q = query (
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

            if (!(newEnd <= start || newStart >= end)) {
                conflictFound = true;
            }
        });

        if (conflictFound) {
            Swal.fire("Conflicto de horario", "Ya existe una actividad registrada en ese espacio cerca de esa hora. Intenta con otro horario o lugar", "warning");
            return;
        }


        const docRef = await addDoc(collection(db, "solicitudes"), {
            name,
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


        const requestSnap = await getDoc(docRef);
        const data = requestSnap.data();
        await emailjs.send("service_jhvkojp", "template_547yaif", {
            name: data.name,
            activityType: data.activityType,
            activityName: data.activityName,
            date: data.date,
            startTime: data.startTime,
            place: data.place,
            email: data.email
        });

        Swal.fire('¡Enviado!', 'Será notificado el estado de su solicitud al correo ingresado', 'success');
        form.reset();
    } catch (error) {
        console.error("Error al guardar", error);
        Swal.fire('Error', 'Hubo un problema al enviar tu solicitud. Inténtalo de nuevo más tarde.', 'error');
    }
});