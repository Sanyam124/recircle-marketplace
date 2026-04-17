import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Primary Transporter (Gmail)
const transporter1 = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Secondary Transporter (Brevo / Sendinblue)
const transporter2 = process.env.SMTP_EMAIL_2 ? nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_EMAIL_2,
    pass: process.env.SMTP_PASSWORD_2, // This will be your generated Brevo API/SMTP Key
  },
}) : null;

// Tertiary Transporter (Resend)
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

import RequestLog from '@/models/RequestLog';

async function sendMailWithActive(options: any) {
  const SiteSettings = (await import('@/models/SiteSettings')).default;
  const settings = await SiteSettings.getSingleton();
  
  let activeSmtp: number;
  if (settings.activeSmtpIndex === 3 && resendClient) {
    activeSmtp = 3;
  } else if (settings.activeSmtpIndex === 2 && transporter2) {
    activeSmtp = 2;
  } else {
    activeSmtp = 1;
  }
  
  // Always use the verified primary email address (SMTP_EMAIL) for the 'from:' field
  const fromEmail = process.env.SMTP_EMAIL;
  
  console.log(`[MAIL] Sending via SMTP ${activeSmtp} (${activeSmtp === 3 ? 'Resend' : activeSmtp === 2 ? 'Brevo' : 'Gmail'}) (From: ${fromEmail})...`);
  
  let result;
  
  if (activeSmtp === 3) {
    // Send via Resend API
    const resendFrom = process.env.RESEND_FROM_EMAIL || `ReCircle <${fromEmail}>`;
    try {
        const { data, error } = await resendClient!.emails.send({
          from: resendFrom,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });

        if (error) {
            console.error('[MAIL] Resend API Error:', error);
            result = { error };
        } else {
            console.log('[MAIL] Resend Success:', data);
            result = { data };
        }
    } catch (err: any) {
        console.error('[MAIL] Resend Exception:', err.message);
        result = { error: err };
    }
  } else {
    // Send via Nodemailer (Gmail or Brevo)
    const transporterToUse = activeSmtp === 2 ? transporter2 : transporter1;
    result = await transporterToUse!.sendMail({
      ...options,
      from: `"ReCircle" <${fromEmail}>`
    });
  }

  // Log exactly which SMTP was used for analytics viewing
  try {
      const now = new Date();
      let log = await RequestLog.findOne({ ip: 'global-system', path: `smtp-${activeSmtp}-usage` });
      if (!log) {
          await RequestLog.create({ ip: 'global-system', path: `smtp-${activeSmtp}-usage`, count: 1, lastRequest: now });
      } else {
          // If in new 24h window, reset, else increment
          if (now.getTime() - new Date(log.lastRequest).getTime() > 24 * 60 * 60 * 1000) {
              log.count = 1;
          } else {
              log.count += 1;
          }
          log.lastRequest = now;
          await log.save();
      }
      
      // Permanent historical log for graphs
      try {
          const SmtpUsage = (await import('@/models/SmtpUsage')).default;
          const dateId = now.toISOString().split('T')[0];
          const incField = activeSmtp === 1 ? 'smtp1' : activeSmtp === 2 ? 'smtp2' : 'smtp3';
          await SmtpUsage.findOneAndUpdate(
              { dateId },
              { $inc: { [incField]: 1 } },
              { upsert: true }
          );
      } catch(err) {}

  } catch (logErr) {
      console.error('[MAIL] Failed to log SMTP analytics', logErr);
  }

  return result;
}

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

  await sendMailWithActive({
    to,
    subject: `Account Suspended for ${banDays} day${banDays > 1 ? 's' : ''} — ReCircle`,
    html,
  });
}
export async function sendOtpEmail(to: string, otp: string) {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800;">ReCircle</h1>
            <p style="color: #c7d2fe; margin: 8px 0 0; font-size: 13px;">Campus Marketplace</p>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 24px;">Your verification code is:</p>
            <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 0 0 24px; letter-spacing: 8px;">
                <span style="font-size: 36px; font-weight: 900; color: #111827;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 12px; margin: 0;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
        <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} ReCircle · Campus Marketplace</p>
        </div>
    </div>
  `;

  await sendMailWithActive({
    to,
    subject: `${otp} is your ReCircle verification code`,
    html,
  });
}
