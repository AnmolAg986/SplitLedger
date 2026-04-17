import nodemailer from 'nodemailer';

// Ethereal Email provider specifically built for robust local testing without rate limits
let transporter: nodemailer.Transporter | null = null;

const initializeTransporter = async () => {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || '587';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpPort === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      console.log(`[EmailService] ✉️ Real SMTP Mailer initialized. Sending via ${smtpHost}`);
    } else {
      // Ethereal fallback
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.warn(`[EmailService] ⚠️ SMTP variables missing. Using Ethereal Mailer for local testing.`);
    }
  } catch (error) {
    console.error('[EmailService] ❌ Failed to initialize transporter:', error);
  }
};

// Initialize globally on server boot
initializeTransporter();

/**
 * Dispatches the secure 6-digit OTP code to the requested email.
 */
export const sendVerificationEmail = async (to: string, code: string) => {
  if (!transporter) {
    console.error('[EmailService] ⚠️ Transporter not initialized. Dropping email to', to);
    return;
  }

  // Always log OTP to terminal for local development
  console.log(`\n======================================================`);
  console.log(`📧 EMAIL OTP for ${to}: ${code}`);
  console.log(`======================================================\n`);

  try {
    const info = await transporter.sendMail({
      from: '"SplitLedger Security" <noreply@splitledger.dev>',
      to,
      subject: 'Verify your SplitLedger Account',
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; background-color: #0c0c0e; color: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <h2 style="color: #ffffff; margin-bottom: 20px;">Welcome to SplitLedger!</h2>
          <p style="color: #a1a1aa; font-size: 15px; margin-bottom: 30px;">
            Please use the verification code below to securely activate your account. This code holds an active lifespan of 15 minutes.
          </p>
          <div style="background-color: #050505; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 30px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22d3ee;">${code}</span>
          </div>
          <p style="color: #71717a; font-size: 13px;">
            If you did not request this email, please ignore it or report it to us safely.
          </p>
        </div>
      `,
    });

    console.log(`[EmailService] ✉️ OTP sent to ${to}`);
    
    // Only fetch ethereal URL if using ethereal
    if (!process.env.SMTP_HOST) {
      console.log(`[EmailService] 👀 View Email securely: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
  } catch (error) {
    console.error('[EmailService] ❌ Error deploying OTP email:', error);
    throw error;
  }
};
