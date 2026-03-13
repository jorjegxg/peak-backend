import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const createOtp = vi.fn();
const verifyOtp = vi.fn();
const getOtpTtlSeconds = vi.fn();
const sendOtpSms = vi.fn();
const isTwilioConfigured = vi.fn();

vi.mock("../src/otp/store", () => ({
  createOtp,
  verifyOtp,
  getOtpTtlSeconds,
}));

vi.mock("../src/otp/twilio", () => ({
  sendOtpSms,
  isTwilioConfigured,
}));

// Import app after mocks so routes use mocked deps
const app = (await import("../src/app")).default;

describe("OTP routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOtpTtlSeconds.mockReturnValue(300);
  });

  describe("POST /api/otp/send", () => {
    it("returns 400 when phone is missing", async () => {
      const res = await request(app)
        .post("/api/otp/send")
        .send({})
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Phone number is required");
    });

    it("returns 400 when phone is invalid", async () => {
      const res = await request(app)
        .post("/api/otp/send")
        .send({ phone: "123" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid phone number format");
    });

    it("returns 503 when Twilio is not configured", async () => {
      isTwilioConfigured.mockReturnValue(false);
      const res = await request(app)
        .post("/api/otp/send")
        .send({ phone: "+15551234567" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("SMS service is not configured");
    });

    it("returns 200 and OTP sent when Twilio is configured", async () => {
      isTwilioConfigured.mockReturnValue(true);
      createOtp.mockResolvedValue("123456");
      sendOtpSms.mockResolvedValue(undefined);

      const res = await request(app)
        .post("/api/otp/send")
        .send({ phone: "+15551234567" })
        .set("Content-Type", "application/json");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("OTP sent");
      expect(res.body.expiresInSeconds).toBe(300);
      expect(createOtp).toHaveBeenCalledWith("+15551234567");
      expect(sendOtpSms).toHaveBeenCalledWith("+15551234567", "123456");
    });

    it("normalizes phone with spaces", async () => {
      isTwilioConfigured.mockReturnValue(true);
      createOtp.mockResolvedValue("654321");
      sendOtpSms.mockResolvedValue(undefined);

      const res = await request(app)
        .post("/api/otp/send")
        .send({ phone: "  +1 555 123 4567  " })
        .set("Content-Type", "application/json");

      expect(res.status).toBe(200);
      expect(createOtp).toHaveBeenCalledWith("+15551234567");
    });
  });

  describe("POST /api/otp/verify", () => {
    it("returns 400 when phone is missing", async () => {
      const res = await request(app)
        .post("/api/otp/verify")
        .send({ code: "123456" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Phone number is required");
    });

    it("returns 400 when code is missing", async () => {
      const res = await request(app)
        .post("/api/otp/verify")
        .send({ phone: "+15551234567" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Verification code is required");
    });

    it("returns 400 when code is invalid or expired", async () => {
      verifyOtp.mockResolvedValue(false);
      const res = await request(app)
        .post("/api/otp/verify")
        .send({ phone: "+15551234567", code: "000000" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
      expect(res.body.verified).toBe(false);
      expect(res.body.error).toBe("Invalid or expired code");
    });

    it("returns 200 and verified when code is valid", async () => {
      verifyOtp.mockResolvedValue(true);
      const res = await request(app)
        .post("/api/otp/verify")
        .send({ phone: "+15551234567", code: "123456" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
      expect(res.body.message).toBe("Phone verified");
      expect(verifyOtp).toHaveBeenCalledWith("+15551234567", "123456");
    });
  });
});
