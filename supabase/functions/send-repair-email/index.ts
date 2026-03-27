// ============================================================================
// SEER MOBILE REPAIR SOLUTIONS — Email Notification Edge Function
// Sends professional transactional emails via Resend for repair lifecycle events.
//
// Handles 12 email types:
//   1. repair_confirmed    — When a repair is first created (booking confirmation)
//   2. repair_accepted     — When status moves to 'confirmed' (admin/tech accepted)
//   3. parts_ordered       — When parts are ordered for the repair
//   4. parts_received      — When parts arrive and repair is nearly ready
//   5. repair_scheduled    — When status moves to 'scheduled' (in-stock flow)
//   6. day_of_reminder     — Morning of the scheduled repair date (via pg_cron)
//   7. tech_en_route       — Technician is driving to the customer
//   8. tech_arrived        — Technician has arrived at the location
//   9. repair_in_progress  — Technician started the repair
//  10. repair_complete     — Repair finished successfully
//  11. review_request      — Post-service survey (sent ~2 hrs after completion)
//  12. invoice_ready       — Payment received; invoice link emailed to customer
//
// SETUP:
//   1. Create a free Resend account at https://resend.com
//   2. Add & verify your sending domain in Resend
//   3. Set secrets:
//        supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
//        supabase secrets set FROM_EMAIL="SEER Mobile Repair <repairs@yourdomain.com>"
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
  "SEER Mobile Repair <noreply@seermobilerepair.com>";
const APP_URL = Deno.env.get("APP_URL") || "https://seermobilerepair.com";
const SURVEY_URL =
  Deno.env.get("SURVEY_URL") || "https://seermobilerepair.com/review";

// ─── EMAIL_THEME — Design tokens from packages/shared/src/theme.css ─────────
// Single source of truth for email styling. Mirrors the SEER design system.

const EMAIL_THEME = {
  // Brand colors (SEER Platinum palette)
  brand: {
    primary: "#1e1f2e",      // --seer-platinum-900 (header bg)
    secondary: "#525462",    // --seer-platinum-700
    accent: "#06b6d4",       // --seer-accent-500 (CTA buttons, links)
    accentDark: "#0891b2",   // --seer-accent-600 (hover/dark CTA)
    accentLight: "#ecfeff",  // --seer-accent-50  (accent highlight bg)
  },
  // Neutral / text colors
  text: {
    primary: "#1e1f2e",      // --seer-platinum-900
    secondary: "#6e707e",    // --seer-platinum-600
    muted: "#8b8d9a",       // --seer-platinum-500
    light: "#a8aab6",       // --seer-platinum-400
  },
  // Surface / background colors
  surface: {
    page: "#f0f0f2",        // --seer-platinum-100 (email outer bg)
    card: "#ffffff",         // --seer-white (email container bg)
    detailCard: "#f0f0f2",  // --seer-platinum-100
    border: "#e0e1e6",      // --seer-platinum-200
    footer: "#f0f0f2",      // --seer-platinum-100
  },
  // Status colors
  status: {
    success: "#34C759",
    successBg: "#F0FAF0",
    warning: "#FF9500",
    warningBg: "#FFF8F0",
    info: "#06b6d4",         // --seer-accent-500
    infoBg: "#ecfeff",       // --seer-accent-50
  },
  // Layout
  radius: {
    card: "12px",
    button: "12px",
    badge: "20px",
    container: "16px",
  },
} as const;

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
<td style="padding:10px 0;border-bottom:1px solid ${EMAIL_THEME.surface.border};font-size:14px;color:${EMAIL_THEME.text.muted};width:40%;">${label}</td>
<td style="padding:10px 0;border-bottom:1px solid ${EMAIL_THEME.surface.border};font-size:14px;color:${EMAIL_THEME.text.primary};font-weight:600;text-align:right;">${value}</td>
</tr>`;
}

function totalRow(label: string, value: string, color = EMAIL_THEME.text.primary): string {
  return `<tr>
