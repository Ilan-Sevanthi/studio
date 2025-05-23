// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeyQbkYwrsxoqWbjsjEK3-nGmvHq699ls",
  authDomain: "aiform-8b348.firebaseapp.com",
  projectId: "aiform-8b348",
  storageBucket: "aiform-8b348.firebasestorage.app",
  messagingSenderId: "228159658670",
  appId: "1:228159658670:web:5044745a5d01b79bb5ab3f",
  measurementId: "G-MHXEHY0150" // For Firebase JS SDK v7.20.0 and later, measurementId is optional
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);

export { app, auth };
