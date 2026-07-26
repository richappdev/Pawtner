import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getFirebaseWebConfig() {
  return {
    apiKey: required("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "pawtner-app-2026.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "pawtner-app-2026",
    appId: required("NEXT_PUBLIC_FIREBASE_APP_ID"),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "611592714843",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  };
}

let browserApp: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (browserApp) return browserApp;
  browserApp = getApps()[0] ?? initializeApp(getFirebaseWebConfig());
  return browserApp;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