<td style="padding:14px 0 0;font-size:16px;color:${EMAIL_THEME.text.primary};font-weight:700;">${label}</td>
<td style="padding:14px 0 0;font-size:16px;color:${color};font-weight:700;text-align:right;">${value}</td>
</tr>`;
}

function detailCard(title: string, rows: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${EMAIL_THEME.surface.detailCard};border-radius:${EMAIL_THEME.radius.card};margin:24px 0;">
<tr><td style="padding:24px;">
<p style="font-size:11px;font-weight:700;color:${EMAIL_THEME.text.muted};text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">${title}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${rows}
</table>
</td></tr>
</table>`;
}

function ctaButton(
  text: string,
  url: string,
  bgColor = EMAIL_THEME.brand.accent
): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0;">
<tr><td align="center">
<a href="${url}" target="_blank" style="display:inline-block;background-color:${bgColor};color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:${EMAIL_THEME.radius.button};font-size:16px;font-weight:600;letter-spacing:0.3px;mso-padding-alt:0;text-underline-color:${bgColor};">
<!--[if mso]><i style="mso-font-width:150%;mso-text-raise:27pt" hidden>&emsp;</i><![endif]-->
<span style="mso-text-raise:13.5pt;">${text}</span>
<!--[if mso]><i hidden style="mso-font-width:150%;">&emsp;&#8203;</i><![endif]-->
</a>
</td></tr>
</table>`;
}

function highlightBox(
  text: string,
  borderColor = EMAIL_THEME.status.success,
  bgColor = EMAIL_THEME.status.successBg
): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;">
<tr><td style="background-color:${bgColor};border-left:4px solid ${borderColor};padding:16px 20px;border-radius:0 8px 8px 0;">
<p style="margin:0;font-size:14px;color:${EMAIL_THEME.text.primary};line-height:1.6;">${text}</p>
</td></tr>
</table>`;
}

function statusBadge(label: string, color: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
<tr><td style="background-color:${color};color:#FFFFFF;padding:5px 14px;border-radius:${EMAIL_THEME.radius.badge};font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">${label}</td></tr>
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
<title>SEER Mobile Repair</title>
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
<body style="margin:0;padding:0;background-color:${EMAIL_THEME.surface.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

<!-- Preheader (hidden preview text) -->
<div style="display:none;font-size:1px;color:${EMAIL_THEME.surface.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
${preheader}${"&nbsp;&zwnj;".repeat(30)}
</div>

<!-- Email Wrapper -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${EMAIL_THEME.surface.page};">
<tr><td align="center" style="padding:40px 16px;">

<!-- Email Container -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width:600px;background-color:${EMAIL_THEME.surface.card};border-radius:${EMAIL_THEME.radius.container};overflow:hidden;">

<!-- ─── Header ─── -->
<tr>
<td class="header-cell" align="center" style="background-color:${EMAIL_THEME.brand.primary};padding:32px 40px;">
<h1 style="color:#FFFFFF;font-size:28px;font-weight:700;margin:0;letter-spacing:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">SEER</h1>
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
<td class="footer-cell" align="center" style="background-color:${EMAIL_THEME.surface.footer};padding:28px 40px;border-top:1px solid ${EMAIL_THEME.surface.border};">
<p style="font-size:13px;color:${EMAIL_THEME.text.primary};margin:0 0 4px;font-weight:600;">SEER Mobile Repair Solutions</p>
<p style="font-size:12px;color:${EMAIL_THEME.text.muted};margin:0 0 16px;">Professional iPhone repair at your doorstep</p>
<p style="font-size:12px;margin:0 0 4px;">
<a href="mailto:support@seermobilerepair.com" style="color:${EMAIL_THEME.brand.accent};text-decoration:none;">support@seermobilerepair.com</a>
</p>
<p style="margin-top:16px;font-size:11px;color:${EMAIL_THEME.text.light};">
&copy; ${year} SEER Mobile Repair Solutions. All rights reserved.
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
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">Great news — your repair request has been received and confirmed. Here's a summary of your order.</p>

${statusBadge("Confirmed", EMAIL_THEME.status.success)}

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
    totalRow("Total Estimate", formatCurrency(data.total_estimate), EMAIL_THEME.brand.accent)
)}

