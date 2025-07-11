
import { db } from "./firebaseConfig.js";
import { collection, addDoc} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("formSolicitud");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const activity = document.getElementById("activity").value;
    const description = document.getElementById("description").value;
    const date = document.getElementById("date").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const place = document.getElementById("place").value;
    const email = document.getElementById("email").value;

    // Get marked checkboxes

    const guests = Array.from(document.querySelectorAll('input[name="guests"]:checked')).map(el => el.value);

    // Validation

    if(startTime >= endTime) {
        Swal.fire("La hora de inicio debe ser anterior a la hora de finalización.");
        return;
    }

    try {
        await addDoc(collection(db, "solicitudes"), {
            name,
            activity,
            description,
            date,
            startTime,
            endTime,
            place,
            guests,
            state: "Pendiente",
            email,
            registerDate: new Date().toISOString()
        });

        Swal.fire('¡Enviado!', 'Tu solictud fue enviada correctamente.', 'success');
        form.reset();
    } catch (error) {
        console.error("Error al guardar", error);
        Swal.fire('Error', 'Hubo un problema al enviar tu solicitud. Inténtalo de nuevo más tarde.', 'error');
    }
});