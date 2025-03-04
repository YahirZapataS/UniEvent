// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDJUeEGu9Ipbs7M_VKq4CKRagoZWDVa2Ek",
  authDomain: "unieventuv.firebaseapp.com",
  projectId: "unieventuv",
  storageBucket: "unieventuv.firebasestorage.app",
  messagingSenderId: "333862331535",
  appId: "1:333862331535:web:705b40476576ff0ec2bcfa",
  measurementId: "G-P8D4TN1J9Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export {db, auth};