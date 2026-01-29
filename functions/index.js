const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer'); // Importar Nodemailer

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
    timeZone: 'America/Mexico_City'
}, async (event) => {
    
    // Configuración del transporte de Nodemailer con Gmail
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'soporteunievent@gmail.com', // Tu correo personal
            pass: process.env.GMAIL_PASSWORD
        }
    });

    console.log("Iniciando chequeo de recordatorios (Nodemailer)...");

    const configSnap = await db.collection('config').doc(ADMIN_CONFIG_ID).get();
    if (!configSnap.exists) return null;

    const { ADMIN_EMAIL, REMINDER_TIME } = configSnap.data();
    if (REMINDER_TIME === 'none' || !ADMIN_EMAIL) return null;

    const reminderTimeMs = calculateTimeDifference(REMINDER_TIME);
    const now = new Date().getTime();

    const snapshot = await db.collection('solicitudes')
        .where("state", "==", "Aceptada")
        .where("reminderSent", "!=", true)
        .get();

    const updatePromises = [];

    for (const docSnap of snapshot.docs) {
        const eventData = docSnap.data();
        
        // Lógica de tiempo original
        const [year, month, day] = eventData.date.split('-').map(Number);
        const [hour, minute] = eventData.startTime.split(':').map(Number);
        const eventStartTime = Date.UTC(year, month - 1, day, hour + 6, minute);

        const isDue = (eventStartTime > (now - 60000)) && (eventStartTime <= (now + reminderTimeMs + 5000));

        if (isDue) {
            try {
                // Envío de correo con Nodemailer
                await transporter.sendMail({
                    from: '"UniEvent Notificaciones" <TU_CORREO_GMAIL@gmail.com>',
                    to: eventData.email, // Correo institucional del solicitante (@uv.mx)
                    subject: `🚨 RECORDATORIO: "${eventData.activityName}" inicia pronto`,
                    html: `
                        <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px;">
                            <h2 style="color: #2563eb;">Recordatorio de Evento</h2>
                            <p>Hola <b>${eventData.name}</b>,</p>
                            <p>Este es un aviso automático: tu evento en el <b>${eventData.place}</b> comenzará pronto.</p>
                            <p><b>Actividad:</b> ${eventData.activityName}</p>
                            <p><b>Horario:</b> ${eventData.startTime} - ${eventData.endTime}</p>
                            <br>
                            <p style="font-size: 0.8rem; color: #64748b;">Aviso enviado ${REMINDER_TIME} antes del inicio.</p>
                        </div>
                    `
                });

                console.log(`Correo enviado exitosamente a: ${eventData.email}`);

                updatePromises.push(
                    db.collection('solicitudes').doc(docSnap.id).update({
                        reminderSent: true,
                        reminderSentAt: admin.firestore.Timestamp.now()
                    })
                );
            } catch (error) {
                console.error('Error al enviar con Nodemailer:', error);
            }
        }
    }

    await Promise.all(updatePromises);
    return null;
});