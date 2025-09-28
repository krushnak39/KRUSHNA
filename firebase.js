// Firebase Auth setup (clean version). Any previous duplicate configs removed.
// Web API keys are public identifiers (safe to expose). Never embed server credentials here.

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';

let app;            // Firebase App instance
let auth;           // Firebase Auth instance
let _readyResolve;  // Resolver for readiness promise
export const firebaseReady = new Promise(res => { _readyResolve = res; });

const firebaseConfig = {
    apiKey: "AIzaSyCzaX2v4CS5ohgoCKDUekHCLJdnZPKeoJM",
    authDomain: "krushna-6c0bc.firebaseapp.com",
    projectId: "krushna-6c0bc",
    storageBucket: "krushna-6c0bc.firebasestorage.app",
    messagingSenderId: "1077336890067",
    appId: "1:1077336890067:web:53d0f115dec61aa0589226"
  };

export function initFirebase(configOverride) {
  if (!getApps().length) {
    app = initializeApp(configOverride || firebaseConfig);
    auth = getAuth(app);
    _readyResolve(true);
  } else if (!auth) {
    auth = getAuth();
    _readyResolve(true);
  }
  return { app, auth };
}

export function onAuthStateChangedHandler(cb) {
  if (!auth) {
    console.warn('Auth not initialized yet; deferring listener');
    firebaseReady.then(() => onAuthStateChanged(auth, cb));
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function signUpWithEmail(email, password, profile = {}) {
  if (!auth) throw new Error('Auth not initialized');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (profile.displayName) {
    try { await updateProfile(cred.user, { displayName: profile.displayName }); } catch(e){ console.warn('Profile update failed', e); }
  }
  return cred.user;
}

export async function signInWithEmail(email, password) {
  if (!auth) throw new Error('Auth not initialized');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOutUser() {
  if (!auth) throw new Error('Auth not initialized');
  return signOut(auth);
}

export function configureAndReinit(userConfig) {
  if (!userConfig || !userConfig.apiKey) throw new Error('Invalid Firebase config');
  return initFirebase(userConfig);
}

// Auto init on import (optional). Remove if you want manual control.
initFirebase();