${highlightBox(
  "<strong>What happens next?</strong><br>Our team will review your repair and begin sourcing parts. You'll receive email updates at every step — when parts arrive, when your technician is en route, and when the repair is complete.",
  EMAIL_THEME.brand.accent,
  EMAIL_THEME.status.infoBg
)}

${ctaButton("View Your Repair", `${APP_URL}/repair/${data.repair_id}`)}

<p style="font-size:13px;color:${EMAIL_THEME.text.muted};line-height:1.6;margin:0;">Questions? Reply to this email or reach out to our support team anytime. We're here to help!</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `Your ${data.device} repair has been confirmed for ${formatDate(data.schedule_date)}. Order #${orderId}`
    ),
  };
}

// ─── 2. Repair Accepted (status → confirmed) ─────────────────────────────────

function repairAccepted(data: any): { subject: string; html: string } {
  const orderId = (data.repair_id || "").slice(-8).toUpperCase();
  const subject = `Your Repair Has Been Accepted — #${orderId}`;

  const content = `
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">Good news — a technician has reviewed your repair request and confirmed they can help. We're now working on getting everything ready for your appointment.</p>

${statusBadge("Accepted", EMAIL_THEME.status.success)}

${detailCard(
  "Repair Details",
  detailRow("Order", `#${orderId}`) +
    detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues)) +
    detailRow("Scheduled", formatDate(data.schedule_date)) +
    detailRow("Time Window", data.schedule_time || "TBD") +
    detailRow("Location", data.address || "TBD") +
    detailRow("Technician", data.technician_name || "To be assigned")
)}

${highlightBox(
  "<strong>What's next?</strong><br>We're now sourcing the parts needed for your repair. You'll receive an update once parts have been ordered, and another when they arrive — so you always know where things stand.",
  EMAIL_THEME.status.success,
  EMAIL_THEME.status.successBg
)}

${ctaButton("View Your Repair", `${APP_URL}/repair/${data.repair_id}`)}

<p style="font-size:13px;color:${EMAIL_THEME.text.muted};line-height:1.6;margin:0;">Questions? Contact our support team anytime and we'll be happy to help.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `Your ${data.device} repair has been accepted. We're sourcing parts now.`
    ),
  };
}

// ─── 3. Parts Ordered (status → parts_ordered) ────────────────────────────────

function partsOrdered(data: any): { subject: string; html: string } {
  const orderId = (data.repair_id || "").slice(-8).toUpperCase();
  const subject = `Parts Ordered for Your Repair — #${orderId}`;

  const content = `
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">We've placed an order for the parts needed to fix your <strong style="color:${EMAIL_THEME.text.primary};">${data.device || "device"}</strong>. Parts typically arrive within 1–3 business days.</p>

${statusBadge("Parts Ordered", EMAIL_THEME.status.warning)}

${detailCard(
  "Repair Details",
  detailRow("Order", `#${orderId}`) +
    detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues)) +
    detailRow("Scheduled", formatDate(data.schedule_date)) +
    detailRow("Time Window", data.schedule_time || "TBD") +
    detailRow("Location", data.address || "TBD")
)}

${highlightBox(
  "<strong>Parts on the way!</strong><br>We'll send you another update as soon as your parts arrive. Once we have everything in hand, your technician will be ready to complete your repair on the scheduled date.",
  EMAIL_THEME.status.warning,
  EMAIL_THEME.status.warningBg
)}

${ctaButton("View Your Repair", `${APP_URL}/repair/${data.repair_id}`)}

<p style="font-size:13px;color:${EMAIL_THEME.text.muted};line-height:1.6;margin:0;">If your scheduled date needs to change, please reach out to our team as soon as possible.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `Parts have been ordered for your ${data.device} repair. Estimated arrival: 1–3 business days.`
    ),
  };
}

// ─── 4. Parts Received (status → parts_received) ──────────────────────────────

