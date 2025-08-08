// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzocY565-_J6pzE7IUxbFgT9kt0THauKY",
  authDomain: "course-maker-app.firebaseapp.com",
  projectId: "course-maker-app",
  storageBucket: "course-maker-app.firebasestorage.app",
  messagingSenderId: "988080832199",
  appId: "1:988080832199:web:4486eb83573b28acf208e2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Set persistence to LOCAL (survives browser restarts)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
