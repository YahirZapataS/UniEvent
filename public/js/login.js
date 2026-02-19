import { auth } from './firebaseConfig.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const forgotPasswordLink = document.getElementById('forgotPassword');

    if (!email || !password) {
        Swal.fire('Error', 'Completa los campos solicitados para iniciar sesión', 'warning');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);

        Swal.fire({
            icon: 'success',
            title: 'Bienvenido',
            text: 'Acceso concedido',
            timer: 1500,
            showConfirmButton: false
        });

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1500);

    } catch (error) {
        let message = 'Correo o contraseña incorrectos';
        switch (error.code) {
            case "auth/user-not-found":
                message = "Usuario no registrado.";
                break;
            case "auth/wrong-password":
                message = "Contraseña incorrecta.";
                break;
            case "auth/invalid-email":
                message = "El formato del correo electrónico no es válido.";
                break;
            default:
                break;
        }
        Swal.fire("Error", message, "error");
    }

    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();

        const { value: email } = await Swal.fire({
            title: 'Recuperar contraseña',
            input: 'email',
            inputLabel: 'Ingresa tu correo institucional',
            inputPlaceholder: 'usuario@uv.mx',
            showCancelButton: true,
            confirmButtonText: 'Enviar enlace',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563eb',
            inputValidator: (value) => {
                if (!value) {
                    return '¡Es necesario escribir un correo!';
                }
            }
        });

        if (email) {
            Swal.fire({
                title: 'Procesando...',
                didOpen: () => Swal.showLoading(),
                allowOutsideClick: false
            });

            try {
                await sendPasswordResetEmail(auth, email);

                Swal.fire({
                    icon: 'success',
                    title: 'Correo enviado',
                    text: 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
                    confirmButtonColor: '#2563eb'
                });
            } catch (error) {
                console.error("Error al enviar correo de recuperación:", error);
                let message = 'No se pudo enviar el correo de recuperación.';

                if (error.code === 'auth/user-not-found') {
                    message = 'No existe un usuario registrado con este correo.';
                }

                Swal.fire('Error', message, 'error');
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.querySelector('#togglePassword');
    const passwordInput = document.querySelector('#password');
    const eyeIcon = document.querySelector('#eyeIcon');
    const eyeClosedPath = `
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.822 7.822L21 21m-2.278-2.278L15.071 15.07M12 12a3 3 0 01-3.65-3.65m0 0a3 3 0 014.682 4.682l-1.032 1.032" />
    `;

    const eyeOpenPath = `
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.177z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    `;

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            eyeIcon.innerHTML = isPassword ? eyeClosedPath : eyeOpenPath;
            togglePassword.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        });
    }
});