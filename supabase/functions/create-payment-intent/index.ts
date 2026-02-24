// ============================================================================
// GURU MOBILE REPAIR SOLUTIONS — Stripe Payment Intent Edge Function
// Creates a Stripe PaymentIntent for card-based repair payments.
//
// SETUP (one-time, before first card payment):
//   1. Create a Stripe account at https://dashboard.stripe.com
//
//   2. Set the secret key as a Supabase secret:
//        supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxx   # test mode
//        supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxxxxxx   # production
//
//   3. Add the public key to packages/technician/.env:
//        VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxx   # must match the secret key mode
//
//   4. Run the payment migration against your Supabase project:
//        supabase db push  (or apply supabase/migrations/payment_tipping.sql manually)
//
//   5. Deploy this Edge Function:
//        supabase functions deploy create-payment-intent
//
// KEYS:
//   - Use pk_test_ / sk_test_ for development and testing (no real charges)
//   - Use pk_live_ / sk_live_ for production (real charges)
//   - The public key goes in the technician .env; the secret key is a Supabase secret only
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const { repair_id, amount, tip_amount } = await req.json();

    if (!repair_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: repair_id, amount" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate repair_id is a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(repair_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid repair_id format" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate amount is a positive number
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

    // Total in cents for Stripe (amount already includes tax, add tip)
    const totalCents = Math.round((parsedAmount + parsedTip) * 100);

    if (totalCents < 50) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least $0.50" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create PaymentIntent via Stripe API
    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(totalCents),
        currency: "usd",
        "metadata[repair_id]": repair_id,
        "metadata[tip_amount]": String(tip_amount || 0),
        "automatic_payment_methods[enabled]": "true",
      }),
    });

    const stripeData = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe API error:", stripeData);
      return new Response(
        JSON.stringify({ error: "Failed to create payment intent", details: stripeData.error?.message }),
        { status: 502, headers: corsHeaders }
      );
    }

    // Update repair with the payment intent ID
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase
      .from("repairs")
      .update({
        stripe_payment_intent_id: stripeData.id,
        payment_status: "pending",
        payment_method: "stripe",
        tip_amount: Number(tip_amount || 0),
      })
      .eq("id", repair_id);

    return new Response(
      JSON.stringify({
        clientSecret: stripeData.client_secret,
        paymentIntentId: stripeData.id,
      }),
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
