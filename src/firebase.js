import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCyIvNjp8JzKW3B9EL7RRjKpmxoFQc9rBI",
  authDomain: "ezee-vision-classes.firebaseapp.com",
  projectId: "ezee-vision-classes",
  storageBucket: "ezee-vision-classes.firebasestorage.app",
  messagingSenderId: "14015608243",
  appId: "1:14015608243:web:77de1677c3ab035fabc7c6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
