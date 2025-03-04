import { auth, db } from "../Backend/firebaseConfig.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
    const loginBtn = document.getElementById("login-btn");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    if (loginBtn) {
        loginBtn.addEventListener("click", async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                Swal.fire("Error", "Please fill in all fields", "error");
                return;
            }

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().role === "gestor") {
                    Swal.fire("Success", "Login successful!", "success").then(() => {
                        window.location.href = "dashboard.html";
                    });
                } else {
                    Swal.fire("Error", "You are not authorized to access this page.", "error");
                    await signOut(auth);
                }
            } catch (error) {
                Swal.fire("Error", error.message, "error");
            }
        });
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === "gestor") {
                window.location.href = "dashboard.html";
            } else {
                await signOut(auth);
            }
        }
    });
});
