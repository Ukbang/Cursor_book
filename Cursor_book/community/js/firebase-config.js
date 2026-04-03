import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCK8XGKQP4YHDC0wLom1eqoabX9J0Yw3MI",
  authDomain: "community-test-69029.firebaseapp.com",
  projectId: "community-test-69029",
  storageBucket: "community-test-69029.firebasestorage.app",
  messagingSenderId: "699362065115",
  appId: "1:699362065115:web:4c006d7e401e78ece06afe",
  measurementId: "G-4SE01FJ523"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const GEMINI_API_KEY = "AIzaSyBRwUQGjaldsJfOjI9BapaftvpzCmmwGKk";
export const GEMINI_MODEL = "gemini-2.0-flash";
