// Firebase configuration for AIDA+ - optimized for Vercel deployment
// Make sure these values match your Firebase Console settings

const firebaseConfig = {
  apiKey: "AIzaSyCaiVAicNbhgD1IDNP2ILTgRegPkBi37p0",
  authDomain: "aida-plus.firebaseapp.com",
  databaseURL: "https://aida-plus-default-rtdb.firebaseio.com",
  projectId: "aida-plus",
  storageBucket: "aida-plus.firebasestorage.app",
  messagingSenderId: "1059580807394",
  appId: "1:1059580807394:web:d0c4da6f59c21f9677b6bb",
  measurementId: "G-9ZNY3PS2BF"
};

// Initialize Firebase in a way that works both locally and on Vercel
let app;
let auth;
let database;

try {
  // Check if already initialized to prevent re-initialization errors on client-side navigation
  if (!app || !app.options || app.options.projectId !== "aida-plus") {
    app = firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  database = firebase.database();
} catch (error) {
  // Firebase initialization failed - likely running in environment without full Firebase SDK
  console.warn("Firebase initialization issue:", error.message);
  // Continue with reduced functionality - client-side data only
  app = null;
  auth = null;
  database = null;
}

// Export for use in app.js
export { app, auth, database, firebaseConfig };