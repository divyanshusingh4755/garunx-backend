import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Firebase configuration is missing",);
}

const firebaseApp =
  getApps().length > 0 ? getApp() : initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

export const auth = getAuth(firebaseApp);
export const firebaseMessaging = getMessaging(firebaseApp);