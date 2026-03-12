import type { RowDataPacket } from "mysql2";
import { getPool } from "../db";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_LENGTH = 6;

function generateCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

export async function createOtp(phone: string): Promise<string> {
  const pool = await getPool();
  const code = generateCode();
  const expiresAt = Date.now() + OTP_TTL_MS;
  await pool.query(
    `INSERT INTO otps (phone, code, expires_at) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at)`,
    [phone, code, expiresAt],
  );
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const pool = await getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT code, expires_at FROM otps WHERE phone = ?",
    [phone],
  );
  const record = rows[0] as { code: string; expires_at: number } | undefined;
  if (!record) return false;
  if (Date.now() > Number(record.expires_at)) {
    await pool.query("DELETE FROM otps WHERE phone = ?", [phone]);
    return false;
  }
  const valid = record.code === code;
  if (valid) {
    await pool.query("DELETE FROM otps WHERE phone = ?", [phone]);
  }
  return valid;
}

export function getOtpTtlSeconds(): number {
  return Math.floor(OTP_TTL_MS / 1000);
}
