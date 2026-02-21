// ============================================================================
// GURU MOBILE REPAIR SOLUTIONS — Email Notification Edge Function
// Sends professional transactional emails via Resend for repair lifecycle events.
//
// Handles 6 email types:
//   1. repair_confirmed  — When a repair is first created
//   2. day_of_reminder   — Morning of the scheduled repair date (via pg_cron)
//   3. tech_en_route     — Technician is driving to the customer
//   4. tech_arrived      — Technician has arrived at the location
//   5. repair_complete   — Repair finished successfully
//   6. review_request    — Post-service survey (sent ~2 hrs after completion)
//
// SETUP:
//   1. Create a free Resend account at https://resend.com
//   2. Add & verify your sending domain in Resend
//   3. Set secrets:
//        supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
//        supabase secrets set FROM_EMAIL="Guru Mobile Repair <repairs@yourdomain.com>"
//        supabase secrets set APP_URL=https://your-customer-app-url.com
//        supabase secrets set SURVEY_URL=https://your-survey-url.com
//   4. Deploy:
//        supabase functions deploy send-repair-email
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Environment Variables ────────────────────────────────────────────────────

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL =
  Deno.env.get("FROM_EMAIL") ||
  "Guru Mobile Repair <noreply@gurumobilerepair.com>";
const APP_URL = Deno.env.get("APP_URL") || "https://gurumobilerepair.com";
const SURVEY_URL =
  Deno.env.get("SURVEY_URL") || "https://gurumobilerepair.com/review";

// ─── Repair Type Display Names ────────────────────────────────────────────────

const REPAIR_TYPE_NAMES: Record<string, string> = {
  screen: "Screen Replacement",
  battery: "Battery Replacement",
  charging: "Charging Port Repair",
  "back-glass": "Back Glass Replacement",
  "camera-rear": "Rear Camera Repair",
  "camera-front": "Front Camera Repair",
  speaker: "Speaker / Microphone Repair",
  "water-damage": "Water Damage Repair",
  buttons: "Button Repair",
  software: "Software Troubleshooting",
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatIssues(issues: unknown): string {
  if (!issues || !Array.isArray(issues) || issues.length === 0)
    return "General Repair";
  return issues
    .map((issue: any) => {
      if (typeof issue === "string")
        return REPAIR_TYPE_NAMES[issue] || issue;
      if (issue?.name) return issue.name;
      if (issue?.id) return REPAIR_TYPE_NAMES[issue.id] || issue.id;
      return String(issue);
    })
    .join(", ");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "To be scheduled";
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "TBD";
  return `$${Number(amount).toFixed(2)}`;
}

// ─── Reusable Email Components ────────────────────────────────────────────────

function detailRow(label: string, value: string): string {
  return `<tr>
<td style="padding:10px 0;border-bottom:1px solid #E5E5EA;font-size:14px;color:#86868B;width:40%;">${label}</td>
<td style="padding:10px 0;border-bottom:1px solid #E5E5EA;font-size:14px;color:#1D1D1F;font-weight:600;text-align:right;">${value}</td>
</tr>`;
}

function totalRow(label: string, value: string, color = "#1D1D1F"): string {
  return `<tr>
<td style="padding:14px 0 0;font-size:16px;color:#1D1D1F;font-weight:700;">${label}</td>
<td style="padding:14px 0 0;font-size:16px;color:${color};font-weight:700;text-align:right;">${value}</td>
</tr>`;
}

function detailCard(title: string, rows: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F5F7;border-radius:12px;margin:24px 0;">
<tr><td style="padding:24px;">
<p style="font-size:11px;font-weight:700;color:#86868B;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">${title}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${rows}
</table>
</td></tr>
</table>`;
}

function ctaButton(
  text: string,
  url: string,
  bgColor = "#0071E3"
): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0;">
<tr><td align="center">
<a href="${url}" target="_blank" style="display:inline-block;background-color:${bgColor};color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:16px;font-weight:600;letter-spacing:0.3px;mso-padding-alt:0;text-underline-color:${bgColor};">
<!--[if mso]><i style="mso-font-width:150%;mso-text-raise:27pt" hidden>&emsp;</i><![endif]-->
<span style="mso-text-raise:13.5pt;">${text}</span>
<!--[if mso]><i hidden style="mso-font-width:150%;">&emsp;&#8203;</i><![endif]-->
</a>
</td></tr>
</table>`;
}

function highlightBox(
  text: string,
  borderColor = "#34C759",
  bgColor = "#F0FAF0"
): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;">
<tr><td style="background-color:${bgColor};border-left:4px solid ${borderColor};padding:16px 20px;border-radius:0 8px 8px 0;">
<p style="margin:0;font-size:14px;color:#1D1D1F;line-height:1.6;">${text}</p>
</td></tr>
</table>`;
}

function statusBadge(label: string, color: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
<tr><td style="background-color:${color};color:#FFFFFF;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">${label}</td></tr>
</table>`;
}

