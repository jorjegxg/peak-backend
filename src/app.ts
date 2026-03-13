import cors from "cors";
import express, { Request, Response } from "express";
import otpRoutes from "./otp/routes";
import reservationRoutes from "./reservations/routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/otp", otpRoutes);
app.use("/api/reservations", reservationRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello from the backend!" });
});

export default app;
