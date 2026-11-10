const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getSmtpTransporter() {
  if (cachedTransporter) return cachedTransporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return cachedTransporter;
}

function buildCredentialsEmailHtml({ fullName, studentId, password, campus, batch, loginUrl }) {
  const safeName = String(fullName || 'Student').replace(/[<>]/g, '');
  const safeId = String(studentId || '').replace(/[<>]/g, '');
  const safePass = String(password || '').replace(/[<>]/g, '');
  const safeCampus = String(campus || '-').replace(/[<>]/g, '');
  const safeBatch = String(batch || '-').replace(/[<>]/g, '');
  const safeUrl = String(loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173');

  return `
    <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a; background: #ffffff;">
      <h2 style="margin: 0 0 8px 0; color: #13315c; font-size: 20px;">Web Development LMS Portal</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px;">Your student account credentials are ready.</p>
      
      <p style="font-size: 14px; line-height: 1.5; margin-bottom: 16px;">Hello <strong>${safeName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
        You have been enrolled in <strong>${safeCampus}</strong> (${safeBatch}). Use the credentials below to sign in to the student portal:
      </p>

      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Student ID:</strong> <code style="font-size: 15px; color: #0f172a;">${safeId}</code></p>
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="font-size: 15px; color: #0f172a;">${safePass}</code></p>
        <p style="margin: 0; font-size: 12px; color: #64748b;">You will be prompted to set a new password when you first sign in.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <a href="${safeUrl}" style="display: inline-block; background: #13315c; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Sign In to Student Portal
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; margin: 0;">
        Portal Link: <a href="${safeUrl}" style="color: #13315c;">${safeUrl}</a>
      </p>
    </div>
  `;
}

/**
 * Sends a single email via Resend API or Nodemailer SMTP.
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error('Invalid recipient email address');
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'LMS Portal <onboarding@resend.dev>';

  // 1. Prefer Resend HTTP API if RESEND_API_KEY is configured (ideal for Vercel serverless)
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Resend API error (${response.status}): ${errBody}`);
    }

    return await response.json();
  }

  // 2. Fallback to Nodemailer SMTP
  const transporter = getSmtpTransporter();
  if (transporter) {
    return await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text,
    });
  }

  throw new Error('Email provider not configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS in environment variables.');
}

async function sendStudentCredentialsEmail({ to, fullName, studentId, password, campus, batch, loginUrl }) {
  const portalUrl = loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  const html = buildCredentialsEmailHtml({ fullName, studentId, password, campus, batch, loginUrl: portalUrl });
  const text = `Hello ${fullName},\n\nYour LMS Student Portal credentials:\nStudent ID: ${studentId}\nTemporary Password: ${password}\nCampus: ${campus || '-'}\nBatch: ${batch || '-'}\nLogin URL: ${portalUrl}\n\nPlease change your password upon first sign-in.`;

  return sendEmail({
    to,
    subject: `Your Student Portal Credentials (${studentId})`,
    html,
    text,
  });
}

module.exports = {
  sendEmail,
  sendStudentCredentialsEmail,
};