function partsReceived(data: any): { subject: string; html: string } {
  const orderId = (data.repair_id || "").slice(-8).toUpperCase();
  const subject = `Parts Arrived — Your Repair Is Almost Ready!`;

  const content = `
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">Great news — the parts for your <strong style="color:${EMAIL_THEME.text.primary};">${data.device || "device"}</strong> repair have arrived. Your technician is fully stocked and ready to go on your scheduled date!</p>

${statusBadge("Parts Received", EMAIL_THEME.status.success)}

${detailCard(
  "Your Upcoming Appointment",
  detailRow("Order", `#${orderId}`) +
    detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues)) +
    detailRow("Scheduled", formatDate(data.schedule_date)) +
    detailRow("Time Window", data.schedule_time || "TBD") +
    detailRow("Location", data.address || "TBD") +
    detailRow("Technician", data.technician_name || "To be assigned")
)}

${highlightBox(
  `<strong>You're all set!</strong><br>
&#8226;&nbsp; Back up your device data before the appointment<br>
&#8226;&nbsp; Have your device passcode ready for the technician<br>
&#8226;&nbsp; Make sure the repair location is accessible on the day`,
  EMAIL_THEME.status.success,
  EMAIL_THEME.status.successBg
)}

${ctaButton("View Repair Details", `${APP_URL}/repair/${data.repair_id}`)}

<p style="font-size:13px;color:${EMAIL_THEME.text.muted};line-height:1.6;margin:0;">Need to adjust your appointment? Contact us soon so we can accommodate your request.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `Parts for your ${data.device} repair have arrived! Your appointment is locked in.`
    ),
  };
}

// ─── 5. Repair Scheduled (status → scheduled) ─────────────────────────────────

function repairScheduled(data: any): { subject: string; html: string } {
  const orderId = (data.repair_id || "").slice(-8).toUpperCase();
  const subject = `Your Repair Is Scheduled — #${orderId}`;

  const content = `
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">Your repair appointment is officially scheduled. A technician is assigned and will be at your location during the time window below.</p>

${statusBadge("Scheduled", EMAIL_THEME.brand.accent)}

${detailCard(
  "Appointment Details",
  detailRow("Order", `#${orderId}`) +
    detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues)) +
    detailRow("Date", formatDate(data.schedule_date)) +
    detailRow("Time Window", data.schedule_time || "TBD") +
    detailRow("Location", data.address || "TBD") +
    detailRow("Technician", data.technician_name || "To be assigned")
)}

${highlightBox(
  `<strong>Before your appointment:</strong><br>
&#8226;&nbsp; Back up any important data on your device<br>
&#8226;&nbsp; Have your device passcode available<br>
&#8226;&nbsp; Ensure someone is available at the repair location`,
  EMAIL_THEME.brand.accent,
  EMAIL_THEME.status.infoBg
)}

${ctaButton("View Repair Details", `${APP_URL}/repair/${data.repair_id}`)}

<p style="font-size:13px;color:${EMAIL_THEME.text.muted};line-height:1.6;margin:0;">You'll receive a reminder the morning of your appointment and a notification when your technician is on the way.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `Your ${data.device} repair is scheduled for ${formatDate(data.schedule_date)} — ${data.schedule_time || "your time window"}.`
    ),
  };
}

// ─── 6. Repair In Progress (status → in_progress) ────────────────────────────

function repairInProgress(data: any): { subject: string; html: string } {
  const subject = "Repair In Progress — We're Working on Your Device";

  const content = `
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">Your technician <strong style="color:${EMAIL_THEME.text.primary};">${data.technician_name}</strong> has started working on your <strong style="color:${EMAIL_THEME.text.primary};">${data.device || "device"}</strong>. We'll let you know as soon as it's ready.</p>

${statusBadge("In Progress", EMAIL_THEME.status.warning)}

${detailCard(
  "Repair Details",
  detailRow("Technician", data.technician_name || "N/A") +
    detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues)) +
    detailRow("Location", data.address || "N/A")
)}

${highlightBox(
  "Your repair is underway. Most repairs take under an hour. You can use the in-app chat to communicate with your technician at any time.",
  EMAIL_THEME.status.warning,
  EMAIL_THEME.status.warningBg
)}

${ctaButton("Open Chat", `${APP_URL}/repair/${data.repair_id}`)}

<p style="font-size:13px;color:${EMAIL_THEME.text.muted};line-height:1.6;margin:0;">You'll receive a confirmation email the moment your repair is complete.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `${data.technician_name} is actively repairing your ${data.device}. Estimated time: under 1 hour.`
    ),
  };
}

// ─── 7. Day-of Reminder ──────────────────────────────────────────────────────

function dayOfReminder(data: any): { subject: string; html: string } {
  const subject = "Reminder: Your Repair Is Today!";

  const content = `
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">Just a friendly reminder — your repair is scheduled for <strong style="color:${EMAIL_THEME.text.primary};">today</strong>. We're looking forward to getting your device fixed up!</p>

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
  EMAIL_THEME.status.warning,
  EMAIL_THEME.status.warningBg
)}

