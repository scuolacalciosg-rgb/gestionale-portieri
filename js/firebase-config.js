// ============================================
// CONFIGURAZIONE FIREBASE - Gestionale Portieri
// (stesso progetto Firebase del gestionale principale)
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDU40ZfoWie-mklcZG7nuZpfuTpXLQzX64",
  authDomain: "gestionale--squadra.firebaseapp.com",
  databaseURL: "https://gestionale--squadra-default-rtdb.firebaseio.com",
  projectId: "gestionale--squadra",
  storageBucket: "gestionale--squadra.firebasestorage.app",
  messagingSenderId: "977965672739",
  appId: "1:977965672739:web:0b788eabacc4b4fc4ec496"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export {
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  ref,
  get,
  set,
  push,
  update,
  remove,
  onValue
};
