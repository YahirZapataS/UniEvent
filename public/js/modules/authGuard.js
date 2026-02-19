/**
 * js/modules/authGuard.js
 */
import { auth } from '../services/firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const protectRoute = () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Si no hay usuario, redirige al login inmediatamente
            window.location.href = 'login.html';
        }
    });
};