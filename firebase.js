// src/firebase.js
// ─────────────────────────────────────────────────────────────────────────────
// TARI BEATZ — Firebase Configuration
// Project: taribeatz | Owner: John Watipa Kalambo | Producer: TariMadeIt
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// ✅ TARI BEATZ Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyD69VEsHubvKegMKmXqBavjIbR1bTdK96g",
  authDomain: "taribeatz.firebaseapp.com",
  projectId: "taribeatz",
  storageBucket: "taribeatz.firebasestorage.app",
  messagingSenderId: "572739946090",
  appId: "1:572739946090:web:a10b83b1d5d22ccb5d2c13",
  measurementId: "G-5ZR51F6K9V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ─── BEATS ───────────────────────────────────────────────────────────────────

/** Fetch all approved beats from Firestore */
export async function fetchBeats() {
  const q = query(collection(db, "beats"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Add a new beat (admin use) */
export async function addBeat(beatData) {
  return await addDoc(collection(db, "beats"), {
    ...beatData,
    plays: 0,
    verified: true,
    createdAt: new Date(),
  });
}

/** Submit a producer beat (pending review) */
export async function submitProducerBeat(beatData) {
  return await addDoc(collection(db, "beats"), {
    ...beatData,
    plays: 0,
    verified: false,
    pendingPayment: true,
    createdAt: new Date(),
  });
}

/** Approve a pending beat */
export async function approveBeat(beatId) {
  const beatRef = doc(db, "beats", beatId);
  return await updateDoc(beatRef, { verified: true, pendingPayment: false });
}

/** Delete/remove a beat */
export async function removeBeat(beatId) {
  return await deleteDoc(doc(db, "beats", beatId));
}

/** Increment play count */
export async function incrementPlay(beatId) {
  const beatRef = doc(db, "beats", beatId);
  const snapshot = await getDocs(query(collection(db, "beats")));
  const beat = snapshot.docs.find(d => d.id === beatId);
  if (beat) {
    await updateDoc(beatRef, { plays: (beat.data().plays || 0) + 1 });
  }
}

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────

/**
 * Upload a beat audio file to Firebase Storage
 * @param {File} file - The audio file
 * @param {string} beatTitle - Used for the filename
 * @param {Function} onProgress - Called with % progress (0-100)
 * @returns {Promise<string>} - Download URL
 */
export function uploadBeatFile(file, beatTitle, onProgress) {
  return new Promise((resolve, reject) => {
    const sanitized = beatTitle.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `beats/${sanitized}_${Date.now()}.${file.name.split(".").pop()}`;
    const storageRef = ref(storage, filename);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      snapshot => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      error => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

/** Log a completed purchase (called after PayPal redirect) */
export async function logOrder(orderData) {
  return await addDoc(collection(db, "orders"), {
    ...orderData,
    createdAt: new Date(),
  });
}

/** Fetch all orders (admin use) */
export async function fetchOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── UPLOAD SUBMISSIONS ──────────────────────────────────────────────────────

/** Save a producer upload submission */
export async function submitUpload(submissionData) {
  return await addDoc(collection(db, "submissions"), {
    ...submissionData,
    status: "pending_payment",
    createdAt: new Date(),
  });
}

/** Fetch all pending submissions (admin) */
export async function fetchSubmissions() {
  const snapshot = await getDocs(collection(db, "submissions"));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
