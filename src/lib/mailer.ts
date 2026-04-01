import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,  // Use a Gmail App Password, NOT your real password
  },
});

interface BanEmailOptions {
  to: string;
  userName: string;
  reason: string;
  itemContext?: string;   // e.g. "Product: Used Laptop" or "Service: Tutoring"
  banDays: number;
  banExpiry: Date;
}

export async function sendBanNotification({ to, userName, reason, itemContext, banDays, banExpiry }: BanEmailOptions) {
  const expiryStr = banExpiry.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 32px 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Account Suspended</h1>
        <p style="color: #fecaca; margin: 8px 0 0; font-size: 13px;">ReCircle Marketplace</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #111827; font-size: 15px; margin: 0 0 16px;">Hi <strong>${userName}</strong>,</p>
        <p style="color: #374151; font-size: 14px; line-height: 1.7; margin: 0 0 20px;">
          Your account has been temporarily suspended from the ReCircle marketplace for violating our community guidelines.
        </p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <p style="color: #991b1b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Ban Details</p>
          <table style="width: 100%; font-size: 13px; color: #374151;">
            <tr><td style="padding: 4px 0; font-weight: 600;">Reason:</td><td style="padding: 4px 0;">${reason}</td></tr>
            ${itemContext ? `<tr><td style="padding: 4px 0; font-weight: 600;">Context:</td><td style="padding: 4px 0;">${itemContext}</td></tr>` : ''}
            <tr><td style="padding: 4px 0; font-weight: 600;">Duration:</td><td style="padding: 4px 0;">${banDays} day${banDays > 1 ? 's' : ''}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: 600;">Access Restored:</td><td style="padding: 4px 0;">${expiryStr}</td></tr>
          </table>
        </div>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
          If you believe this was a mistake, please reply to this email or contact our support team. Your access will be automatically restored on ${expiryStr}.
        </p>
      </div>
      <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} ReCircle · Campus Marketplace</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"ReCircle" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: `Account Suspended for ${banDays} day${banDays > 1 ? 's' : ''} — ReCircle`,
    html,
  });
}
