import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

let initialized = false;

export function initFirebaseAdmin(): void {
  if (initialized) return;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  let credential: admin.ServiceAccount | undefined;

  // Prefer file path (more reliable than inline JSON in .env)
  if (credPath && credPath.trim() !== "") {
    const resolvedPath = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error("[auth] GOOGLE_APPLICATION_CREDENTIALS file not found:", resolvedPath);
      return;
    }
    try {
      const raw = fs.readFileSync(resolvedPath, "utf8");
      credential = JSON.parse(raw) as admin.ServiceAccount;
    } catch (err) {
      console.error("[auth] Failed to read GOOGLE_APPLICATION_CREDENTIALS file:", err);
      return;
    }
  } else if (json && json.trim() !== "") {
    try {
      credential = JSON.parse(json) as admin.ServiceAccount;
    } catch (err) {
      console.error("[auth] FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON. Prefer GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json instead.", err);
      return;
    }
  } else {
    return;
  }

  try {
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
