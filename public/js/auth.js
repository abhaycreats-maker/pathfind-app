import { firebaseConfig } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
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
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseReady = true;
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

let currentUser = null;

export function initAuth(onUserChange) {
  if (!firebaseReady) return;

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    console.log("Auth state:", user);
    onUserChange(user);
  });
}

export function getCurrentUser() {
  return currentUser;
}

export async function signUp(email, password) {
  if (!firebaseReady) {
    throw new Error("Firebase not configured.");
  }

  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logIn(email, password) {
  if (!firebaseReady) {
    throw new Error("Firebase not configured.");
  }

  return signInWithEmailAndPassword(auth, email, password);
}

export async function logInWithGoogle() {
  if (!firebaseReady) {
    throw new Error("Firebase not configured.");
  }

  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  try {
    const result = await signInWithPopup(auth, provider);

    currentUser = result.user;

    console.log("Google login successful:", result.user);

    return result.user;

  } catch (error) {
    console.error("Google login error:", error);
    throw error;
  }
}

export async function logOut() {
  if (!firebaseReady) return;

  await signOut(auth);
  currentUser = null;
}

export async function saveResult({
  streamName,
  interestName,
  mode,
  careers
}) {
  if (!currentUser) {
    throw new Error("Not logged in");
  }

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
  if (!currentUser) {
    throw new Error("Not logged in");
  }

  const q = query(
    collection(db, "savedPaths"),
    where("uid", "==", currentUser.uid)
  );

  const snap = await getDocs(q);

  const results = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  results.sort(
    (a, b) =>
      (b.savedAt?.seconds || 0) -
      (a.savedAt?.seconds || 0)
  );

  return results;
}

export async function deleteResult(id) {
  if (!currentUser) {
    throw new Error("Not logged in");
  }

  return deleteDoc(doc(db, "savedPaths", id));
}

export async function submitFeedback({ rating, text }) {
  return addDoc(collection(db, "feedback"), {
    uid: currentUser?.uid || "anonymous",
    email: currentUser?.email || "anonymous",
    rating,
    text,
    createdAt: serverTimestamp(),
  });
}