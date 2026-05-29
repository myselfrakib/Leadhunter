import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
  sendPasswordResetEmail, signInWithPopup
} from "firebase/auth";
import {
  auth, googleProvider,
  createUserProfile, getUserProfile, trackEvent
} from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await getUserProfile(u.uid);
          setProfile(p);
        } catch (e) {}
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    setError(null);
    const { user: u } = await signInWithEmailAndPassword(auth, email, password);
    trackEvent("login", { method: "email" });
    const p = await getUserProfile(u.uid);
    setProfile(p);
    return u;
  };

  const register = async (email, password, displayName) => {
    setError(null);
    const { user: u } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(u, { displayName });
    await createUserProfile(u.uid, { email, displayName, photoURL: "" });
    trackEvent("sign_up", { method: "email" });
    const p = await getUserProfile(u.uid);
    setProfile(p);
    return u;
  };

  const loginWithGoogle = async () => {
    setError(null);
    const result = await signInWithPopup(auth, googleProvider);
    const u = result.user;
    const existing = await getUserProfile(u.uid);
    if (!existing) {
      await createUserProfile(u.uid, {
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL || "",
      });
    }
    trackEvent("login", { method: "google" });
    const p = await getUserProfile(u.uid);
    setProfile(p);
    return u;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    trackEvent("logout");
  };

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, register, loginWithGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
