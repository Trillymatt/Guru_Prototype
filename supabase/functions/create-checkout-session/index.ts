// ============================================================================
// GURU MOBILE REPAIR SOLUTIONS — Stripe Checkout Session Edge Function
// Creates a Stripe Checkout Session for Apple Pay / Google Pay / card payments.
//
// Uses Stripe's hosted checkout page (checkout.stripe.com), which supports
// Apple Pay and Google Pay automatically — no domain verification required.
//
// SETUP: Same Stripe keys as create-payment-intent. No additional config needed.
//   Deploy: supabase functions deploy create-checkout-session
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const { repair_id, amount, tip_amount, success_url, cancel_url, description } =
      await req.json();

    if (!repair_id || !amount || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: repair_id, amount, success_url, cancel_url" }),
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
        JSON.stringify({ error: "Invalid amount: must be between $0.01 and $10,000" }),
        { status: 400, headers: corsHeaders }
      );
    }
    if (isNaN(parsedTip) || parsedTip < 0 || parsedTip > 1000) {
      return new Response(
        JSON.stringify({ error: "Invalid tip_amount: must be between $0 and $1,000" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const totalCents = Math.round((parsedAmount + parsedTip) * 100);

    if (totalCents < 50) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least $0.50" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const lineItemName = description || "iPhone Repair — Guru Mobile";

    // Build the Checkout Session params
    // payment_method_types: ['card'] automatically includes Apple Pay + Google Pay
    const params = new URLSearchParams({
      mode: "payment",
      success_url,
      cancel_url,
      submit_type: "pay",
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": lineItemName,
      "line_items[0][price_data][unit_amount]": String(totalCents),
      "metadata[repair_id]": repair_id,
      "metadata[tip_amount]": String(parsedTip),
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const stripeData = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe API error:", stripeData);
      return new Response(
        JSON.stringify({
          error: "Failed to create checkout session",
          details: stripeData.error?.message,
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    // Mark repair as payment pending
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase
      .from("repairs")
      .update({
        payment_status: "pending",
        payment_method: "stripe",
        tip_amount: parsedTip,
      })
      .eq("id", repair_id);

    return new Response(
      JSON.stringify({ url: stripeData.url }),
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
