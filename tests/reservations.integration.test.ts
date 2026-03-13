/**
 * Reservation integration tests: real database.
 * Auth is mocked so POST works without a real Firebase token; reservations store is real.
 * Run with: npm run test:integration
 * Requires: DATABASE_URL or MYSQL_* env (e.g. from .env or .env.test).
 */
import "dotenv/config";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import request from "supertest";
import { getPool } from "../src/db";

vi.mock("../src/auth/firebase", () => ({
  verifyFirebaseToken: vi.fn().mockResolvedValue({ uid: "integration-test-uid" }),
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
}));

const getProfileByUid = vi.fn();
vi.mock("../src/users/store", () => ({
  getProfileByUid,
}));

const app = (await import("../src/app")).default;
const testProfile = { phone: "+15551234567", email: "integration@example.com" };

function isDbConfigured(): boolean {
  return !!(process.env.DATABASE_URL || process.env.MYSQL_HOST);
}

const TEST_DATE = "2030-06-01";

async function deleteReservationsForDate(date: string): Promise<void> {
  const pool = await getPool();
  await pool.query("DELETE FROM reservations WHERE date = ?", [date]);
}

describe.skipIf(!isDbConfigured())("Reservations integration", () => {
  beforeEach(() => {
    getProfileByUid.mockResolvedValue(testProfile);
  });

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
    };

    const postRes = await request(app)
      .post("/api/reservations")
      .send(body)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer integration-test-token");

    expect(postRes.status).toBe(201);
    expect(postRes.body.reservation).toMatchObject({
      type: "ps5",
      station: 1,
      date: TEST_DATE,
      time: "14:00",
      duration: 1,
      name: "Alice",
      phone: testProfile.phone,
      email: testProfile.email,
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
    };
    const two = {
      type: "pc",
      station: 2,
      date: TEST_DATE,
      time: "16:00",
      duration: 2,
      name: "Carol",
    };
    const auth = { Authorization: "Bearer integration-test-token" };
    await request(app).post("/api/reservations").send(one).set("Content-Type", "application/json").set(auth);
    await request(app).post("/api/reservations").send(two).set("Content-Type", "application/json").set(auth);

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
      })
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer integration-test-token");

    const res = await request(app).get(
      `/api/reservations?date=${encodeURIComponent(TEST_DATE)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.reservations).toHaveLength(0);

    const pool = await getPool();
    await pool.query("DELETE FROM reservations WHERE date = ?", [otherDate]);
  });

  it("POST stores userId from token", async () => {
    const body = {
      type: "pc",
      station: 1,
      date: TEST_DATE,
      time: "17:00",
      duration: 1,
      name: "User",
    };

    const postRes = await request(app)
      .post("/api/reservations")
      .send(body)
      .set("Content-Type", "application/json")
      .set("Authorization", "Bearer integration-test-token");
    expect(postRes.status).toBe(201);
    expect(postRes.body.reservation.userId).toBe("integration-test-uid");

    const getRes = await request(app).get(
      `/api/reservations?date=${encodeURIComponent(TEST_DATE)}`
    );
    expect(getRes.body.reservations[0].userId).toBe("integration-test-uid");
  });
});
