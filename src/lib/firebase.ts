// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUES39H8RLcGXKw0FTOpczvjUpptrDaRI",
  authDomain: "feedback-flow-d3nju.firebaseapp.com||studio-hazel-pi.vercel.app",
  projectId: "feedback-flow-d3nju",
  storageBucket: "feedback-flow-d3nju.firebasestorage.app",
  messagingSenderId: "1086736095911",
  appId: "1:1086736095911:web:0f7478ee93af05eecd5982"
  // measurementId is optional
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
