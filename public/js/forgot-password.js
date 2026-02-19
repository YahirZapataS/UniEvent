import { auth } from './firebaseConfig.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const forgotForm = document.getElementById('forgotForm');

forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('forgotEmail').value.trim();

    Swal.fire({
        title: 'Procesando...',
        text: 'Estamos enviando el enlace a tu correo',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        await sendPasswordResetEmail(auth, email);
        await Swal.fire({
            icon: 'success',
            title: '¡Correo enviado!',
            text: 'Revisa tu bandeja de entrada (y la carpeta de spam) para restablecer tu contraseña.',
            confirmButtonColor: '#2563eb'
        });

        window.location.href = 'login.html';

    } catch (error) {
        console.error("Error Firebase:", error.code);
        let message = 'No se pudo enviar el correo de recuperación.';

        if (error.code === 'auth/user-not-found') {
            message = 'No hay ninguna cuenta registrada con este correo.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'El formato del correo no es válido.';
        }

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonColor: '#ef4444'
        });
    }
});