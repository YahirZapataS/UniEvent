/**
 * js/modules/authGuard.js
 */
import { auth } from '../services/firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const protectRoute = () => {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                resolve(user);
            }
        });
    });
};