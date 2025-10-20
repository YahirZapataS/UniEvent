import { auth } from './firebaseConfig.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

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
        
        // Redirige después de que el SweetAlert se haya cerrado
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
});