// ─── Base Email Wrapper ───────────────────────────────────────────────────────

function wrapEmail(content: string, preheader: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Guru Mobile Repair</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
  body{margin:0;padding:0;width:100%!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
  @media only screen and (max-width:640px){
    .email-container{width:100%!important;max-width:100%!important}
    .body-cell{padding:24px 20px!important}
    .header-cell{padding:24px 20px!important}
    .footer-cell{padding:20px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

<!-- Preheader (hidden preview text) -->
<div style="display:none;font-size:1px;color:#F5F5F7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
${preheader}${"&nbsp;&zwnj;".repeat(30)}
</div>

<!-- Email Wrapper -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F5F7;">
<tr><td align="center" style="padding:40px 16px;">

<!-- Email Container -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">

<!-- ─── Header ─── -->
<tr>
<td class="header-cell" align="center" style="background-color:#0071E3;padding:32px 40px;">
<h1 style="color:#FFFFFF;font-size:28px;font-weight:700;margin:0;letter-spacing:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">GURU</h1>
<p style="color:rgba(255,255,255,0.8);font-size:11px;margin:8px 0 0;letter-spacing:2px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">Mobile Repair Solutions</p>
</td>
</tr>

<!-- ─── Body ─── -->
<tr>
<td class="body-cell" style="padding:40px;">
${content}
</td>
</tr>

<!-- ─── Footer ─── -->
<tr>
<td class="footer-cell" align="center" style="background-color:#F5F5F7;padding:28px 40px;border-top:1px solid #E5E5EA;">
<p style="font-size:13px;color:#1D1D1F;margin:0 0 4px;font-weight:600;">Guru Mobile Repair Solutions</p>
<p style="font-size:12px;color:#86868B;margin:0 0 16px;">Professional iPhone repair at your doorstep</p>
<p style="font-size:12px;margin:0 0 4px;">
<a href="mailto:support@gurumobilerepair.com" style="color:#0071E3;text-decoration:none;">support@gurumobilerepair.com</a>
</p>
<p style="margin-top:16px;font-size:11px;color:#AEAEB2;">
&copy; ${year} Guru Mobile Repair Solutions. All rights reserved.
</p>
</td>
</tr>

</table>
<!-- /Email Container -->

</td></tr>
</table>
<!-- /Email Wrapper -->

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. Repair Confirmed ─────────────────────────────────────────────────────

function repairConfirmed(data: any): { subject: string; html: string } {
  const orderId = (data.repair_id || "").slice(-8).toUpperCase();
  const subject = `Your Repair Has Been Confirmed — #${orderId}`;

  const partsLabor =
    data.total_estimate && data.service_fee
      ? formatCurrency(Number(data.total_estimate) - Number(data.service_fee))
      : "TBD";

  const content = `
<p style="font-size:22px;font-weight:600;color:#1D1D1F;margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:#6E6E73;margin:0 0 24px;line-height:1.5;">Great news — your repair request has been received and confirmed. Here's a summary of your order.</p>

${statusBadge("Confirmed", "#34C759")}

${detailCard(
  "Repair Details",
  detailRow("Order", `#${orderId}`) +
    detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues)) +
    detailRow("Scheduled", formatDate(data.schedule_date)) +
    detailRow("Time Window", data.schedule_time || "TBD") +
    detailRow("Location", data.address || "TBD")
)}

${detailCard(
  "Cost Estimate",
  detailRow("Parts &amp; Labor", partsLabor) +
    detailRow("Service Fee", formatCurrency(data.service_fee)) +
    totalRow("Total Estimate", formatCurrency(data.total_estimate), "#0071E3")
)}

${highlightBox(
  "<strong>What happens next?</strong><br>Our team will review your repair and begin sourcing parts. You'll receive email updates at every step — when parts arrive, when your technician is en route, and when the repair is complete.",
  "#0071E3",
  "#EBF5FF"
)}

${ctaButton("View Your Repair", `${APP_URL}/repairs/${data.repair_id}`)}

<p style="font-size:13px;color:#86868B;line-height:1.6;margin:0;">Questions? Reply to this email or reach out to our support team anytime. We're here to help!</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `Your ${data.device} repair has been confirmed for ${formatDate(data.schedule_date)}. Order #${orderId}`
    ),
  };
}

// ─── 2. Day-of Reminder ──────────────────────────────────────────────────────

