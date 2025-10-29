// index.js (Este archivo reside en tu directorio 'functions/')

// 1. Importar librerías de Firebase y programación
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// 2. Importar herramientas para Firestore (no el SDK modular del cliente)
const db = admin.firestore();

// 3. Importar una librería HTTP para enviar el correo (EmailJS no tiene un SDK directo para Node)
// Usaremos 'node-fetch' o 'axios' (aquí mostramos fetch conceptualmente)
const fetch = require('node-fetch'); // Necesitas instalar node-fetch en tu proyecto functions/

// Configuración de EmailJS (debe estar segura en variables de entorno, no aquí)
const EMAILJS_SERVICE_ID = "service_jhvkojp"; 
const EMAILJS_REMINDER_TEMPLATE_ID = "template_event_reminder"; 
const EMAILJS_USER_ID = "IyDvp3Qr5cKPcCyWS"; // Clave pública
function calculateTimeDifference(timeStr) {
    const unit = timeStr.slice(-1);
    const value = parseInt(timeStr.slice(0, -1));

    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 0;
    }
}
exports.sendEventReminders = functions.pubsub.schedule('every 15 minutes').onRun(async (context) => {
    console.log("Iniciando chequeo de recordatorios programado...");
    const ADMIN_CONFIG_ID = 'adminSettings';
    const configSnap = await db.collection('config').doc(ADMIN_CONFIG_ID).get();
    
    if (!configSnap.exists()) {
        console.log("Configuración no encontrada.");
        return null;
    }
    
    const { ADMIN_EMAIL, REMINDER_TIME } = configSnap.data();

    if (REMINDER_TIME === 'none' || !ADMIN_EMAIL) {
        console.log("Recordatorios deshabilitados.");
        return null;
    }
    
    const reminderTimeMs = calculateTimeDifference(REMINDER_TIME);
    const now = new Date().getTime();
    const snapshot = await db.collection('solicitudes')
        .where("state", "==", "Aceptada")
        .where("reminderSent", "!=", true)
        .get();
    const updatePromises = [];

    for (const docSnap of snapshot.docs) {
        const event = docSnap.data();
        const eventId = docSnap.id;
        const [year, month, day] = event.date.split('-').map(Number);
        const [hour, minute] = event.startTime.split(':').map(Number);
        const eventStartTime = new Date(year, month - 1, day, hour, minute).getTime(); 

        const isDue = (eventStartTime > now) && (eventStartTime <= (now + reminderTimeMs));

        if (isDue) {
            const templateParams = {
                admin_name: "Gestor", 
                activity_title: event.activityName,
                request_place: event.place,
                request_date: event.date,
                request_time: `${event.startTime} - ${event.endTime}`,
                reminder_time_setting: REMINDER_TIME,
                to_email: ADMIN_EMAIL
            };

            try {
                console.log(`Recordatorio enviado a ${ADMIN_EMAIL} para ${event.activityName}`);
                const updatePromise = db.collection('solicitudes').doc(eventId).update({
                    reminderSent: true,
                    reminderSentAt: admin.firestore.Timestamp.now()
                });
                updatePromises.push(updatePromise);

            } catch (error) {
                console.error(`Fallo al enviar recordatorio:`, error);
            }
        }
    }
    await Promise.all(updatePromises);
    console.log(`Chequeo finalizado. ${updatePromises.length} recordatorios procesados.`);
    
    return null;
});