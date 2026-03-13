import "dotenv/config";
import cors from "cors";
import express, { Request, Response } from "express";
import otpRoutes from "./otp/routes";
import reservationRoutes from "./reservations/routes";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
// Parse JSON bodies
app.use(express.json());

// OTP phone verification
app.use("/api/otp", otpRoutes);

// Reservations (database)
app.use("/api/reservations", reservationRoutes);

// Health/root route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello from the backend!" });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  console.error("Server failed to start:", err.message);
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Try another port or stop the other process.`,
    );
  }
  process.exit(1);
});
