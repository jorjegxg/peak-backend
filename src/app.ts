import cors from "cors";
import express, { Request, Response } from "express";
import otpRoutes from "./otp/routes";
import reservationRoutes from "./reservations/routes";
import userRoutes from "./users/routes";

const app = express();

const allowedOrigins = [
  "https://peak-nu-nine.vercel.app",
  "http://localhost:3000",
  "https://peak-4h65hm9x7-gxgs-projects-19966461.vercel.app",
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (origin.endsWith(".vercel.app")) return cb(null, true);
      return cb(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/otp", otpRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/users", userRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello from the backend!" });
});

export default app;
