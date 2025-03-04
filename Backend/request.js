import { db } from "./firebaseConfig.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("request-form");
    
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const degree = form["degree"].value.trim();
            const name = form["name"].value.trim();
            const activity = form["activity"].value.trim();
            const description = form["description"].value.trim();
            const date = form["date"].value;
            const space = form["space"].value;
            const time = form["time"].value;
            const responsible = form["responsible"].value.trim();

            if (!degree || !name || !activity || !description || !date || !space || !time || !responsible) {
                Swal.fire("Error", "Please fill in all fields", "error");
                return;
            }

            try {
                await addDoc(collection(db, "requests"), {
                    degree,
                    name,
                    activity,
                    description,
                    date,
                    space,
                    time,
                    responsible,
                    status: "pending",
                    createdAt: new Date()
                });

                Swal.fire("Success", "Request submitted successfully!", "success").then(() => {
                    form.reset();
                });
            } catch (error) {
                console.error("Error submitting request:", error);
                Swal.fire("Error", "Failed to submit request", "error");
            }
        });
    }
});