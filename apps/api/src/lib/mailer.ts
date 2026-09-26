import nodemailer from "nodemailer";

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(toEmail: string, otp: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user, pass },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"StockSense" <noreply@stocksense.local>',
        to: toEmail,
        subject: "StockSense — Password Reset Verification Code",
        text: `Your password reset code is: ${otp}. It will expire in 10 minutes.\nIf you did not request this, please ignore this email.`,
        html: `
          <div style="font-family: 'Inter', sans-serif; padding: 24px; color: #1A1A1A; max-width: 480px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 4px;">
            <h2 style="font-size: 18px; margin-bottom: 12px; color: #3F3F9E;">StockSense Password Reset</h2>
            <p style="font-size: 14px; color: #6B7280; line-height: 1.5;">You requested a password reset. Use the verification code below to complete your reset:</p>
            <div style="font-size: 28px; font-weight: 600; letter-spacing: 4px; padding: 16px; margin: 20px 0; background-color: #FAFAFA; border: 1px solid #E5E7EB; text-align: center; border-radius: 4px; color: #1A1A1A;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #6B7280;">This code is valid for 10 minutes. If you did not initiate this request, you can safely ignore this email.</p>
          </div>
        `,
      });
      return true;
    } catch (err) {
      console.error("Failed to send OTP email via SMTP:", err);
    }
  }

  // Fallback logger for dev / demo environments
  console.log(`\n======================================================`);
  console.log(`[StockSense Mailer] OTP for ${toEmail}: ${otp}`);
  console.log(`======================================================\n`);
  return true;
}
