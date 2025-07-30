// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "meditrack-lite-rdj1n",
  "appId": "1:263212526728:web:56474e6a7c4d14696b833d",
  "storageBucket": "meditrack-lite-rdj1n.firebasestorage.app",
  "apiKey": "AIzaSyDvwenwrwNbJTY50Txqns0wZ0IAPk9omE4",
  "authDomain": "meditrack-lite-rdj1n.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "263212526728"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
