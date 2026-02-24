// ============================================================================
// GURU MOBILE REPAIR SOLUTIONS — Square Payment Link Edge Function
// Creates a Square hosted payment link for QR code payments.
// Location ID is fetched automatically — no manual config needed.
//
// SETUP:
//   1. Set your Square access token as a Supabase secret:
//        supabase secrets set SQUARE_ACCESS_TOKEN=EAAAl...
//
//   2. Add your Square Application ID to packages/technician/.env:
//        VITE_SQUARE_APP_ID=sq0idp-...
//
//   3. Deploy this function:
//        supabase functions deploy create-square-payment-link
//
// KEYS:
//   Use sandbox credentials (sq0atb-...) for testing, production (EAAAl...) for live.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SQUARE_ACCESS_TOKEN = Deno.env.get("SQUARE_ACCESS_TOKEN")!;
// Set SQUARE_SANDBOX=true in Supabase secrets for sandbox mode; remove (or set false) for production
const isSandbox = Deno.env.get("SQUARE_SANDBOX") !== "false";
const SQUARE_API_BASE = isSandbox
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";
const SQUARE_VERSION = "2024-01-18";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
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

  try {
    const { repair_id, amount, tip_amount, redirect_url, description } =
      await req.json();

    if (!repair_id || !amount || !redirect_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: repair_id, amount, redirect_url" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(repair_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid repair_id format" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const parsedAmount = Number(amount);
    const parsedTip = Number(tip_amount || 0);

    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const totalCents = Math.round((parsedAmount + parsedTip) * 100);

    if (totalCents < 100) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least $1.00" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const squareHeaders = {
      Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    };

    // Auto-fetch the location ID — no manual config needed
    const locRes = await fetch(`${SQUARE_API_BASE}/v2/locations`, {
      headers: squareHeaders,
    });
    const locData = await locRes.json();

    if (!locRes.ok || !locData.locations?.length) {
      console.error("Square Locations error:", locData);
      return new Response(
        JSON.stringify({
          error: "Could not retrieve Square location. Check your access token.",
          details: locData.errors?.[0]?.detail,
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    const locationId = locData.locations[0].id;
    const lineItemName = description || "iPhone Repair — Guru Mobile";

    // Create the Square payment link (Quick Pay mode)
    const linkRes = await fetch(
      `${SQUARE_API_BASE}/v2/online-checkout/payment-links`,
      {
        method: "POST",
        headers: squareHeaders,
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          quick_pay: {
            name: lineItemName,
            price_money: {
              amount: totalCents,
              currency: "USD",
            },
            location_id: locationId,
          },
          checkout_options: {
            redirect_url,
            ask_for_shipping_address: false,
          },
        }),
      }
    );

    const linkData = await linkRes.json();

    if (!linkRes.ok) {
      console.error("Square Payment Links error:", linkData);
      return new Response(
        JSON.stringify({
          error: "Failed to create Square payment link",
          details: linkData.errors?.[0]?.detail,
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    const paymentUrl = linkData.payment_link?.url;
    if (!paymentUrl) {
      return new Response(
        JSON.stringify({ error: "No payment URL returned from Square" }),
        { status: 502, headers: corsHeaders }
      );
    }

    // Mark repair as payment pending
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase
      .from("repairs")
      .update({
        payment_status: "pending",
        payment_method: "square",
        tip_amount: parsedTip,
      })
      .eq("id", repair_id);

    return new Response(
      JSON.stringify({ url: paymentUrl }),
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
