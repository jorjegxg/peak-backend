import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const getReservationsForDate = vi.fn();
const saveReservation = vi.fn();

vi.mock("../src/reservations/store", () => ({
  getReservationsForDate,
  saveReservation,
}));

const app = (await import("../src/app")).default;

describe("Reservation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/reservations", () => {
    it("returns 400 when date is missing", async () => {
      const res = await request(app).get("/api/reservations");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("date");
    });

    it("returns 400 when date format is invalid", async () => {
      const res = await request(app).get("/api/reservations?date=invalid");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Valid date");
    });

    it("returns reservations for valid date", async () => {
      const list = [
        {
          id: "r1",
          type: "ps5" as const,
          station: 1,
          date: "2025-03-15",
          time: "14:00",
          duration: 1,
          name: "Alice",
          phone: "+15551234567",
          email: "alice@example.com",
          createdAt: "2025-03-15T12:00:00.000Z",
        },
      ];
      getReservationsForDate.mockResolvedValue(list);

      const res = await request(app).get("/api/reservations?date=2025-03-15");
      expect(res.status).toBe(200);
      expect(res.body.reservations).toEqual(list);
      expect(getReservationsForDate).toHaveBeenCalledWith("2025-03-15");
    });

    it("returns empty array when no reservations", async () => {
      getReservationsForDate.mockResolvedValue([]);
      const res = await request(app).get("/api/reservations?date=2025-03-20");
      expect(res.status).toBe(200);
      expect(res.body.reservations).toEqual([]);
    });
  });

  describe("POST /api/reservations", () => {
    const validBody = {
      type: "ps5",
      station: 1,
      date: "2025-03-15",
      time: "14:00",
      duration: 1,
      name: "Bob",
      phone: "+15559876543",
      email: "bob@example.com",
    };

    it("returns 201 and reservation when body is valid", async () => {
      const saved = {
        ...validBody,
        id: "gen-id",
        createdAt: "2025-03-15T12:00:00.000Z",
      };
      saveReservation.mockResolvedValue(saved);

      const res = await request(app)
        .post("/api/reservations")
        .send(validBody)
        .set("Content-Type", "application/json");

      expect(res.status).toBe(201);
      expect(res.body.reservation).toEqual(saved);
      expect(saveReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ps5",
          station: 1,
          date: "2025-03-15",
          time: "14:00",
          duration: 1,
          name: "Bob",
          phone: "+15559876543",
          email: "bob@example.com",
        })
      );
    });

    it("returns 400 when type is invalid", async () => {
      const res = await request(app)
        .post("/api/reservations")
        .send({ ...validBody, type: "xbox" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("type");
    });

    it("returns 400 when station is missing or invalid", async () => {
      const res = await request(app)
        .post("/api/reservations")
        .send({ ...validBody, station: 0 })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("station");
    });

    it("returns 400 when date format is invalid", async () => {
      const res = await request(app)
        .post("/api/reservations")
        .send({ ...validBody, date: "03-15-2025" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("date");
    });

    it("returns 400 when name is empty", async () => {
      const res = await request(app)
        .post("/api/reservations")
        .send({ ...validBody, name: "   " })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("name");
    });

    it("accepts optional userId", async () => {
      saveReservation.mockResolvedValue({ ...validBody, id: "x", createdAt: "" });
      const res = await request(app)
        .post("/api/reservations")
        .send({ ...validBody, userId: "+15551111111" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(201);
      expect(saveReservation).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "+15551111111" })
      );
    });

    it("trims name, phone, email", async () => {
      saveReservation.mockResolvedValue({ ...validBody, id: "x", createdAt: "" });
      await request(app)
        .post("/api/reservations")
        .send({
          ...validBody,
          name: "  Bob  ",
          phone: "  +15559876543  ",
          email: "  bob@example.com  ",
        })
        .set("Content-Type", "application/json");
      expect(saveReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Bob",
          phone: "+15559876543",
          email: "bob@example.com",
        })
      );
    });
  });
});
