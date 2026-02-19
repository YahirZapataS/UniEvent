import { db } from './services/firebaseConfig.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { protectRoute } from './modules/authGuard.js';

protectRoute();

const ADMIN_CONFIG_ID = 'adminSettings';
const configForm = document.getElementById('configForm');

async function loadConfiguration() { 
    try {
        const docRef = doc(db, 'config', ADMIN_CONFIG_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.ADMIN_EMAIL) document.getElementById('adminEmail').value = data.ADMIN_EMAIL;
            if (data.REMINDER_TIME) document.getElementById('reminderTime').value = data.REMINDER_TIME;
        }
    } catch (error) {
        console.error("Error al cargar configuración:", error);
    }
}

configForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newEmail = document.getElementById('adminEmail').value.trim();
    const newReminderTime = document.getElementById('reminderTime').value;

    try {
        await setDoc(doc(db, 'config', ADMIN_CONFIG_ID), {
            ADMIN_EMAIL: newEmail,
            REMINDER_TIME: newReminderTime,
            lastUpdated: new Date()
        }, { merge: true });

        Swal.fire('Guardado', 'Configuración actualizada correctamente.', 'success');
    } catch (error) {
        Swal.fire('Error', 'No se pudo guardar la configuración.', 'error');
    }
});

loadConfiguration();