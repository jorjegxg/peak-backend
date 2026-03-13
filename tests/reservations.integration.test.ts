/**
 * Reservation integration tests: real database.
 * Run with: npm run test:integration
 * Requires: DATABASE_URL or MYSQL_* env (e.g. from .env or .env.test).
 */
import "dotenv/config";
import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { getPool } from "../src/db";

const app = (await import("../src/app")).default;

function isDbConfigured(): boolean {
  return !!(process.env.DATABASE_URL || process.env.MYSQL_HOST);
}

const TEST_DATE = "2030-06-01";

async function deleteReservationsForDate(date: string): Promise<void> {
  const pool = await getPool();
  await pool.query("DELETE FROM reservations WHERE date = ?", [date]);
}

describe.skipIf(!isDbConfigured())("Reservations integration", () => {
  afterEach(async () => {
    await deleteReservationsForDate(TEST_DATE);
  });

  it("GET returns empty array when no reservations for date", async () => {
    const res = await request(app).get(
      `/api/reservations?date=${encodeURIComponent(TEST_DATE)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.reservations).toEqual([]);
  });

  it("POST creates reservation and GET returns it", async () => {
    const body = {
      type: "ps5",
      station: 1,
      date: TEST_DATE,
      time: "14:00",
      duration: 1,
      name: "Alice",
      phone: "+15551234567",
      email: "alice@example.com",
    };

    const postRes = await request(app)
      .post("/api/reservations")
      .send(body)
      .set("Content-Type", "application/json");

    expect(postRes.status).toBe(201);
    expect(postRes.body.reservation).toMatchObject({
      type: "ps5",
      station: 1,
      date: TEST_DATE,
      time: "14:00",
      duration: 1,
      name: "Alice",
      phone: "+15551234567",
      email: "alice@example.com",
    });
    expect(postRes.body.reservation.id).toBeDefined();
    expect(postRes.body.reservation.createdAt).toBeDefined();

    const getRes = await request(app).get(
      `/api/reservations?date=${encodeURIComponent(TEST_DATE)}`
    );
    expect(getRes.status).toBe(200);
    expect(getRes.body.reservations).toHaveLength(1);
    expect(getRes.body.reservations[0].id).toBe(postRes.body.reservation.id);
    expect(getRes.body.reservations[0].name).toBe("Alice");
  });

  it("multiple reservations for same date are stored and returned", async () => {
    const one = {
      type: "ps5",
      station: 1,
      date: TEST_DATE,
      time: "15:00",
      duration: 1,
      name: "Bob",
      phone: "+15559876543",
      email: "bob@example.com",
    };
    const two = {
      type: "pc",
      station: 2,
      date: TEST_DATE,
      time: "16:00",
      duration: 2,
      name: "Carol",
      phone: "+15551112222",
      email: "carol@example.com",
    };

    await request(app).post("/api/reservations").send(one).set("Content-Type", "application/json");
    await request(app).post("/api/reservations").send(two).set("Content-Type", "application/json");

    const res = await request(app).get(
      `/api/reservations?date=${encodeURIComponent(TEST_DATE)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.reservations).toHaveLength(2);
    const names = res.body.reservations.map((r: { name: string }) => r.name).sort();
    expect(names).toEqual(["Bob", "Carol"]);
  });

  it("GET returns only reservations for requested date", async () => {
    const otherDate = "2030-06-02";
    await request(app)
      .post("/api/reservations")
      .send({
        type: "ps5",
        station: 1,
        date: otherDate,
        time: "12:00",
        duration: 1,
        name: "Other",
        phone: "+15550000000",
        email: "other@example.com",
      })
      .set("Content-Type", "application/json");

    const res = await request(app).get(
      `/api/reservations?date=${encodeURIComponent(TEST_DATE)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.reservations).toHaveLength(0);

    const pool = await getPool();
    await pool.query("DELETE FROM reservations WHERE date = ?", [otherDate]);
  });

  it("POST accepts optional userId", async () => {
    const body = {
      type: "pc",
      station: 1,
      date: TEST_DATE,
      time: "17:00",
      duration: 1,
      name: "User",
      phone: "+15553334444",
      email: "user@example.com",
      userId: "+15557778888",
    };

    const postRes = await request(app)
      .post("/api/reservations")
      .send(body)
      .set("Content-Type", "application/json");
    expect(postRes.status).toBe(201);
    expect(postRes.body.reservation.userId).toBe("+15557778888");

    const getRes = await request(app).get(
      `/api/reservations?date=${encodeURIComponent(TEST_DATE)}`
    );
    expect(getRes.body.reservations[0].userId).toBe("+15557778888");
  });
});
