// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAbZdwZksF0YrC_vqE05PApqq5Q5FCkNoM",
  authDomain: "unievent-fca.firebaseapp.com",
  projectId: "unievent-fca",
  storageBucket: "unievent-fca.firebasestorage.app",
  messagingSenderId: "839685271825",
  appId: "1:839685271825:web:e349c32f7918d889595cb0",
  measurementId: "G-XW13Z1LDEH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };