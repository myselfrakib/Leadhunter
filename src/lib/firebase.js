import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, setDoc, query, where, orderBy, serverTimestamp,
  onSnapshot, limit
} from "firebase/firestore";
import {
  getAuth, GoogleAuthProvider
} from "firebase/auth";

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
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ─── Analytics ────────────────────────────────────────────────────────────────
export const trackEvent = (name, params = {}) => {
  try { logEvent(analytics, name, params); } catch (e) {}
};

// ─── Auth exports (instances only — functions come from firebase/auth directly)
export { auth, googleProvider, db };

// ─── Firestore: Leads ─────────────────────────────────────────────────────────
export const leadsRef = (uid) => collection(db, "users", uid, "leads");

export const addLead = async (uid, lead) => {
  const ref = await addDoc(leadsRef(uid), {
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

export const updateLead = async (uid, leadId, updates) => {
  await updateDoc(doc(db, "users", uid, "leads", leadId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  trackEvent("lead_updated", { field: Object.keys(updates).join(",") });
};

export const deleteLead = async (uid, leadId) => {
  await deleteDoc(doc(db, "users", uid, "leads", leadId));
  trackEvent("lead_deleted");
};

export const getLeads = async (uid) => {
  const snap = await getDocs(query(leadsRef(uid), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeLeads = (uid, callback) => {
  return onSnapshot(
    query(leadsRef(uid), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
};

// ─── Firestore: Search History ────────────────────────────────────────────────
export const addSearchHistory = async (uid, search) => {
  await addDoc(collection(db, "users", uid, "searches"), {
    ...search,
    createdAt: serverTimestamp(),
  });
};

export const getSearchHistory = async (uid) => {
  const snap = await getDocs(
    query(collection(db, "users", uid, "searches"), orderBy("createdAt", "desc"), limit(10))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ─── Firestore: User Profile ──────────────────────────────────────────────────
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() });
};

export const createUserProfile = async (uid, data) => {
  await setDoc(doc(db, "users", uid), {
    ...data,
    plan: "free",
    searchCount: 0,
    createdAt: serverTimestamp(),
  });
};

// ─── Firestore: Notes ─────────────────────────────────────────────────────────
export const addNote = async (uid, leadId, note) => {
  const ref = await addDoc(collection(db, "users", uid, "leads", leadId, "notes"), {
    content: note,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getNotes = async (uid, leadId) => {
  const snap = await getDocs(
    query(collection(db, "users", uid, "leads", leadId, "notes"), orderBy("createdAt", "asc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteNote = async (uid, leadId, noteId) => {
  await deleteDoc(doc(db, "users", uid, "leads", leadId, "notes", noteId));
};

// ─── Firestore: Filtered queries ─────────────────────────────────────────────
export const getLeadsByTag = async (uid, tag) => {
  const snap = await getDocs(query(leadsRef(uid), where("tags", "array-contains", tag)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getLeadsByStatus = async (uid, status) => {
  const snap = await getDocs(query(leadsRef(uid), where("status", "==", status), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
