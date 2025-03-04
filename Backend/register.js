import { auth, db} from "./firebaseConfig.js";
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('register-form');
    const passwordInput = document.getElementById('reg-password');
    const confirmPasswordInput = document.getElementById('confirm-reg-password');
    const showPassword = document.getElementById('showPassword');
    const btnBack = document.getElementById('btn-back');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = form["reg-email"].value.trim();
            const password = passwordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();

            if (!email || !password || !confirmPassword) {
                showAlert('Error', 'Please fill in all fields', 'error');
                return;
            }

            if (password.length < 6) {
                showAlert('Ups', 'Password must be at least 6 characters long.', 'warning');
                return;
            }

            if (password !== confirmPassword) {
                showAlert('Error', 'Passwords do not match', 'error');
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await setDoc(doc(db, "users", user.uid), {
                    email: user.email,
                    role: "gestor"
                });

                await sendEmailVerification(user);

                form.reset();
                showAlertWithRedirect('Success', 'Gestor registered successfully! Verify your email before loggin in.', 'success');
            } catch (error) {
                console.error(error);
                showAlert('Error', error.message, 'error');
            }
        });

        showPassword.addEventListener('change', function () {
            passwordInput.type = this.checked ? 'text' : 'password';
            confirmPasswordInput.type = this.checked ? 'text' : 'password';
        });

        btnBack.addEventListener('click', async () => {
            window.location.replace('index.html');
        });
    } else {
        console.error('The registration form was not found in the DOM');
    }
})


function showAlert(title, text, icon) {
    Swal.fire({
        title: title,
        text: text,
        icon: icon
    });
}

function showAlertWithRedirect(title, text, icon) {
    Swal.fire({
        title: title,
        text: text,
        icon: icon,
        confirmButtonText: 'OK'
    }).then((result) => {
        if(result.isConfirmed) {
            window.location.href = 'login.html';
        }
    });
}