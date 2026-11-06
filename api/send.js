const nodemailer = require('nodemailer');

const ALLOWED_ORIGINS = [
  'https://www.radianttrust.org',
  'https://radianttrust.org'
];

const EMAIL_REGEX = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

// Best-effort in-memory rate limit (per warm serverless instance)
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateBuckets = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const hits = (rateBuckets.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  rateBuckets.set(key, hits);
  if (rateBuckets.size > 1000) {
    for (const [k, v] of rateBuckets) {
      if (!v.some((t) => now - t < RATE_LIMIT_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return hits.length > RATE_LIMIT_MAX;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Tagged template: HTML-escapes every interpolated value
function safeHtml(strings, ...values) {
  return strings.reduce(
    (out, s, i) => out + s + (i < values.length ? escapeHtml(values[i]) : ''),
    ''
  );
}

// Single-line header values: strip CR/LF and other control chars, cap length
function cleanLine(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/["<>]/g, '')
    .trim()
    .slice(0, max);
}

// Multi-line free text: keep newlines, drop other control chars, cap length
function cleanText(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}

/**
 * Vercel Serverless Function: Official Hostinger SMTP Mailer
 * Sends emails directly from info@radianttrust.org with authentic
 * sender display name: "Radiant Trust International" <info@radianttrust.org>
 */
module.exports = async function handler(req, res) {
  // CORS: only allow our own origins
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  }

  // Get credentials from Vercel Environment Variables
  const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER || 'info@radianttrust.org';
  const smtpPass = process.env.SMTP_PASS || process.env.HOSTINGER_EMAIL_PASS;

  if (!smtpPass) {
    console.warn('SMTP_PASS is not set in Vercel Environment Variables.');
    return res.status(500).json({
      success: false,
      missingConfig: true,
      error: 'Mail service is not configured.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      // Keep as string
    }
  }

  const input = body && typeof body === 'object' ? body : {};

  // Honeypot: silently succeed for bots
  if (input.website_hp || input.bot_field) {
    return res.status(200).json({ success: true, message: 'Message processed' });
  }

  const action = cleanLine(input.action || 'volunteer', 20);
  const name = cleanLine(input.name, 100);
  const email = cleanLine(input.email, 120);
  const phone = cleanLine(input.phone, 30);
  const region = cleanLine(input.region || 'Not Specified', 60);
  const sector = cleanLine(input.sector || 'General Volunteering', 100);
  const availability = cleanLine(input.availability || 'Flexible', 80);
  const topic = cleanLine(input.topic || 'General Inquiry', 120);
  const message = cleanText(input.message, 2500);

  if (!email || !name) {
    return res.status(400).json({ success: false, error: 'Name and email are required.' });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
  }

  try {
    // Configure Hostinger SMTP Transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for 587
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const orgDisplayName = 'Radiant Trust International';
    const orgEmail = 'info@radianttrust.org';
    const websiteUrl = 'https://radianttrust.org';

    // -------------------------------------------------------------
    // 1. VOLUNTEER FORM
    // -------------------------------------------------------------
    if (action === 'volunteer') {
      // A. Admin notification email
      const adminMailOptions = {
        from: `"${orgDisplayName}" <${orgEmail}>`,
        to: orgEmail,
        replyTo: `"${name}" <${email}>`,
        subject: `New Volunteer Application: ${name} - Radiant Trust`,
        html: safeHtml`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #334155;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background: #391f68; padding: 24px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Radiant Trust International</h2>
              <p style="color: #f29c1c; margin: 6px 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Volunteer & Placement Secretariat</p>
            </div>
            <div style="padding: 28px;">
              <h3 style="color: #391f68; margin-top: 0; font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">New Volunteer Application Details</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr><td style="padding: 10px; background: #f8fafc; font-weight: bold; width: 150px; border-bottom: 1px solid #edf2f7;">Full Name:</td><td style="padding: 10px; border-bottom: 1px solid #edf2f7;">${name}</td></tr>
                <tr><td style="padding: 10px; background: #f8fafc; font-weight: bold; border-bottom: 1px solid #edf2f7;">Email:</td><td style="padding: 10px; border-bottom: 1px solid #edf2f7;"><a href="mailto:${email}" style="color: #391f68;">${email}</a></td></tr>
                <tr><td style="padding: 10px; background: #f8fafc; font-weight: bold; border-bottom: 1px solid #edf2f7;">Phone / WhatsApp:</td><td style="padding: 10px; border-bottom: 1px solid #edf2f7;"><a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" style="color: #16a34a; font-weight: bold;">${phone}</a></td></tr>
                <tr><td style="padding: 10px; background: #f8fafc; font-weight: bold; border-bottom: 1px solid #edf2f7;">Region:</td><td style="padding: 10px; border-bottom: 1px solid #edf2f7;">${region}</td></tr>
                <tr><td style="padding: 10px; background: #f8fafc; font-weight: bold; border-bottom: 1px solid #edf2f7;">Impact Sector:</td><td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #f29c1c; font-weight: bold;">${sector}</td></tr>
                <tr><td style="padding: 10px; background: #f8fafc; font-weight: bold; border-bottom: 1px solid #edf2f7;">Availability:</td><td style="padding: 10px; border-bottom: 1px solid #edf2f7;">${availability}</td></tr>
                <tr><td style="padding: 10px; background: #f8fafc; font-weight: bold; border-bottom: 1px solid #edf2f7;">Background / Notes:</td><td style="padding: 10px; border-bottom: 1px solid #edf2f7; white-space: pre-wrap;">${message || 'None provided'}</td></tr>
              </table>
              <div style="margin-top: 24px; padding: 14px; background: #f1f5f9; border-radius: 6px; font-size: 12px; color: #64748b; text-align: center;">
                Application received via radianttrust.org • Click "Reply" to respond directly to ${name}.
              </div>
            </div>
          </div>
        </body>
        </html>
        `
      };

      // B. Auto-Reply directly to Volunteer
      const volunteerAutoReply = {
        from: `"${orgDisplayName}" <${orgEmail}>`,
        to: email,
        replyTo: `"${orgDisplayName}" <${orgEmail}>`,
        subject: `We Received Your Volunteer Application | Radiant Trust International`,
        html: safeHtml`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #334155; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #391f68 0%, #58398e 100%); padding: 32px 24px; text-align: center; border-bottom: 4px solid #f29c1c;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">Radiant Trust International</h1>
              <p style="color: #f29c1c; margin: 8px 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px;">Together, We Bring Hope and Change Lives</p>
            </div>
            <div style="padding: 32px 28px;">
              <p style="font-size: 16px; margin-top: 0;">Dear <strong>${name}</strong>,</p>
              <p style="font-size: 15px; color: #475569;">
                <strong>Medasi! (Thank you).</strong> We have successfully received your volunteer and placement application for <strong>${sector}</strong> in <strong>${region}</strong>.
              </p>
              <p style="font-size: 15px; color: #475569;">
                At Radiant Trust International, our volunteers and field fellows are at the heart of our mission to drive rural resilience, clean water boreholes, sustainable agriculture, and vocational skills across Ghana's 16 regions.
              </p>
              <div style="background: #fff8ee; border-left: 4px solid #f29c1c; padding: 18px 20px; border-radius: 0 6px 6px 0; margin: 24px 0;">
                <h4 style="margin: 0 0 6px; color: #c2760a; font-size: 15px;">Next Steps:</h4>
                <p style="margin: 0; font-size: 14px; color: #78350f;">
                  Our volunteer coordination secretariat in Tantra Hills will review your profile and reach out via email or WhatsApp within <strong>48 hours</strong> with onboarding details.
                </p>
              </div>
              <p style="font-size: 14px; color: #475569;">
                If you have urgent questions, feel free to reply directly to this email or message us on WhatsApp at <strong>+233 50 087 0979</strong>.
              </p>
              <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
                <strong style="color: #391f68; font-size: 14px;">Radiant Trust International Secretariat</strong><br>
                14 Mango Avenue, Tantra Hills, Accra-Ghana<br>
                WhatsApp: <a href="https://wa.me/233500870979" style="color: #391f68; font-weight: bold;">+233 50 087 0979</a> | Direct: +233 30 290 9237<br>
                Website: <a href="${websiteUrl}" style="color: #f29c1c; font-weight: bold; text-decoration: none;">www.radianttrust.org</a>
              </div>
            </div>
          </div>
        </body>
        </html>
        `
      };

      await transporter.sendMail(adminMailOptions);
      await transporter.sendMail(volunteerAutoReply);

      return res.status(200).json({
        success: true,
        message: 'Application delivered to Secretariat and automated reply sent from info@radianttrust.org'
      });
    }

    // -------------------------------------------------------------
    // 2. CONTACT FORM
    // -------------------------------------------------------------
    if (action === 'contact') {
      const adminMailOptions = {
        from: `"${orgDisplayName}" <${orgEmail}>`,
        to: orgEmail,
        replyTo: `"${name}" <${email}>`,
        subject: `Website Inquiry: ${topic} from ${name}`,
        html: safeHtml`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #334155;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: #391f68; padding: 20px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0;">New Contact Form Message</h2>
            </div>
            <div style="padding: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; font-weight: bold; width: 140px; background: #f8fafc;">From:</td><td style="padding: 8px;">${name}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold; background: #f8fafc;">Email:</td><td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td></tr>
                <tr><td style="padding: 8px; font-weight: bold; background: #f8fafc;">Phone:</td><td style="padding: 8px;">${phone || 'N/A'}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold; background: #f8fafc;">Topic:</td><td style="padding: 8px; font-weight: bold; color: #f29c1c;">${topic}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold; background: #f8fafc;">Message:</td><td style="padding: 8px; white-space: pre-wrap;">${message}</td></tr>
              </table>
            </div>
          </div>
        </body>
        </html>
        `
      };

      const contactAutoReply = {
        from: `"${orgDisplayName}" <${orgEmail}>`,
        to: email,
        replyTo: `"${orgDisplayName}" <${orgEmail}>`,
        subject: `Thank you for contacting Radiant Trust International`,
        html: safeHtml`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #334155; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: #391f68; padding: 28px; text-align: center; border-bottom: 4px solid #f29c1c;">
              <h2 style="color: #ffffff; margin: 0;">Radiant Trust International</h2>
              <p style="color: #f29c1c; margin: 6px 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Grassroots Transformation Across Ghana</p>
            </div>
            <div style="padding: 28px;">
              <p style="margin-top: 0;">Hello <strong>${name}</strong>,</p>
              <p>Thank you for reaching out to us regarding <strong>${topic}</strong>. We have safely received your inquiry.</p>
              <p>A representative from our secretariat in Tantra Hills, Accra will review your message and reply promptly within 24 business hours.</p>
              <p>If you require immediate assistance, feel free to contact us on WhatsApp at <strong>+233 50 087 0979</strong>.</p>
              <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
                <strong>Radiant Trust International Secretariat</strong><br>
                14 Mango Avenue, Tantra Hills, Accra-Ghana<br>
                <a href="${websiteUrl}" style="color: #391f68;">www.radianttrust.org</a> | <a href="mailto:${orgEmail}" style="color: #391f68;">${orgEmail}</a>
              </div>
            </div>
          </div>
        </body>
        </html>
        `
      };

      await transporter.sendMail(adminMailOptions);
      await transporter.sendMail(contactAutoReply);

      return res.status(200).json({
        success: true,
        message: 'Message delivered to Secretariat and confirmation sent from info@radianttrust.org'
      });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error('SMTP sending error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again later.'
    });
  }
};
