import { Router, Request, Response } from "express";
import { verifyFirebaseToken, isFirebaseConfigured } from "../auth/firebase";
import { getOrCreateUser, setUserPhone } from "./store";
import { verifyOtp } from "../otp/store";

const router = Router();

function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

/**
 * GET /api/users/me
 * Authorization: Bearer <Firebase ID token>
 * Returns user profile; creates user if first time. hasPhone is false until they verify phone.
 */
router.get("/me", async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) {
    return res.status(503).json({
      error: "Authentication service is not configured",
      hint: "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS in peak-backend .env",
    });
  }
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authorization required" });
  }
  try {
    const { uid, email, name } = await verifyFirebaseToken(token);
    const profile = await getOrCreateUser(uid, email ?? null, name ?? null);
    res.json(profile);
  } catch (err) {
    console.error("[users] GET /me failed:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

/**
 * POST /api/users/me/phone
 * Authorization: Bearer <Firebase ID token>
 * Body: { phone: string, code: string }
 * Verifies OTP and links phone to the authenticated user.
 */
router.post("/me/phone", async (req: Request, res: Response) => {
  if (!isFirebaseConfigured()) {
    return res.status(503).json({
      error: "Authentication service is not configured",
      hint: "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS in peak-backend .env",
    });
  }
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authorization required" });
  }
  const { phone, code } = req.body as { phone?: string; code?: string };
  const raw = typeof phone === "string" ? phone : "";
  const normalizedPhone = raw.replace(/\s/g, "").trim();
  const e164 = normalizedPhone.startsWith("+") ? normalizedPhone : `+${normalizedPhone}`;
  if (!e164 || e164 === "+") {
    return res.status(400).json({ error: "Phone number is required" });
  }
  if (!code || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ error: "Verification code is required" });
  }
  try {
    const { uid } = await verifyFirebaseToken(token);
    const valid = await verifyOtp(e164, code.trim());
    if (!valid) {
      return res.status(400).json({ error: "Invalid or expired code", verified: false });
    }
    await setUserPhone(uid, e164);
    res.json({ success: true, message: "Phone verified and linked" });
  } catch (err) {
    console.error("[users] POST /me/phone failed:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
