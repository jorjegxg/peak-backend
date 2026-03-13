import admin from "firebase-admin";

let initialized = false;

export function initFirebaseAdmin(): void {
  if (initialized) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json || json === "") {
    return;
  }
  try {
    const credential = JSON.parse(json);
    admin.initializeApp({ credential: admin.credential.cert(credential) });
    initialized = true;
  } catch (err) {
    console.error("[auth] Failed to initialize Firebase Admin:", err);
  }
}

export function isFirebaseConfigured(): boolean {
  return initialized && admin.apps.length > 0;
}

export async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email?: string; name?: string }> {
  initFirebaseAdmin();
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase Admin is not configured");
  }
  const decoded = await admin.auth().verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email ?? undefined,
    name: decoded.name ?? (decoded as { display_name?: string }).display_name ?? undefined,
  };
}
