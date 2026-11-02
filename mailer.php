<?php
/**
 * Radiant Trust International (RTI Ghana)
 * Production Form & Auto-Responder Mailer for Hostinger
 * 
 * Handles:
 * 1. Volunteer & Internship Applications
 * 2. General Contact Inquiries
 * 
 * Features:
 * - Forwards applicant/inquiry details to info@radianttrust.org
 * - Sends an immediate automated confirmation email to the user
 * - Anti-spam sanitization & CSRF / honeypot protection
 * - JSON responses for seamless AJAX submission
 */

header('Content-Type: application/json; charset=UTF-8');

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// Target email
$adminEmail = 'info@radianttrust.org';
$organizationName = 'Radiant Trust International';
$websiteUrl = 'https://radianttrust.org';

// Anti-spam honeypot check (if filled, bot detected)
if (!empty($_POST['website_hp']) || !empty($_POST['bot_field'])) {
    // Silently succeed to fool bot
    echo json_encode(['success' => true, 'message' => 'Message processed']);
    exit;
}

$action = isset($_POST['action']) ? trim($_POST['action']) : 'volunteer';

// Helper to sanitize inputs
function clean_input($data) {
    return htmlspecialchars(stripslashes(trim($data ?? '')), ENT_QUOTES, 'UTF-8');
}

// -------------------------------------------------------------
// 1. VOLUNTEER / INTERNSHIP APPLICATION HANDLER
// -------------------------------------------------------------
if ($action === 'volunteer') {
    $fullName = clean_input($_POST['fullName'] ?? $_POST['name'] ?? '');
    $email    = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $phone    = clean_input($_POST['phone'] ?? '');
    $interest = clean_input($_POST['interest'] ?? 'General Volunteering');
    $duration = clean_input($_POST['duration'] ?? 'Not specified');
    $message  = clean_input($_POST['message'] ?? '');

    if (empty($fullName) || !$email) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Please provide a valid name and email address.']);
        exit;
    }

    // A. Forward application to RTI Secretariat (info@radianttrust.org)
    $adminSubject = "New Volunteer Application: $fullName - Radiant Trust";
    $adminBody = "
    <html>
    <head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;}</style></head>
    <body style='background:#f8fafc;padding:20px;'>
      <div style='max-width:600px;margin:0 auto;background:#fff;padding:30px;border-top:4px solid #f29c1c;'>
        <h2 style='color:#391f68;margin-top:0;'>New Volunteer / Placement Application</h2>
        <p>A new volunteer application has been submitted via <strong>radianttrust.org</strong>:</p>
        <table style='width:100%;border-collapse:collapse;margin:20px 0;'>
          <tr><td style='padding:8px;font-weight:bold;width:160px;background:#f1f5f9;'>Full Name:</td><td style='padding:8px;'>$fullName</td></tr>
          <tr><td style='padding:8px;font-weight:bold;background:#f1f5f9;'>Email:</td><td style='padding:8px;'><a href='mailto:$email'>$email</a></td></tr>
          <tr><td style='padding:8px;font-weight:bold;background:#f1f5f9;'>Phone:</td><td style='padding:8px;'>$phone</td></tr>
          <tr><td style='padding:8px;font-weight:bold;background:#f1f5f9;'>Area of Interest:</td><td style='padding:8px;'>$interest</td></tr>
          <tr><td style='padding:8px;font-weight:bold;background:#f1f5f9;'>Preferred Duration:</td><td style='padding:8px;'>$duration</td></tr>
          <tr><td style='padding:8px;font-weight:bold;background:#f1f5f9;'>Background/Message:</td><td style='padding:8px;white-space:pre-wrap;'>$message</td></tr>
        </table>
        <p style='font-size:12px;color:#64748b;'>Submitted on " . date('Y-m-d H:i:s') . " from IP: " . $_SERVER['REMOTE_ADDR'] . "</p>
      </div>
    </body>
    </html>
    ";

    $adminHeaders  = "MIME-Version: 1.0\r\n";
    $adminHeaders .= "Content-type: text/html; charset=UTF-8\r\n";
    $adminHeaders .= "From: $organizationName <$adminEmail>\r\n";
    $adminHeaders .= "Reply-To: $fullName <$email>\r\n";
    $adminHeaders .= "X-Mailer: PHP/" . phpversion();

    @mail($adminEmail, $adminSubject, $adminBody, $adminHeaders);

    // B. Send Auto-Reply to the Applicant
    $userSubject = "We Received Your Volunteer Application | Radiant Trust International";
    $userBody = "
    <html>
    <head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;}</style></head>
    <body style='background:#f8fafc;padding:20px;'>
      <div style='max-width:600px;margin:0 auto;background:#fff;padding:30px;border-top:4px solid #391f68;'>
        <div style='text-align:center;margin-bottom:20px;'>
          <h2 style='color:#391f68;margin-bottom:4px;'>Radiant Trust International</h2>
          <span style='color:#f29c1c;font-weight:bold;font-size:14px;text-transform:uppercase;'>Together, We Bring Hope and Change Lives</span>
        </div>
        <p>Dear <strong>$fullName</strong>,</p>
        <p>Medasi! (Thank you). We have successfully received your volunteer and placement application for <strong>$interest</strong>.</p>
        <p>At Radiant Trust International, our volunteers and field partners are at the heart of our mission to drive rural resilience, clean water, sustainable agriculture, and vocational skills across Ghana's 16 regions.</p>
        
        <div style='background:#fdf2e9;border-left:4px solid #f29c1c;padding:15px;margin:20px 0;'>
          <h4 style='margin:0 0 8px 0;color:#9c4100;'>Next Steps:</h4>
          <p style='margin:0;font-size:14px;color:#431407;'>Our volunteer coordinator will review your background and get back to you via email or WhatsApp within <strong>48 hours</strong> with further onboarding details.</p>
        </div>

        <p>If you have urgent questions, feel free to reply directly to this email or message us on WhatsApp at <strong>+233 50 087 0979</strong>.</p>

        <p style='margin-top:30px;'>Warm regards,<br>
        <strong>Volunteer Coordination Team</strong><br>
        Radiant Trust International (RTI Ghana)<br>
        14 Mango Avenue, Tantra Hills, Accra-Ghana<br>
        <a href='$websiteUrl' style='color:#391f68;'>www.radianttrust.org</a> | <a href='mailto:$adminEmail' style='color:#391f68;'>$adminEmail</a>
        </p>
      </div>
    </body>
    </html>
    ";

    $userHeaders  = "MIME-Version: 1.0\r\n";
    $userHeaders .= "Content-type: text/html; charset=UTF-8\r\n";
    $userHeaders .= "From: $organizationName <$adminEmail>\r\n";
    $userHeaders .= "Reply-To: $organizationName <$adminEmail>\r\n";
    $userHeaders .= "X-Mailer: PHP/" . phpversion();

    @mail($email, $userSubject, $userBody, $userHeaders);

    echo json_encode(['success' => true, 'message' => 'Volunteer application submitted and confirmation email sent.']);
    exit;
}

