import type { RowDataPacket } from "mysql2";
import { getPool } from "../db";

const USERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    firebase_uid VARCHAR(255) PRIMARY KEY,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    display_name VARCHAR(255) NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )
`;

export type UserRow = {
  firebase_uid: string;
  phone: string | null;
  email: string | null;
  display_name: string | null;
  created_at: number;
  updated_at: number;
};

export type UserProfile = {
  hasPhone: boolean;
  phone: string | null;
  email: string | null;
  displayName: string | null;
};

async function ensureTable(): Promise<void> {
  const pool = await getPool();
  await pool.query(USERS_TABLE_SQL);
}

export async function getOrCreateUser(
  firebaseUid: string,
  email: string | null,
  displayName: string | null
): Promise<UserProfile> {
  await ensureTable();
  const pool = await getPool();
  const now = Date.now();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM users WHERE firebase_uid = ?",
    [firebaseUid]
  );
  const existing = rows[0] as UserRow | undefined;
  if (existing) {
    return {
      hasPhone: !!existing.phone,
      phone: existing.phone,
      email: existing.email,
      displayName: existing.display_name,
    };
  }
  await pool.query(
    "INSERT INTO users (firebase_uid, phone, email, display_name, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?)",
    [firebaseUid, email, displayName, now, now]
  );
  return {
    hasPhone: false,
    phone: null,
    email,
    displayName,
  };
}

/** Get phone and email for a user by Firebase UID. Returns null if user not found. */
export async function getProfileByUid(firebaseUid: string): Promise<{ phone: string | null; email: string | null } | null> {
  await ensureTable();
  const pool = await getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT phone, email FROM users WHERE firebase_uid = ?",
    [firebaseUid]
  );
  const row = rows[0] as { phone: string | null; email: string | null } | undefined;
  return row ?? null;
}

export async function setUserPhone(firebaseUid: string, phone: string): Promise<void> {
  await ensureTable();
  const pool = await getPool();
  const now = Date.now();
  await pool.query(
    "UPDATE users SET phone = ?, updated_at = ? WHERE firebase_uid = ?",
    [phone, now, firebaseUid]
  );
}
