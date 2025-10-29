import { db, auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_CONFIG_ID = 'adminSettings';
const configForm = document.getElementById('configForm');
const adminEmailInput = document.getElementById('adminEmail');
const reminderTimeSelect = document.getElementById('reminderTime');
const btnClose = document.getElementById('cerrarSesion');
const EMAILJS_SERVICE_ID = "service_e8bgyqn";
const EMAILJS_REMINDER_TEMPLATE_ID = "template_c1uzkv5";
const EMAILJS_USER_ID = "CkHE0zIQ_YRZsjKjU";

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

function calculateTimeDifference(timeStr) {
    // ... (La función de utilidad se mantiene aquí para calcular ms) ...
    const unit = timeStr.slice(-1);
    const value = parseInt(timeStr.slice(0, -1));

    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 0;
    }
}

/**
 * Función principal para monitorear eventos y enviar recordatorios.
 */
async function monitorAndSendReminders(dbInstance) {
    console.log("Iniciando chequeo de recordatorios...");

    // 1. Obtener la configuración (ADMIN_EMAIL y REMINDER_TIME)
    const ADMIN_CONFIG_ID = 'adminSettings';
    const configDocRef = dbInstance.collection('config').doc(ADMIN_CONFIG_ID);
    const configSnap = await configDocRef.get();

    if (!configSnap.exists()) return;

    const { ADMIN_EMAIL, REMINDER_TIME } = configSnap.data();

    if (REMINDER_TIME === 'none' || !ADMIN_EMAIL) return;

    // 2. Calcular la ventana de tiempo
    const reminderTimeMs = calculateTimeDifference(REMINDER_TIME);
    const now = new Date().getTime();

    // 3. Consultar eventos aceptados
    const snapshot = await dbInstance.collection('solicitudes')
        .where("state", "==", "Aceptada")
        // Se puede añadir un filtro por un campo 'reminderSent' para no enviar dos veces
        .get();

    // 4. Filtrar y Enviar (Ejecución de recordatorio)
    const remindersSent = [];

    snapshot.forEach(docSnap => {
        const event = docSnap.data();

        // La conversión de fecha debe ser robusta
        const [year, month, day] = event.date.split('-').map(Number);
        const [hour, minute] = event.startTime.split(':').map(Number);
        const eventStartTime = new Date(year, month - 1, day, hour, minute).getTime();

        // Ventana: El evento inicia entre (Ahora) y (Ahora + Tiempo configurado)
        const isDue = (eventStartTime > now) && (eventStartTime <= (now + reminderTimeMs));

        if (isDue) {
            // Datos para la plantilla de EmailJS
            const templateParams = {
                admin_name: "Gestor",
                activity_title: event.activityName,
                request_place: event.place,
                request_date: event.date,
                request_time: event.startTime,
                reminder_time_setting: REMINDER_TIME,
                to_email: ADMIN_EMAIL // El correo dinámico del administrador
            };

            // ⚠️ En un servidor, usarías fetch/axios para el endpoint de EmailJS
            // Este es un ejemplo conceptual de CÓMO se enviaría el HTTP POST:
            /*
            await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: EMAILJS_SERVICE_ID,
                    template_id: EMAILJS_REMINDER_TEMPLATE_ID,
                    user_id: EMAILJS_USER_ID,
                    template_params: templateParams
                })
            });
            */

            console.log(`Recordatorio enviado (Simulado) para: ${event.activityName}`);
            remindersSent.push(docSnap.id);
        }
    });

    console.log(`Chequeo completado. ${remindersSent.length} recordatorios listos para enviar.`);
}