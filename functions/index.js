const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');

admin.initializeApp();

const db = getFirestore(admin.app(), 'unieventbd');
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
    timeZone: 'America/Mexico_City',
    secrets: ['GMAIL_PASSWORD']
}, async (event) => {
    // 1. Declaración ÚNICA de la variable de tiempo
    const now = new Date();
    const nowTimestamp = now.getTime();

    // Logs para comparar horarios (Aparecerán en tu consola de Google Cloud)
    console.log("Hora Servidor (ISO):", now.toISOString());
    const cdmxTime = now.toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    console.log("Hora CDMX calculada:", cdmxTime);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'soporteunievent@gmail.com',
            pass: process.env.GMAIL_PASSWORD
        }
    });

    const configSnap = await db.collection('config').doc(ADMIN_CONFIG_ID).get();
    if (!configSnap.exists) return null;

    const { ADMIN_EMAIL, REMINDER_TIME } = configSnap.data(); // Extrae de adminSettings
    if (REMINDER_TIME === 'none' || !ADMIN_EMAIL) return null;

    const reminderTimeMs = calculateTimeDifference(REMINDER_TIME);

    const snapshot = await db.collection('solicitudes')
        .where("state", "==", "Aceptada")
        .where("reminderSent", "!=", true)
        .get();

    const updatePromises = [];

    for (const docSnap of snapshot.docs) {
        const eventData = docSnap.data();

        if (typeof eventData.date !== 'string' || typeof eventData.startTime !== 'string') continue;

        try {
            const [year, month, day] = eventData.date.split('-').map(Number);
            const [hour, minute] = eventData.startTime.split(':').map(Number);

            // Mantenemos tu ajuste de +6 horas para sincronizar con CDMX
            const eventStartTime = Date.UTC(year, month - 1, day, hour + 6, minute);

            const windowStart = nowTimestamp - 60000;
            const windowEnd = nowTimestamp + reminderTimeMs + 5000;
            const isDue = (eventStartTime > windowStart) && (eventStartTime <= windowEnd);

            if (isDue) {
                await transporter.sendMail({
                    from: '"UniEvent Sistema" <soporteunievent@gmail.com>',
                    to: ADMIN_EMAIL, // Envío al correo del Admin configurado
                    subject: `🚨 RECORDATORIO: "${eventData.activityName}" inicia pronto`,
                    html: `
                        <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px;">
                            <h2 style="color: #ef4444;">Aviso de Inicio de Evento</h2>
                            <p>Estimada Lic. Karla D.,</p>
                            <p>El evento <b>${eventData.activityName}</b> está por iniciar.</p>
                            <hr>
                            <p><b>Lugar:</b> ${eventData.place}</p>
                            <p><b>Horario:</b> ${eventData.startTime} - ${eventData.endTime}</p>
                            <p><b>Responsable:</b> ${eventData.name}</p>

                            <p>Equipo UniEvent</p>
                        </div>
                    `
                });

                updatePromises.push(
                    docSnap.ref.update({
                        reminderSent: true,
                        reminderSentAt: admin.firestore.Timestamp.now()
                    })
                );
            }
        } catch (err) {
            console.error("Error procesando doc:", docSnap.id, err);
        }
    }

    await Promise.all(updatePromises);
    return null;
});