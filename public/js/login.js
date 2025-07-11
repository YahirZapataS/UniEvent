
import { auth } from './firebaseConfig.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        showAlert('Error', 'Completa los campos solicitados para iniciar sesión', 'warning');
    }

    try {
        const credentials = await signInWithEmailAndPassword(auth, email, password);
        const user = credentials.user;

        Swal.fire ({
            icon: 'success',
            title: 'Bienvenido',
            text: 'Acceso concedido',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            window.location.href = "dashboard.html";
        })
    } catch (error) {
        console.error("Error de login: ", error);
        let message = 'Correo o constraseña incorrectos';
        if (error.code === "auth/user-not-found") message = "Usuario no registrado.";
        if (error.code === "auth/wrong-password") message = "Contraseña incorrecta";
        Swal.fire ("Error", message, "error");
    }
});