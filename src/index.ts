import "dotenv/config";
import app from "./app";
import { initFirebaseAdmin, isFirebaseConfigured } from "./auth/firebase";

const PORT = process.env.PORT || 3001;

initFirebaseAdmin();
if (isFirebaseConfigured()) {
  console.log("[auth] Firebase Admin initialized");
} else {
  console.warn(
    "[auth] Firebase Admin not configured — /api/users/* will return 503. In peak-backend .env set: GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json"
  );
}

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