${ctaButton("View Repair Details", `${APP_URL}/repair/${data.repair_id}`)}

<p style="font-size:13px;color:${EMAIL_THEME.text.muted};line-height:1.6;margin:0;">Need to reschedule? Please contact us as soon as possible so we can find a new time that works for you.</p>`;

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
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">Your technician <strong style="color:${EMAIL_THEME.text.primary};">${data.technician_name}</strong> is on the way to your location now.</p>

${statusBadge("En Route", EMAIL_THEME.brand.accent)}

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
  EMAIL_THEME.brand.accent,
  EMAIL_THEME.status.infoBg
)}

${ctaButton("Track Your Repair", `${APP_URL}/repair/${data.repair_id}`)}

<p style="font-size:13px;color:${EMAIL_THEME.text.muted};line-height:1.6;margin:0;">You'll receive another notification the moment your technician arrives. You can also follow the status in real time from your dashboard.</p>`;

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
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">Your technician <strong style="color:${EMAIL_THEME.text.primary};">${data.technician_name}</strong> has arrived at your location and is ready to begin.</p>

${statusBadge("Arrived", EMAIL_THEME.status.success)}

${detailCard(
  "Service Details",
  detailRow("Technician", data.technician_name) +
    detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues))
)}

${highlightBox(
  "Your repair is about to begin. Please hand over your device to the technician when you're ready. They'll keep you updated throughout the entire process.",
  EMAIL_THEME.status.success,
  EMAIL_THEME.status.successBg
)}

<p style="font-size:14px;color:${EMAIL_THEME.text.secondary};line-height:1.6;margin:16px 0 0;">Have a question during the repair? Use the <strong>in-app chat</strong> to message your technician directly.</p>

${ctaButton("Open Chat", `${APP_URL}/repair/${data.repair_id}`)}`;

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
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">Great news — your repair has been completed successfully! Your device should be working like new.</p>

${statusBadge("Complete", EMAIL_THEME.status.success)}

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
    totalRow("Total", formatCurrency(data.total_estimate), EMAIL_THEME.status.success)
)}

${highlightBox(
  "<strong>Warranty Information</strong><br>Your repair is covered by our standard parts warranty. If you experience any issues related to this repair, don't hesitate to reach out — we'll make it right.",
  EMAIL_THEME.status.success,
  EMAIL_THEME.status.successBg
)}

${ctaButton("View Repair Details", `${APP_URL}/repair/${data.repair_id}`)}

<p style="font-size:14px;color:${EMAIL_THEME.text.secondary};line-height:1.6;margin:0;">Thank you for choosing SEER Mobile Repair! We'd love to hear how your experience went — keep an eye out for a quick survey from us.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `Your ${data.device} repair is complete! Thank you for choosing SEER Mobile Repair.`
    ),
  };
}

// ─── 6. Review / Survey Request ──────────────────────────────────────────────

function reviewRequest(data: any): { subject: string; html: string } {
  const subject = "How Was Your Repair Experience?";

  const content = `
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 8px;line-height:1.5;">Thank you for choosing SEER for your <strong style="color:${EMAIL_THEME.text.primary};">${data.device}</strong> repair. We hope everything is working perfectly!</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.primary};margin:0 0 24px;line-height:1.6;">We'd love to hear about your experience. Your feedback helps us improve our service and helps other customers make informed decisions.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${EMAIL_THEME.surface.detailCard};border-radius:${EMAIL_THEME.radius.card};margin:24px 0;text-align:center;">
<tr><td style="padding:32px 24px;">
<p style="font-size:14px;color:${EMAIL_THEME.text.muted};margin:0 0 12px;">How would you rate your experience?</p>
<p style="font-size:40px;margin:0 0 8px;letter-spacing:12px;">&#11088;&#11088;&#11088;&#11088;&#11088;</p>
<p style="font-size:13px;color:${EMAIL_THEME.text.muted};margin:0;">Click below to leave your rating</p>
</td></tr>
</table>

