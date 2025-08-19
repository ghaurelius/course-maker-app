// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
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

// Force cloud connection (disable any emulator auto-detection)
if (process.env.NODE_ENV === 'production' || !process.env.REACT_APP_USE_EMULATOR) {
  console.log('🌐 Forcing cloud Firestore connection...');
}
export const storage = getStorage(app);

// Debug: Test database connection
console.log('🔍 Firebase Configuration:');
console.log('Project ID:', app.options.projectId);
console.log('Auth Domain:', app.options.authDomain);
console.log('Database initialized:', !!db);

// Import moved to top
const testConnection = async () => {
  try {
    console.log('🧪 Testing Firestore connection...');
    const testQuery = query(collection(db, "courses"), limit(1));
    const snapshot = await getDocs(testQuery);
    console.log('✅ Firestore connection successful');
    console.log('📊 Found', snapshot.size, 'documents in courses collection');
  } catch (error) {
    console.error('❌ Firestore connection failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
};

// Run test after a short delay
setTimeout(testConnection, 2000);

export default app;
