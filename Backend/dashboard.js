import { db } from "./firebaseConfig.js";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
    const contentArea = document.getElementById("content-area");
    const upcomingBtn = document.getElementById("view-upcoming");
    const completedBtn = document.getElementById("view-completed");
    const requestsBtn = document.getElementById("view-requests");

    upcomingBtn.addEventListener("click", () => loadEvents("upcoming"));
    completedBtn.addEventListener("click", () => loadEvents("completed"));
    requestsBtn.addEventListener("click", () => loadRequests());

    async function loadRequests() {
        contentArea.innerHTML = "<h3>Pending Requests</h3>";
        const querySnapshot = await getDocs(collection(db, "requests"));
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const requestItem = document.createElement("div");
            requestItem.innerHTML = `
                <p><strong>${data.activity}</strong> by ${data.name}</p>
                <p>${data.description}</p>
                <p>On ${data.date} at ${data.time} in ${data.space}</p>
                <button onclick="approveRequest('${doc.id}')">Approve</button>
                <button onclick="rejectRequest('${doc.id}')">Reject</button>
            `;
            contentArea.appendChild(requestItem);
        });
    }

    window.approveRequest = async (id) => {
        await updateDoc(doc(db, "requests", id), { status: "approved" });
        Swal.fire("Success", "Request Approved", "success");
        loadRequests();
    };

    window.rejectRequest = async (id) => {
        await deleteDoc(doc(db, "requests", id));
        Swal.fire("Success", "Request Rejected", "error");
        loadRequests();
    };
});
