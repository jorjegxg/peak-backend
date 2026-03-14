/**
 * Seeds the database with dummy reservations. Run with: npm run db:seed
 */
import "dotenv/config";
import { getPool } from "./db";
import { ensureTable, type Reservation } from "./reservations/store";

const SEED_DATE_1 = "2026-03-13";
const SEED_DATE_2 = "2025-03-14";

type SeedReservation = Omit<Reservation, "id" | "createdAt" | "userId">;
const DUMMY_RESERVATIONS: SeedReservation[] = [
  // {
  //   type: "ps5" as const,
  //   station: 1,
  //   date: SEED_DATE_1,
  //   time: "14:00",
  //   duration: 1,
  //   name: "Alex",
  //   phone: "+40721111111",
  //   email: "alex@example.com",
  // },
  // {
  //   type: "ps5" as const,
  //   station: 2,
  //   date: SEED_DATE_1,
  //   time: "15:00",
  //   duration: 2,
  //   name: "Maria",
  //   phone: "+40722222222",
  //   email: "maria@example.com",
  // },
  // {
  //   type: "ps5" as const,
  //   station: 3,
  //   date: SEED_DATE_1,
  //   time: "18:00",
  //   duration: 1,
  //   name: "Andrei",
  //   phone: "+40723333333",
  //   email: "andrei@example.com",
  // },
  // {
  //   type: "pc" as const,
  //   station: 1,
  //   date: SEED_DATE_1,
  //   time: "14:00",
  //   duration: 1,
  //   name: "Elena",
  //   phone: "+40724444444",
  //   email: "elena@example.com",
  // },
  // {
  //   type: "pc" as const,
  //   station: 2,
  //   date: SEED_DATE_1,
  //   time: "16:00",
  //   duration: 2,
  //   name: "Dan",
  //   phone: "+40725555555",
  //   email: "dan@example.com",
  // },
  // {
  //   type: "ps5" as const,
  //   station: 1,
  //   date: SEED_DATE_2,
  //   time: "12:00",
  //   duration: 1,
  //   name: "Ioana",
  //   phone: "+40726666666",
  //   email: "ioana@example.com",
  // },
  // {
  //   type: "pc" as const,
  //   station: 3,
  //   date: SEED_DATE_2,
  //   time: "19:00",
  //   duration: 1,
  //   name: "Mihai",
  //   phone: "+40727777777",
  //   email: "mihai@example.com",
  // },
];

function generateId(): string {
  return crypto.randomUUID();
}

async function seed(): Promise<void> {
  await ensureTable();
  const pool = await getPool();
  const now = Date.now();

  await pool.query("DELETE FROM reservations WHERE date IN (?, ?)", [
    SEED_DATE_1,
    SEED_DATE_2,
  ]);

  for (const r of DUMMY_RESERVATIONS) {
    const id = generateId();
    await pool.query(
      `INSERT INTO reservations (id, type, station, date, time, duration, name, phone, email, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
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
        now,
      ],
    );
  }

  console.log(
    `Seeded ${DUMMY_RESERVATIONS.length} dummy reservations for ${SEED_DATE_1} and ${SEED_DATE_2}.`,
  );
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
