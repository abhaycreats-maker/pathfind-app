// auth.js — Firebase Authentication + Firestore (save results, delete, feedback) logic
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let app, auth, db;
let firebaseReady = false;

try {
  // If the user hasn't filled in firebase-config.js yet, this will still "work"
  // but auth calls will fail with a clear error — checked in initAuth().
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseReady = true;
} catch (e) {
  console.error("Firebase failed to initialize. Did you fill in firebase-config.js?", e);
}

let currentUser = null;

export function initAuth(onUserChange) {
  if (!firebaseReady) return;
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    onUserChange(user);
  });
}

export function getCurrentUser() {
  return currentUser;
}

export async function signUp(email, password) {
  if (!firebaseReady) throw new Error("Firebase not configured. Check firebase-config.js");
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logIn(email, password) {
  if (!firebaseReady) throw new Error("Firebase not configured. Check firebase-config.js");
  return signInWithEmailAndPassword(auth, email, password);
}

// Uses redirect instead of popup — more reliable across browsers
// (popups get blocked by some browsers/settings, redirect always works).
export async function logInWithGoogle() {
  if (!firebaseReady) throw new Error("Firebase not configured. Check firebase-config.js");
  const provider = new GoogleAuthProvider();
  return signInWithRedirect(auth, provider);
}

// Call this once when the app loads — after a Google redirect sign-in,
// the user gets sent back to your site and this picks up the result.
export async function checkRedirectResult() {
  if (!firebaseReady) return null;
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (e) {
    console.error("Redirect sign-in error:", e);
    return null;
  }
}

export async function logOut() {
  return signOut(auth);
}

// ---------- Firestore: save, load & delete a student's results ----------
export async function saveResult({ streamName, interestName, mode, careers }) {
  if (!currentUser) throw new Error("Not logged in");
  return addDoc(collection(db, "savedPaths"), {
    uid: currentUser.uid,
    streamName,
    interestName,
    mode,
    careers,
    savedAt: serverTimestamp(),
  });
}

export async function loadSavedResults() {
  if (!currentUser) throw new Error("Not logged in");
  // Note: no orderBy here on purpose — combining where() + orderBy() on different
  // fields needs a Firestore composite index. We sort client-side instead, which
  // works with zero extra setup.
  const q = query(collection(db, "savedPaths"), where("uid", "==", currentUser.uid));
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  results.sort((a, b) => (b.savedAt?.seconds || 0) - (a.savedAt?.seconds || 0));
  return results;
}

export async function deleteResult(id) {
  if (!currentUser) throw new Error("Not logged in");
  return deleteDoc(doc(db, "savedPaths", id));
}

// ---------- Firestore: feedback ----------
export async function submitFeedback({ rating, text }) {
  return addDoc(collection(db, "feedback"), {
    uid: currentUser?.uid || "anonymous",
    email: currentUser?.email || "anonymous",
    rating,
    text,
    createdAt: serverTimestamp(),
  });
}