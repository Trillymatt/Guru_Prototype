-- ============================================================================
-- GURU MOBILE REPAIR SOLUTIONS — Email Notification System
-- Run this in your Supabase SQL Editor AFTER the main schema.sql
--
-- This sets up:
--   1. email_logs table         — Tracks every email sent
--   2. pg_net extension         — HTTP calls from database triggers
--   3. Trigger function         — Auto-fires emails on repair status changes
--   4. Database triggers        — INSERT (confirmed) + UPDATE (en_route, arrived, complete)
--   5. pg_cron jobs             — Day-of reminders (8 AM) + review requests (hourly)
--
-- BEFORE RUNNING: Set your project URL and service role key:
--
--   ALTER DATABASE postgres
--     SET app.settings.edge_function_url = 'https://YOUR_PROJECT_REF.supabase.co';
--
--   ALTER DATABASE postgres
--     SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
--
-- You can find these in: Supabase Dashboard → Settings → API
-- ============================================================================


-- ─── 1. Email Logs Table ──────────────────────────────────────────────────────
-- Tracks every email sent through the system for auditing and deduplication.

CREATE TABLE IF NOT EXISTS email_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_id     UUID REFERENCES repairs(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  email_type    TEXT NOT NULL,
  subject       TEXT,
  status        TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  error_message TEXT,
  resend_id     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups (used by review deduplication)
CREATE INDEX IF NOT EXISTS idx_email_logs_repair_type
  ON email_logs(repair_id, email_type);

CREATE INDEX IF NOT EXISTS idx_email_logs_created
  ON email_logs(created_at);

-- RLS: only service role / admin should access email logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;


-- ─── 2. Enable pg_net Extension ───────────────────────────────────────────────
-- pg_net allows PostgreSQL triggers to make async HTTP calls to Edge Functions.
-- This is pre-installed on Supabase — just enable it.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- ─── 3. Trigger Function: Repair Email Notifications ──────────────────────────
-- Fires on INSERT (new repair) and UPDATE (status change) to the repairs table.
-- Determines the email type, gathers customer/tech info, and calls the Edge Function.

CREATE OR REPLACE FUNCTION handle_repair_email_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_email_type    TEXT;
  v_customer_email TEXT;
  v_customer_name  TEXT;
  v_tech_name      TEXT;
  v_payload        JSONB;
  v_function_url   TEXT;
  v_service_key    TEXT;
BEGIN
  -- ── Determine which email to send ──
  IF TG_OP = 'INSERT' THEN
    v_email_type := 'repair_confirmed';

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'en_route'  THEN v_email_type := 'tech_en_route';
      WHEN 'arrived'   THEN v_email_type := 'tech_arrived';
      WHEN 'complete'  THEN v_email_type := 'repair_complete';
      ELSE
        -- No email needed for other status transitions
        RETURN NEW;
    END CASE;

  ELSE
    -- Not a status change, skip
    RETURN NEW;
  END IF;

  -- ── Look up customer info ──
  SELECT email, full_name
    INTO v_customer_email, v_customer_name
    FROM customers
   WHERE id = NEW.customer_id;

  -- Can't send email without an address
  IF v_customer_email IS NULL OR v_customer_email = '' THEN
    RETURN NEW;
  END IF;

  -- ── Look up technician name (if assigned) ──
  IF NEW.technician_id IS NOT NULL THEN
    SELECT full_name INTO v_tech_name
      FROM technicians
     WHERE id = NEW.technician_id;
  END IF;

  -- ── Build the JSON payload for the Edge Function ──
  v_payload := jsonb_build_object(
    'email_type',       v_email_type,
    'repair_id',        NEW.id,
    'customer_email',   v_customer_email,
    'customer_name',    COALESCE(v_customer_name, 'Valued Customer'),
    'device',           NEW.device,
    'issues',           NEW.issues,
    'parts_tier',       NEW.parts_tier,
    'status',           NEW.status,
    'schedule_date',    NEW.schedule_date,
    'schedule_time',    NEW.schedule_time,
    'address',          NEW.address,
    'total_estimate',   NEW.total_estimate,
    'service_fee',      NEW.service_fee,
    'technician_name',  COALESCE(v_tech_name, 'Your Guru Technician'),
    'notes',            NEW.notes
  );

  -- ── Read config (set via ALTER DATABASE postgres SET app.settings.xxx) ──
  v_function_url := current_setting('app.settings.edge_function_url', true);
  v_service_key  := current_setting('app.settings.service_role_key', true);

  -- Safety check: don't fire if config isn't set
  IF v_function_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING '[email_notifications] Missing app.settings — skipping email for repair %', NEW.id;
    RETURN NEW;
  END IF;

  -- ── Fire async HTTP POST to the Edge Function via pg_net ──
  PERFORM net.http_post(
    url     := v_function_url || '/functions/v1/send-repair-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := v_payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── 4. Database Triggers ─────────────────────────────────────────────────────

-- Fire when a new repair is created (sends "repair confirmed" email)
DROP TRIGGER IF EXISTS on_repair_created_email ON repairs;
CREATE TRIGGER on_repair_created_email
  AFTER INSERT ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION handle_repair_email_notification();

-- Fire when repair status changes (sends en_route / arrived / complete emails)
DROP TRIGGER IF EXISTS on_repair_status_changed_email ON repairs;
CREATE TRIGGER on_repair_status_changed_email
  AFTER UPDATE ON repairs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_repair_email_notification();


-- ─── 5. Scheduled Jobs (pg_cron) ─────────────────────────────────────────────
-- pg_cron is available on all Supabase plans.

CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ── 5a. Day-of Repair Reminders ──────────────────────────────────────────────
-- Runs every day at 8:00 AM Central Time (14:00 UTC).
-- Sends a reminder email for all repairs scheduled that day.

CREATE OR REPLACE FUNCTION send_daily_repair_reminders()
RETURNS void AS $$
DECLARE
  v_repair        RECORD;
  v_customer_email TEXT;
  v_customer_name  TEXT;
  v_tech_name      TEXT;
  v_payload        JSONB;
  v_function_url   TEXT;
  v_service_key    TEXT;
BEGIN
  v_function_url := current_setting('app.settings.edge_function_url', true);
  v_service_key  := current_setting('app.settings.service_role_key', true);

  IF v_function_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING '[email_notifications] Missing app.settings — skipping daily reminders';
    RETURN;
  END IF;

  FOR v_repair IN
    SELECT r.*
      FROM repairs r
     WHERE r.schedule_date = CURRENT_DATE
       AND r.status NOT IN ('complete', 'cancelled')
       -- Don't re-send if we already sent a reminder today
       AND NOT EXISTS (
         SELECT 1 FROM email_logs el
          WHERE el.repair_id = r.id
            AND el.email_type = 'day_of_reminder'
            AND el.created_at::date = CURRENT_DATE
       )
  LOOP
    -- Get customer info
    SELECT email, full_name
      INTO v_customer_email, v_customer_name
      FROM customers
     WHERE id = v_repair.customer_id;

    IF v_customer_email IS NULL OR v_customer_email = '' THEN
      CONTINUE;
    END IF;

    -- Get tech name
    IF v_repair.technician_id IS NOT NULL THEN
      SELECT full_name INTO v_tech_name
        FROM technicians
       WHERE id = v_repair.technician_id;
    ELSE
      v_tech_name := 'To be assigned';
    END IF;

    -- Build payload
    v_payload := jsonb_build_object(
      'email_type',       'day_of_reminder',
      'repair_id',        v_repair.id,
      'customer_email',   v_customer_email,
      'customer_name',    COALESCE(v_customer_name, 'Valued Customer'),
      'device',           v_repair.device,
      'issues',           v_repair.issues,
      'schedule_date',    v_repair.schedule_date,
      'schedule_time',    v_repair.schedule_time,
      'address',          v_repair.address,
      'total_estimate',   v_repair.total_estimate,
      'technician_name',  COALESCE(v_tech_name, 'To be assigned')
    );

    -- Fire async HTTP POST
    PERFORM net.http_post(
      url     := v_function_url || '/functions/v1/send-repair-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := v_payload
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule: every day at 8:00 AM Central (UTC-6 = 14:00 UTC)
-- Adjust the hour if you're in a different timezone.
SELECT cron.schedule(
  'daily-repair-reminders',        -- job name
  '0 14 * * *',                    -- cron expression (14:00 UTC = 8 AM CT)
  $$SELECT send_daily_repair_reminders()$$
);


-- ── 5b. Post-Service Review / Survey Emails ──────────────────────────────────
-- Runs every hour. Sends a review request for repairs completed 2–48 hours ago
-- that haven't already received a review email.

CREATE OR REPLACE FUNCTION send_review_requests()
RETURNS void AS $$
DECLARE
  v_repair        RECORD;
  v_customer_email TEXT;
  v_customer_name  TEXT;
  v_payload        JSONB;
  v_function_url   TEXT;
  v_service_key    TEXT;
BEGIN
  v_function_url := current_setting('app.settings.edge_function_url', true);
  v_service_key  := current_setting('app.settings.service_role_key', true);

  IF v_function_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING '[email_notifications] Missing app.settings — skipping review requests';
    RETURN;
  END IF;

  FOR v_repair IN
    SELECT r.*
      FROM repairs r
     WHERE r.status = 'complete'
       -- Completed between 2 and 48 hours ago
       AND r.updated_at >= NOW() - INTERVAL '48 hours'
       AND r.updated_at <= NOW() - INTERVAL '2 hours'
       -- Haven't sent a review email yet for this repair
       AND NOT EXISTS (
         SELECT 1 FROM email_logs el
          WHERE el.repair_id = r.id
            AND el.email_type = 'review_request'
       )
  LOOP
    -- Get customer info
    SELECT email, full_name
      INTO v_customer_email, v_customer_name
      FROM customers
     WHERE id = v_repair.customer_id;

    IF v_customer_email IS NULL OR v_customer_email = '' THEN
      CONTINUE;
    END IF;

    -- Build payload
    v_payload := jsonb_build_object(
      'email_type',       'review_request',
      'repair_id',        v_repair.id,
      'customer_email',   v_customer_email,
      'customer_name',    COALESCE(v_customer_name, 'Valued Customer'),
      'device',           v_repair.device,
      'issues',           v_repair.issues
    );

    -- Fire async HTTP POST
    PERFORM net.http_post(
      url     := v_function_url || '/functions/v1/send-repair-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body    := v_payload
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule: every hour on the hour
SELECT cron.schedule(
  'review-request-emails',         -- job name
  '0 * * * *',                     -- cron expression (every hour)
  $$SELECT send_review_requests()$$
);


-- ============================================================================
-- SETUP CHECKLIST (run these one-time commands in the SQL Editor):
-- ============================================================================
--
-- 1. Set your Supabase project URL:
--
--    ALTER DATABASE postgres
--      SET app.settings.edge_function_url = 'https://abcdefghijk.supabase.co';
--
-- 2. Set your service role key (find it in Dashboard → Settings → API):
--
--    ALTER DATABASE postgres
--      SET app.settings.service_role_key = 'eyJhbGciOi...your_key_here';
--
-- 3. Deploy the Edge Function (from your project root):
--
--    npx supabase functions deploy send-repair-email --no-verify-jwt
--
-- 4. Set Resend API key as an Edge Function secret:
--
--    npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
--    npx supabase secrets set FROM_EMAIL="Guru Mobile Repair <repairs@yourdomain.com>"
--    npx supabase secrets set APP_URL="https://your-customer-app.com"
--    npx supabase secrets set SURVEY_URL="https://your-survey-link.com"
--
-- 5. To verify the cron jobs are running:
--
--    SELECT * FROM cron.job;
--
-- 6. To check email logs:
--
--    SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 20;
--
-- ============================================================================