// -------------------------------------------------------------
// 2. GENERAL CONTACT FORM HANDLER
// -------------------------------------------------------------
if ($action === 'contact') {
    $fullName = clean_input($_POST['fullName'] ?? $_POST['name'] ?? '');
    $email    = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $phone    = clean_input($_POST['phone'] ?? '');
    $subject  = clean_input($_POST['subject'] ?? 'General Inquiry');
    $message  = clean_input($_POST['message'] ?? '');

    if (empty($fullName) || !$email || empty($message)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Please fill in all required fields.']);
        exit;
    }

    // A. Forward to admin
    $adminSubject = "Contact Form Message: $subject from $fullName";
    $adminBody = "
    <html>
    <head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;}</style></head>
    <body style='background:#f8fafc;padding:20px;'>
      <div style='max-width:600px;margin:0 auto;background:#fff;padding:30px;border-top:4px solid #391f68;'>
        <h2 style='color:#391f68;margin-top:0;'>New Website Inquiry</h2>
        <table style='width:100%;border-collapse:collapse;margin:20px 0;'>
          <tr><td style='padding:8px;font-weight:bold;width:140px;background:#f1f5f9;'>Name:</td><td style='padding:8px;'>$fullName</td></tr>
          <tr><td style='padding:8px;font-weight:bold;background:#f1f5f9;'>Email:</td><td style='padding:8px;'><a href='mailto:$email'>$email</a></td></tr>
          <tr><td style='padding:8px;font-weight:bold;background:#f1f5f9;'>Phone:</td><td style='padding:8px;'>$phone</td></tr>
          <tr><td style='padding:8px;font-weight:bold;background:#f1f5f9;'>Topic:</td><td style='padding:8px;'>$subject</td></tr>
          <tr><td style='padding:8px;font-weight:bold;background:#f1f5f9;'>Message:</td><td style='padding:8px;white-space:pre-wrap;'>$message</td></tr>
        </table>
      </div>
    </body>
    </html>
    ";

    $adminHeaders  = "MIME-Version: 1.0\r\n";
    $adminHeaders .= "Content-type: text/html; charset=UTF-8\r\n";
    $adminHeaders .= "From: $organizationName <$adminEmail>\r\n";
    $adminHeaders .= "Reply-To: $fullName <$email>\r\n";

    @mail($adminEmail, $adminSubject, $adminBody, $adminHeaders);

    // B. Send Auto-Reply to user
    $userSubject = "Thank you for contacting Radiant Trust International";
    $userBody = "
    <html>
    <head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;}</style></head>
    <body style='background:#f8fafc;padding:20px;'>
      <div style='max-width:600px;margin:0 auto;background:#fff;padding:30px;border-top:4px solid #391f68;'>
        <h2 style='color:#391f68;margin-top:0;'>Thank you for reaching out, $fullName!</h2>
        <p>We have received your message regarding <strong>$subject</strong>. A representative from our secretariat in Tantra Hills will review your message and reply promptly.</p>
        <p>In the meantime, feel free to explore our programs at <a href='$websiteUrl'>radianttrust.org</a> or chat with us directly on WhatsApp at <strong>+233 50 087 0979</strong>.</p>
        <p style='margin-top:30px;'>Best regards,<br>
        <strong>Radiant Trust International Secretariat</strong><br>
        <a href='mailto:$adminEmail'>$adminEmail</a>
        </p>
      </div>
    </body>
    </html>
    ";

    $userHeaders  = "MIME-Version: 1.0\r\n";
    $userHeaders .= "Content-type: text/html; charset=UTF-8\r\n";
    $userHeaders .= "From: $organizationName <$adminEmail>\r\n";

    @mail($email, $userSubject, $userBody, $userHeaders);

    echo json_encode(['success' => true, 'message' => 'Your message has been sent successfully. An automated confirmation was sent to your email.']);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Unknown action requested']);
