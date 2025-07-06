// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlBR1onO_vwM9WGZALJFnm4OOUZzi75Vc",
  authDomain: "inters-ims.firebaseapp.com",
  projectId: "inters-ims",
  storageBucket: "inters-ims.firebasestorage.app",
  messagingSenderId: "836606242598",
  appId: "1:836606242598:web:035a2cb35885a8693c1be7",
  measurementId: "G-F2V25H0CNH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
