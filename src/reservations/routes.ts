import { Router, Request, Response } from "express";
import {
  getReservationsForDate,
  saveReservation,
  type Reservation,
} from "./store";

const router = Router();

/**
 * GET /api/reservations?date=YYYY-MM-DD
 * Returns reservations for the given date.
 */
router.get("/", async (req: Request, res: Response) => {
  const date = req.query.date as string;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Valid date query (YYYY-MM-DD) is required" });
  }
  try {
    const reservations = await getReservationsForDate(date);
    res.json({ reservations });
  } catch (err) {
    console.error("[reservations] getReservationsForDate failed:", err);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

/**
 * POST /api/reservations
 * Body: { type, station, date, time, duration, name, phone, email, userId? }
 */
router.post("/", async (req: Request, res: Response) => {
  const body = req.body as Partial<
    Omit<Reservation, "id" | "createdAt"> & { userId?: string }
  >;
  const {
    type,
    station,
    date,
    time,
    duration,
    name,
    phone,
    email,
    userId,
  } = body;

  if (!type || (type !== "ps5" && type !== "pc")) {
    return res.status(400).json({ error: "type must be 'ps5' or 'pc'" });
  }
  if (typeof station !== "number" || station < 1) {
    return res.status(400).json({ error: "station must be a positive number" });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }
  if (!time || typeof time !== "string") {
    return res.status(400).json({ error: "time is required" });
  }
  if (typeof duration !== "number" || duration < 1) {
    return res.status(400).json({ error: "duration must be a positive number" });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return res.status(400).json({ error: "phone is required" });
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "email is required" });
  }

  try {
    const reservation = await saveReservation({
      type,
      station,
      date,
      time,
      duration,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      ...(userId ? { userId } : {}),
    });
    res.status(201).json({ reservation });
  } catch (err) {
    console.error("[reservations] saveReservation failed:", err);
    res.status(500).json({ error: "Failed to save reservation" });
  }
});

export default router;