${ctaButton("Leave a Review", `${SURVEY_URL}?repair_id=${data.repair_id}`, EMAIL_THEME.status.warning)}

<p style="font-size:14px;color:${EMAIL_THEME.text.secondary};line-height:1.6;margin:0 0 20px;">It only takes 30 seconds and means the world to our team. Thank you!</p>

<p style="font-size:13px;color:${EMAIL_THEME.text.light};line-height:1.6;margin:0;">If you experienced any issues with your repair, please <a href="mailto:support@seermobilerepair.com" style="color:${EMAIL_THEME.brand.accent};text-decoration:none;">contact our support team</a> directly so we can make it right.</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `We'd love to hear about your ${data.device} repair experience. Leave a quick review!`
    ),
  };
}

// ─── 7. Invoice Ready ────────────────────────────────────────────────────────

function invoiceReady(data: any): { subject: string; html: string } {
  const orderId = (data.repair_id || "").slice(-8).toUpperCase();
  const subject = `Your Invoice — SEER Mobile Repair #${orderId}`;

  const paymentMethodLabels: Record<string, string> = {
    cash: "Cash",
    zelle: "Zelle",
    cashapp: "CashApp",
    venmo: "Venmo",
    split: "Split Payment",
  };
  const paymentMethodLabel = paymentMethodLabels[data.payment_method] || data.payment_method || "Paid";

  const paidDate = data.paid_at
    ? new Date(data.paid_at).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Today";

  const totalEstimate = Number(data.total_estimate || 0);
  const tipAmount = Number(data.tip_amount || 0);
  const totalPaid = totalEstimate + tipAmount;

  const tipRow =
    tipAmount > 0
      ? detailRow("Tip", formatCurrency(tipAmount))
      : "";

  const content = `
<p style="font-size:22px;font-weight:600;color:${EMAIL_THEME.text.primary};margin:0 0 8px;">Hi ${data.customer_name},</p>
<p style="font-size:16px;color:${EMAIL_THEME.text.secondary};margin:0 0 24px;line-height:1.5;">Thank you for your payment! Here is your invoice for the repair services completed on your ${data.device || "device"}.</p>

${statusBadge("Paid", EMAIL_THEME.status.success)}

${detailCard(
  "Invoice Details",
  detailRow("Invoice #", `#${orderId}`) +
    detailRow("Date Paid", paidDate) +
    detailRow("Device", data.device || "N/A") +
    detailRow("Service(s)", formatIssues(data.issues)) +
    detailRow("Payment Method", paymentMethodLabel)
)}

${detailCard(
  "Payment Summary",
  detailRow("Repair Subtotal", formatCurrency(totalEstimate)) +
    tipRow +
    totalRow("Total Paid", formatCurrency(totalPaid), EMAIL_THEME.status.success)
)}

${highlightBox(
  "<strong>Need a copy for your records?</strong><br>Click the button below to view and print your full invoice anytime from your SEER account.",
  EMAIL_THEME.status.success,
  EMAIL_THEME.status.successBg
)}

${ctaButton("View & Print Invoice", `${APP_URL}/invoice/${data.repair_id}`, EMAIL_THEME.status.success)}

