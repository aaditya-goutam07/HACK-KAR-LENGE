// Shared Firebase setup — imported by both script.js (donor page) and ngo.js (NGO page)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD99qHU_CK_VdhxUaDz2OjvlT1ybb8zweE",
  authDomain: "surplus-to-shelter-719fc.firebaseapp.com",
  projectId: "surplus-to-shelter-719fc",
  storageBucket: "surplus-to-shelter-719fc.firebasestorage.app",
  messagingSenderId: "886951387067",
  appId: "1:886951387067:web:fcd4f17f07979331f1ae9e",
  measurementId: "G-V42R2TG83Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query
};
