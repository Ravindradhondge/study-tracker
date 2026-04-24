import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDBz2ncf5DNW1ACCq3Qg5y8Uezkpl5M9mc",
  authDomain: "study-tracker-958e7.firebaseapp.com",
  projectId: "study-tracker-958e7",
  storageBucket: "study-tracker-958e7.firebasestorage.app",
  messagingSenderId: "478170636891",
  appId: "1:478170636891:web:73ba7cbf7e3a027f28957e",
  measurementId: "G-YMP1C2DXV6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