<p style="font-size:13px;color:${EMAIL_THEME.text.muted};line-height:1.6;margin:0;">Questions about your invoice? Reply to this email or contact our support team. We're happy to help!</p>`;

  return {
    subject,
    html: wrapEmail(
      content,
      `Your invoice for ${data.device || "your repair"} is ready. Total paid: ${formatCurrency(totalPaid)}.`
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
    case "repair_accepted":
      return repairAccepted(data);
    case "parts_ordered":
      return partsOrdered(data);
    case "parts_received":
      return partsReceived(data);
    case "repair_scheduled":
      return repairScheduled(data);
    case "day_of_reminder":
      return dayOfReminder(data);
    case "tech_en_route":
      return techEnRoute(data);
    case "tech_arrived":
      return techArrived(data);
    case "repair_in_progress":
      return repairInProgress(data);
    case "repair_complete":
      return repairComplete(data);
    case "review_request":
      return reviewRequest(data);
    case "invoice_ready":
      return invoiceReady(data);
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
      "repair_accepted",
      "parts_ordered",
      "parts_received",
      "repair_scheduled",
      "day_of_reminder",
      "tech_en_route",
      "tech_arrived",
      "repair_in_progress",
      "repair_complete",
      "review_request",
      "invoice_ready",
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

    // ── Initialize Supabase client ──
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Check notification preference ──
    // Skip email if the customer has opted out of email notifications.
    // Look up the customer's preference via their email address.
    if (repair_id && !payload.is_retry) {
      const { data: repair } = await supabase
        .from("repairs")
        .select("customer_id")
        .eq("id", repair_id)
        .single();

      if (repair?.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("notification_preference")
          .eq("id", repair.customer_id)
          .single();

        const pref = customer?.notification_preference || "both";
        if (pref === "sms" || pref === "none") {
          console.log(
            `Skipping email for ${email_type}: customer preference is "${pref}"`
          );
          return new Response(
            JSON.stringify({
              skipped: true,
              reason: `Customer notification preference is "${pref}"`,
            }),
            { status: 200, headers: corsHeaders }
          );
        }
      }
    }

    // ── Idempotency guard ──
    // Prevent duplicate sends for the same repair + email_type on the same day.
    if (repair_id) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase
        .from("email_logs")
        .select("id")
        .eq("repair_id", repair_id)
        .eq("email_type", email_type)
        .gte("created_at", `${today}T00:00:00Z`)
        .lt("created_at", `${today}T23:59:59Z`)
        .in("status", ["sent", "queued"])
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(
          `Idempotency: ${email_type} already sent for repair ${repair_id} today`
        );
        return new Response(
          JSON.stringify({
            skipped: true,
            reason: "Duplicate email already sent today",
          }),
          { status: 200, headers: corsHeaders }
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

    // ── Determine retry scheduling on failure ──
    const attemptCount = payload.is_retry
      ? (payload.attempt_count || 1) + 1
      : 1;
    const maxAttempts = 3;
    let nextRetryAt: string | null = null;

    if (!resendRes.ok && attemptCount < maxAttempts) {
      // Exponential backoff: 5^attempt minutes (5 min, 25 min, 125 min)
      const delayMinutes = Math.pow(5, attemptCount);
      const retryDate = new Date(Date.now() + delayMinutes * 60 * 1000);
      nextRetryAt = retryDate.toISOString();
    }

    // ── Log to email_logs table ──
    if (payload.is_retry && payload.retry_log_id) {
      // Update the existing log entry for retries
      await supabase
        .from("email_logs")
        .update({
          status: resendRes.ok ? "sent" : "failed",
          error_message: resendRes.ok ? null : JSON.stringify(resendData),
          resend_id: resendData?.id || null,
          attempt_count: attemptCount,
          next_retry_at: nextRetryAt,
        })
        .eq("id", payload.retry_log_id);
    } else {
      // Insert a new log entry
      await supabase.from("email_logs").insert({
        repair_id: repair_id || null,
        customer_email,
        email_type,
        subject: email.subject,
        status: resendRes.ok ? "sent" : "failed",
        error_message: resendRes.ok ? null : JSON.stringify(resendData),
        resend_id: resendData?.id || null,
        attempt_count: attemptCount,
        max_attempts: maxAttempts,
        next_retry_at: nextRetryAt,
      });
    }

    // ── Return result ──
    if (!resendRes.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: resendData,
          will_retry: nextRetryAt !== null,
          next_retry_at: nextRetryAt,
        }),
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