function dayOfReminder(data: any): { subject: string; html: string } {
  const subject = "Reminder: Your Repair Is Today!";

  const content = `
<p style="font-size:22px;font-weight:600;color:#1D1D1F;margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:#6E6E73;margin:0 0 24px;line-height:1.5;">Just a friendly reminder — your repair is scheduled for <strong style="color:#1D1D1F;">today</strong>. We're looking forward to getting your device fixed up!</p>

${detailCard(
  "Today's Appointment",
  detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues)) +
    detailRow("Time Window", data.schedule_time || "TBD") +
    detailRow("Location", data.address || "TBD") +
    detailRow("Technician", data.technician_name || "To be assigned")
)}

${highlightBox(
  `<strong>Quick checklist to prepare:</strong><br>
&#8226;&nbsp; Make sure your device is accessible and powered on (if possible)<br>
&#8226;&nbsp; Back up any important data before the repair<br>
&#8226;&nbsp; Have your device passcode ready for the technician<br>
&#8226;&nbsp; Ensure the repair location is easy to access`,
  "#FF9500",
  "#FFF8F0"
)}

${ctaButton("View Repair Details", `${APP_URL}/repairs/${data.repair_id}`)}

<p style="font-size:13px;color:#86868B;line-height:1.6;margin:0;">Need to reschedule? Please contact us as soon as possible so we can find a new time that works for you.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `Reminder: Your ${data.device} repair is today at ${data.schedule_time || "your scheduled time"}. Be ready!`
    ),
  };
}

// ─── 3. Technician En Route ──────────────────────────────────────────────────

function techEnRoute(data: any): { subject: string; html: string } {
  const subject = "Your Technician Is On the Way!";

  const content = `
<p style="font-size:22px;font-weight:600;color:#1D1D1F;margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:#6E6E73;margin:0 0 24px;line-height:1.5;">Your technician <strong style="color:#1D1D1F;">${data.technician_name}</strong> is on the way to your location now.</p>

${statusBadge("En Route", "#0071E3")}

${detailCard(
  "Appointment Details",
  detailRow("Technician", data.technician_name) +
    detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues)) +
    detailRow("Location", data.address || "N/A")
)}

${highlightBox(
  `<strong>Please make sure:</strong><br>
&#8226;&nbsp; Your repair location is accessible<br>
&#8226;&nbsp; Your device is ready to hand off<br>
&#8226;&nbsp; You or a designated person is available on-site`,
  "#0071E3",
  "#EBF5FF"
)}

${ctaButton("Track Your Repair", `${APP_URL}/repairs/${data.repair_id}`)}

<p style="font-size:13px;color:#86868B;line-height:1.6;margin:0;">You'll receive another notification the moment your technician arrives. You can also follow the status in real time from your dashboard.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `${data.technician_name} is on the way to repair your ${data.device}. Please be ready!`
    ),
  };
}

// ─── 4. Technician Arrived ───────────────────────────────────────────────────

function techArrived(data: any): { subject: string; html: string } {
  const subject = "Your Technician Has Arrived";

  const content = `
<p style="font-size:22px;font-weight:600;color:#1D1D1F;margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:#6E6E73;margin:0 0 24px;line-height:1.5;">Your technician <strong style="color:#1D1D1F;">${data.technician_name}</strong> has arrived at your location and is ready to begin.</p>

${statusBadge("Arrived", "#34C759")}

${detailCard(
  "Service Details",
  detailRow("Technician", data.technician_name) +
    detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues))
)}

${highlightBox(
  "Your repair is about to begin. Please hand over your device to the technician when you're ready. They'll keep you updated throughout the entire process.",
  "#34C759",
  "#F0FAF0"
)}

<p style="font-size:14px;color:#6E6E73;line-height:1.6;margin:16px 0 0;">Have a question during the repair? Use the <strong>in-app chat</strong> to message your technician directly.</p>

${ctaButton("Open Chat", `${APP_URL}/repairs/${data.repair_id}`)}`;

  return {
    subject,
    html: wrapEmail(
      content,
      `${data.technician_name} has arrived and is ready to repair your ${data.device}.`
    ),
  };
}

// ─── 5. Repair Complete ──────────────────────────────────────────────────────

