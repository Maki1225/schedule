import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAlz587VDFEOjuyF1WMz-tOsajrE8M3HBg",
  authDomain: "study-planner-8897f.firebaseapp.com",
  projectId: "study-planner-8897f",
  storageBucket: "study-planner-8897f.firebasestorage.app",
  messagingSenderId: "726208407281",
  appId: "1:726208407281:web:23c87b91b8e2f8db8aeb50",
  measurementId: "G-QPM1H3Z362"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginPromise = signInAnonymously(auth);

loginPromise.catch((error) => {
  console.error("匿名ログインに失敗しました:", error);
});

export { app, auth, db, loginPromise };