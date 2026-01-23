const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore } = require('firebase-admin/firestore');
const sgMail = require('@sendgrid/mail'); // Importar SendGrid

admin.initializeApp();


const DB_ID_TARGET = 'unieventbd';
const db = getFirestore(admin.app(), DB_ID_TARGET);
const ADMIN_CONFIG_ID = 'adminSettings';

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



exports.sendEventReminders = onSchedule({
    schedule: 'every 1 minutes',
    timeoutSeconds: 300,
    memory: '256MiB',
    timeZone: 'America/Mexico_City'
}, async (context) => {


    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    if (!SENDGRID_API_KEY) {
        console.error("Error fatal: La clave API de SendGrid (SENDGRID_API_KEY) no está configurada en Google Cloud Run.");
        return null;
    }
    sgMail.setApiKey(SENDGRID_API_KEY);


    console.log("Iniciando chequeo de recordatorios programado (usando SendGrid)...");


    const configSnap = await db.collection('config').doc(ADMIN_CONFIG_ID).get();
    if (!configSnap.exists) {
        console.log("Configuración no encontrada. Finalizando.");
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


        const dateStr = event.date;
        const timeStr = event.startTime;
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        const TIMEZONE_OFFSET_HOURS = 6;
        const eventStartTime = Date.UTC(year, month - 1, day, hour + TIMEZONE_OFFSET_HOURS, minute);
        const WINDOW_TOLERANCE_MS = 60000;
        const WINDOW_END_MS = 5000;
        const windowStart = now - WINDOW_TOLERANCE_MS;
        const windowEnd = now + reminderTimeMs + WINDOW_END_MS;
        const isDue = (eventStartTime > windowStart) && (eventStartTime <= windowEnd);

        if (isDue) {
            const msg = {
                to: ADMIN_EMAIL,
                from: 'kroblero@uv.mx',
                subject: `🚨 RECORDATORIO: El evento "${event.activityName}" inicia pronto`,
                html: `
                    <p>Estimada Lic. Karla D. Roblero,</p>
                    <p>Este es un recordatorio automático de UniEvent. Tienes un evento aprobado que comenzará pronto.</p>
                    <p><b>Actividad:</b> ${event.activityName}</p>
                    <p><b>Lugar:</b> ${event.place}</p>
                    <p><b>Fecha:</b> ${event.date}</p>
                    <p><b>Hora:</b> ${event.startTime} - ${event.endTime}</p>
                    <p><i>(Recordatorio configurado para ${REMINDER_TIME} antes)</i></p>
                `
            };

            try {

                await sgMail.send(msg);

                console.log(`Éxito: Recordatorio enviado para ${event.activityName}`);

                const updatePromise = db.collection('solicitudes').doc(eventId).update({
                    reminderSent: true,
                    reminderSentAt: admin.firestore.Timestamp.now()
                });
                updatePromises.push(updatePromise);

            } catch (error) {

                if (error.response) {
                    console.error('Error de SendGrid:', error.response.body);
                } else {
                    console.error('Error al enviar con SendGrid:', error);
                }
            }
        }
    }

    await Promise.all(updatePromises);
    console.log(`Chequeo finalizado. ${updatePromises.length} recordatorios procesados.`);
    return null;
});
