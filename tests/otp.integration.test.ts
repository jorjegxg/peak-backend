/**
 * OTP integration tests: real database, mocked Twilio (no SMS sent).
 * Run with: npm run test:integration
 * Requires: DATABASE_URL or MYSQL_* env (e.g. from .env or .env.test).
 */
import "dotenv/config";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RowDataPacket } from "mysql2";
import request from "supertest";
import { getPool } from "../src/db";

const sendOtpSms = vi.fn();
const isTwilioConfigured = vi.fn();

vi.mock("../src/otp/twilio", () => ({
  sendOtpSms,
  isTwilioConfigured,
}));

const app = (await import("../src/app")).default;

function isDbConfigured(): boolean {
  return !!(process.env.DATABASE_URL || process.env.MYSQL_HOST);
}

async function getStoredOtpCode(phone: string): Promise<string | null> {
  const pool = await getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT code FROM otps WHERE phone = ?",
    [phone]
  );
  const row = rows[0] as { code: string } | undefined;
  return row?.code ?? null;
}

async function deleteOtp(phone: string): Promise<void> {
  const pool = await getPool();
  await pool.query("DELETE FROM otps WHERE phone = ?", [phone]);
}

describe.skipIf(!isDbConfigured())("OTP integration", () => {
  const testPhone = "+15550001111";

  beforeEach(() => {
    vi.clearAllMocks();
    isTwilioConfigured.mockReturnValue(true);
    sendOtpSms.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await deleteOtp(testPhone);
  });

  it("full flow: send OTP then verify with stored code", async () => {
    const sendRes = await request(app)
      .post("/api/otp/send")
      .send({ phone: testPhone })
      .set("Content-Type", "application/json");

    expect(sendRes.status).toBe(200);
    expect(sendRes.body.message).toBe("OTP sent");
    expect(sendRes.body.expiresInSeconds).toBe(300);
    expect(sendOtpSms).toHaveBeenCalledWith(testPhone, expect.any(String));

    const code = await getStoredOtpCode(testPhone);
    expect(code).toBeTruthy();
    expect(code).toHaveLength(6);

    const verifyRes = await request(app)
      .post("/api/otp/verify")
      .send({ phone: testPhone, code })
      .set("Content-Type", "application/json");

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verified).toBe(true);
    expect(verifyRes.body.message).toBe("Phone verified");
  });

  it("verify fails with wrong code", async () => {
    await request(app)
      .post("/api/otp/send")
      .send({ phone: testPhone })
      .set("Content-Type", "application/json");

    const verifyRes = await request(app)
      .post("/api/otp/verify")
      .send({ phone: testPhone, code: "000000" })
      .set("Content-Type", "application/json");

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.verified).toBe(false);
    expect(verifyRes.body.error).toBe("Invalid or expired code");
  });

  it("verify fails when code already used (consumed)", async () => {
    await request(app)
      .post("/api/otp/send")
      .send({ phone: testPhone })
      .set("Content-Type", "application/json");

    const code = await getStoredOtpCode(testPhone);
    expect(code).toBeTruthy();

    const firstVerify = await request(app)
      .post("/api/otp/verify")
      .send({ phone: testPhone, code })
      .set("Content-Type", "application/json");
    expect(firstVerify.status).toBe(200);

    const secondVerify = await request(app)
      .post("/api/otp/verify")
      .send({ phone: testPhone, code })
      .set("Content-Type", "application/json");
    expect(secondVerify.status).toBe(400);
    expect(secondVerify.body.verified).toBe(false);
  });

  it("send overwrites previous OTP for same phone", async () => {
    await request(app)
      .post("/api/otp/send")
      .send({ phone: testPhone })
      .set("Content-Type", "application/json");
    const firstCode = await getStoredOtpCode(testPhone);

    await request(app)
      .post("/api/otp/send")
      .send({ phone: testPhone })
      .set("Content-Type", "application/json");
    const secondCode = await getStoredOtpCode(testPhone);

    expect(firstCode).toBeTruthy();
    expect(secondCode).toBeTruthy();
    expect(secondCode).not.toBe(firstCode);

    const verifyWithSecond = await request(app)
      .post("/api/otp/verify")
      .send({ phone: testPhone, code: secondCode })
      .set("Content-Type", "application/json");
    expect(verifyWithSecond.status).toBe(200);

    const verifyWithFirst = await request(app)
      .post("/api/otp/verify")
      .send({ phone: testPhone, code: firstCode })
      .set("Content-Type", "application/json");
    expect(verifyWithFirst.status).toBe(400);
  });
});
