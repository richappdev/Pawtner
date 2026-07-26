import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function initAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    "pawtner-app-2026";

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  // On App Hosting / Cloud Run, Application Default Credentials are preferred.
  return initializeApp({ projectId });
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(initAdminApp());
}

export async function verifyFirebaseIdToken(idToken: string) {
  return getFirebaseAdminAuth().verifyIdToken(idToken);
}
