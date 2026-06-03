// ============================================================
// LUMINA GAME - FIREBASE CONFIG
// ============================================================
// SETUP:
// 1. https://console.firebase.google.com → buat project
// 2. Add Web App → salin config di bawah
// 3. Authentication → aktifkan Email/Password + Google
// 4. Realtime Database → create (test mode)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCj3eBDgewhWP0LgzkOQ2DoG94zuJLs2WM",
  authDomain: "lumina-game-541a4.firebaseapp.com",
  databaseURL: "https://console.firebase.google.com/u/3/project/lumina-game-541a4/database/lumina-game-541a4-default-rtdb/data/~2F",
  projectId: "lumina-game-541a4",
  storageBucket: "lumina-game-541a4.firebasestorage.app",
  messagingSenderId: "901334223836",
  appId: "1:901334223836:web:8a1259ce8048bf4f415d19"
};

try {
  firebase.initializeApp(firebaseConfig);
  window._fbOK = true;
} catch(e) {
  window._fbOK = false;
  console.warn('Firebase not configured — offline mode only');
}

const auth = window._fbOK ? firebase.auth() : null;
const db   = window._fbOK ? firebase.database() : null;
