
import { db } from "./firebaseConfig.js";
import { collection, addDoc, getDoc, doc} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
        Swal.fire("La hora de inicio debe ser anterior a la hora de finalización.");
        return;
    }

    try {
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