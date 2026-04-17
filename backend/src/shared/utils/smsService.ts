import twilio from 'twilio';

let twilioClient: twilio.Twilio | null = null;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

if (accountSid && authToken && twilioNumber) {
  twilioClient = twilio(accountSid, authToken);
  console.log('[SmsService] 📱 Twilio initialized.');
} else {
  console.warn('[SmsService] ⚠️ Twilio credentials missing in .env. SMS will ONLY be logged locally.');
}

/**
 * Sends an OTP via SMS (or logs locally if Twilio isn't fully configured).
 */
export async function sendVerificationSMS(to: string, otp: string) {
  const message = `Your SplitLedger verification code is: ${otp}. Valid for 10 minutes.`;

  if (twilioClient && twilioNumber) {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: twilioNumber,
        to: to
      });
      console.log(`[SmsService] ✅ SMS sent to ${to}. Message SID: ${result.sid}`);
    } catch (err) {
      console.error(`[SmsService] ❌ Failed to send SMS to ${to}:`, err);
      throw new Error('Failed to send SMS');
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`📲 MOCK SMS TO: ${to}`);
    console.log(`Message: ${message}`);
    console.log(`======================================================\n`);
  }
}
