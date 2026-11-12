import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function adminApp() {
  if (getApps().length) return getApps()[0]!;
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());

/** Verify `Authorization: Bearer <Firebase ID token>`; returns uid or null. */
export async function getUid(req: Request): Promise<string | null> {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  try {
    return (await adminAuth().verifyIdToken(h.slice(7))).uid;
  } catch {
    return null;
  }
}

export async function isMember(uid: string, babyId: string): Promise<boolean> {
  const snap = await adminDb().doc(`babies/${babyId}`).get();
  return !!snap.exists && (snap.data()?.memberUids as string[] | undefined)?.includes(uid) === true;
}