function repairComplete(data: any): { subject: string; html: string } {
  const subject = "Your Repair Is Complete!";

  const partsLabor =
    data.total_estimate && data.service_fee
      ? formatCurrency(Number(data.total_estimate) - Number(data.service_fee))
      : "TBD";

  const content = `
<p style="font-size:22px;font-weight:600;color:#1D1D1F;margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:#6E6E73;margin:0 0 24px;line-height:1.5;">Great news — your repair has been completed successfully! Your device should be working like new.</p>

${statusBadge("Complete", "#34C759")}

${detailCard(
  "Repair Summary",
  detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues)) +
    detailRow("Technician", data.technician_name)
)}

${detailCard(
  "Final Cost",
  detailRow("Parts &amp; Labor", partsLabor) +
    detailRow("Service Fee", formatCurrency(data.service_fee)) +
    totalRow("Total", formatCurrency(data.total_estimate), "#34C759")
)}

${highlightBox(
  "<strong>Warranty Information</strong><br>Your repair is covered by our standard parts warranty. If you experience any issues related to this repair, don't hesitate to reach out — we'll make it right.",
  "#34C759",
  "#F0FAF0"
)}

${ctaButton("View Repair Details", `${APP_URL}/repairs/${data.repair_id}`)}

<p style="font-size:14px;color:#6E6E73;line-height:1.6;margin:0;">Thank you for choosing Guru Mobile Repair Solutions! We'd love to hear how your experience went — keep an eye out for a quick survey from us.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `Your ${data.device} repair is complete! Thank you for choosing Guru Mobile Repair.`
    ),
  };
}

// ─── 6. Review / Survey Request ──────────────────────────────────────────────

function reviewRequest(data: any): { subject: string; html: string } {
  const subject = "How Was Your Repair Experience?";

  const content = `
<p style="font-size:22px;font-weight:600;color:#1D1D1F;margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:#6E6E73;margin:0 0 8px;line-height:1.5;">Thank you for choosing Guru for your <strong style="color:#1D1D1F;">${data.device}</strong> repair. We hope everything is working perfectly!</p>
<p style="font-size:16px;color:#1D1D1F;margin:0 0 24px;line-height:1.6;">We'd love to hear about your experience. Your feedback helps us improve our service and helps other customers make informed decisions.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F5F7;border-radius:12px;margin:24px 0;text-align:center;">
<tr><td style="padding:32px 24px;">
<p style="font-size:14px;color:#86868B;margin:0 0 12px;">How would you rate your experience?</p>
<p style="font-size:40px;margin:0 0 8px;letter-spacing:12px;">&#11088;&#11088;&#11088;&#11088;&#11088;</p>
<p style="font-size:13px;color:#86868B;margin:0;">Click below to leave your rating</p>
</td></tr>
</table>

${ctaButton("Leave a Review", `${SURVEY_URL}?repair_id=${data.repair_id}`, "#FF9500")}

<p style="font-size:14px;color:#6E6E73;line-height:1.6;margin:0 0 20px;">It only takes 30 seconds and means the world to our team. Thank you!</p>

<p style="font-size:13px;color:#AEAEB2;line-height:1.6;margin:0;">If you experienced any issues with your repair, please <a href="mailto:support@gurumobilerepair.com" style="color:#0071E3;text-decoration:none;">contact our support team</a> directly so we can make it right.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `We'd love to hear about your ${data.device} repair experience. Leave a quick review!`
    ),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL ROUTER & MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

type EmailResult = { subject: string; html: string };

function generateEmail(emailType: string, data: any): EmailResult | null {
  switch (emailType) {
    case "repair_confirmed":
      return repairConfirmed(data);
    case "day_of_reminder":
      return dayOfReminder(data);
    case "tech_en_route":
      return techEnRoute(data);
    case "tech_arrived":
      return techArrived(data);
    case "repair_complete":
      return repairComplete(data);
    case "review_request":
      return reviewRequest(data);
    default:
      return null;
  }
}

// ─── Deno.serve Handler ──────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const payload = await req.json();
    const { email_type, customer_email, repair_id } = payload;

    // ── Validate required fields ──
    if (!email_type || !customer_email) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: email_type, customer_email",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ── Validate email_type is a known type ──
    const validEmailTypes = [
      "repair_confirmed",
      "day_of_reminder",
      "tech_en_route",
      "tech_arrived",
      "repair_complete",
      "review_request",
    ];
    if (!validEmailTypes.includes(email_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid email_type: ${email_type}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ── Validate email format ──
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(customer_email) || customer_email.length > 254) {
      return new Response(
        JSON.stringify({ error: "Invalid customer_email format" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ── Validate repair_id format if provided ──
    if (repair_id) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(repair_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid repair_id format" }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // ── Generate the email ──
    const email = generateEmail(email_type, payload);
    if (!email) {
      return new Response(
        JSON.stringify({ error: `Unknown email type: ${email_type}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ── Send via Resend ──
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [customer_email],
        subject: email.subject,
        html: email.html,
      }),
    });

    const resendData = await resendRes.json();

    // ── Log to email_logs table ──
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from("email_logs").insert({
      repair_id: repair_id || null,
      customer_email,
      email_type,
      subject: email.subject,
      status: resendRes.ok ? "sent" : "failed",
      error_message: resendRes.ok ? null : JSON.stringify(resendData),
      resend_id: resendData?.id || null,
    });

    // ── Return result ──
    if (!resendRes.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 502, headers: corsHeaders }
      );
    }

    console.log(
      `Email sent: ${email_type} → ${customer_email} (${resendData.id})`
    );
    return new Response(
      JSON.stringify({ success: true, message_id: resendData.id }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Edge Function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
