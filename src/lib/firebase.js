import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, setDoc, query, where, orderBy, serverTimestamp,
  onSnapshot, limit
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAlQsON2HFJM5mCRP18E_R_UGP_x3SXNI8",
  authDomain: "leahunter.firebaseapp.com",
  projectId: "leahunter",
  storageBucket: "leahunter.firebasestorage.app",
  messagingSenderId: "446558524955",
  appId: "1:446558524955:web:89356211f5b0286efe0abe",
  measurementId: "G-PV9X2BLHSL"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);

// Shared user ID — no auth, all data stored under this key
export const USER_ID = "shared";

// ─── Analytics ────────────────────────────────────────────────────────────────
export const trackEvent = (name, params = {}) => {
  try { logEvent(analytics, name, params); } catch (e) {}
};

// ─── Firestore: Leads ─────────────────────────────────────────────────────────
export const leadsRef = () => collection(db, "leads");

export const addLead = async (lead) => {
  const ref = await addDoc(leadsRef(), {
    ...lead,
    status: "new",
    notes: "",
    tags: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  trackEvent("lead_added", { type: lead.type });
  return ref.id;
};

export const updateLead = async (leadId, updates) => {
  await updateDoc(doc(db, "leads", leadId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteLead = async (leadId) => {
  await deleteDoc(doc(db, "leads", leadId));
  trackEvent("lead_deleted");
};

export const subscribeLeads = (callback) => {
  return onSnapshot(
    query(leadsRef(), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
};

// ─── Firestore: Search History ────────────────────────────────────────────────
export const addSearchHistory = async (search) => {
  await addDoc(collection(db, "searches"), {
    ...search,
    createdAt: serverTimestamp(),
  });
};

export const getSearchHistory = async () => {
  const snap = await getDocs(
    query(collection(db, "searches"), orderBy("createdAt", "desc"), limit(10))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ─── Firestore: Notes ─────────────────────────────────────────────────────────
export const addNote = async (leadId, note) => {
  const ref = await addDoc(collection(db, "leads", leadId, "notes"), {
    content: note,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getNotes = async (leadId) => {
  const snap = await getDocs(
    query(collection(db, "leads", leadId, "notes"), orderBy("createdAt", "asc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteNote = async (leadId, noteId) => {
  await deleteDoc(doc(db, "leads", leadId, "notes", noteId));
};
