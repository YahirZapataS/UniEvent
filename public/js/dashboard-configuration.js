import { db, auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_CONFIG_ID = 'adminSettings';
const configForm = document.getElementById('configForm');
const adminEmailInput = document.getElementById('adminEmail');
const reminderTimeSelect = document.getElementById('reminderTime');
const btnClose = document.getElementById('cerrarSesion');

btnClose.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error("Error al cerrar sesión:", error);
        Swal.fire("Error", "No se pudo cerrar la sesión.", "error");
    });
});

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        loadConfiguration();
    }
});

async function loadConfiguration() { 
    try {
        const docRef = doc(db, 'config', ADMIN_CONFIG_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            if (data.ADMIN_EMAIL) {
                adminEmailInput.value = data.ADMIN_EMAIL;
            }

            if (data.REMINDER_TIME) {
                reminderTimeSelect.value = data.REMINDER_TIME;
            }

        } else {
            console.log("No existe un documento de configuración inicial.");
        }
    } catch (error) {
        console.error("Error al cargar la configuración:", error);
        Swal.fire('Error de Carga', 'No se pudo obtener la configuración desde la base de datos.', 'error');
    }
}

configForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newEmail = adminEmailInput.value.trim();
    const newReminderTime = reminderTimeSelect.value;

    if (!newEmail) {
        Swal.fire('Atención', 'El campo de correo no puede estar vacío.', 'warning');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        Swal.fire('Atención', 'Por favor, ingresa un formato de correo electrónico válido.', 'warning');
        return;
    }

    try {
        const docRef = doc(db, 'config', ADMIN_CONFIG_ID);
        await setDoc(docRef, {
            ADMIN_EMAIL: newEmail,
            REMINDER_TIME: newReminderTime,
            lastUpdated: new Date()
        }, { merge: true });

        Swal.fire('Guardado', 'La configuración ha sido actualizada correctamente.', 'success');

    } catch (error) {
        console.error("Error al guardar la configuración:", error);
        Swal.fire('Error al Guardar', 'Hubo un problema al actualizar la configuración.', 'error');
    }
});