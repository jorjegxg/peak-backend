import "dotenv/config";
import express, { Request, Response } from "express";
import otpRoutes from "./otp/routes";

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// OTP phone verification
app.use("/api/otp", otpRoutes);

// Health/root route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello from the backend!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
