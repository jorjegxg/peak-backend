import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { getPool } from "../db";

const RESERVATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('ps5', 'pc') NOT NULL,
    station INT NOT NULL,
    date VARCHAR(10) NOT NULL,
    time VARCHAR(5) NOT NULL,
    duration INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NULL,
    created_at BIGINT NOT NULL,
    INDEX idx_date (date),
    INDEX idx_date_type (date, type)
  )
`;

export type ReservationRow = {
  id: string;
  type: "ps5" | "pc";
  station: number;
  date: string;
  time: string;
  duration: number;
  name: string;
  phone: string;
  email: string;
  user_id: string | null;
  created_at: number;
};

export type Reservation = {
  id: string;
  type: "ps5" | "pc";
  station: number;
  date: string;
  time: string;
  duration: number;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  userId?: string;
};

function rowToReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    type: row.type,
    station: row.station,
    date: row.date,
    time: row.time,
    duration: row.duration,
    name: row.name,
    phone: row.phone,
    email: row.email,
    createdAt: new Date(row.created_at).toISOString(),
    ...(row.user_id ? { userId: row.user_id } : {}),
  };
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function ensureTable(): Promise<void> {
  const pool = await getPool();
  await pool.query(RESERVATIONS_TABLE_SQL);
}

export async function getReservationsForDate(date: string): Promise<Reservation[]> {
  await ensureTable();
  const pool = await getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM reservations WHERE date = ? ORDER BY time, station",
    [date]
  );
  return (rows as ReservationRow[]).map(rowToReservation);
}

export async function saveReservation(
  r: Omit<Reservation, "id" | "createdAt"> & { userId?: string }
): Promise<Reservation> {
  await ensureTable();
  const pool = await getPool();
  const id = generateId();
  const createdAt = Date.now();
  await pool.query(
    `INSERT INTO reservations (id, type, station, date, time, duration, name, phone, email, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      r.type,
      r.station,
      r.date,
      r.time,
      r.duration,
      r.name,
      r.phone,
      r.email,
      r.userId ?? null,
      createdAt,
    ]
  );
  return {
    id,
    type: r.type,
    station: r.station,
    date: r.date,
    time: r.time,
    duration: r.duration,
    name: r.name,
    phone: r.phone,
    email: r.email,
    createdAt: new Date(createdAt).toISOString(),
    ...(r.userId ? { userId: r.userId } : {}),
  };
}

export async function deleteReservationForUser(
  id: string,
  userId: string
): Promise<boolean> {
  await ensureTable();
  const pool = await getPool();
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM reservations WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return result.affectedRows > 0;
}
