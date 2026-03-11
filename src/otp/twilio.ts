import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Send OTP SMS via Twilio. Phone must be E.164 (e.g. +15551234567).
 */
export async function sendOtpSms(to: string, code: string): Promise<void> {
  if (!client || !fromNumber) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.",
    );
  }
  const body = `Your verification code is: ${code}. It expires in 5 minutes.`;
  await client.messages.create({
    body,
    from: fromNumber,
    to: to,
  });
}

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && fromNumber);
}
