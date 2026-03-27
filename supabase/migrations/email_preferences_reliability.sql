-- ============================================================================
-- SEER MOBILE REPAIR SOLUTIONS — Email Preferences & Reliability
-- Run this AFTER email_notifications.sql and status_email_triggers.sql.
--
-- Adds:
--   1. notification_preference column on customers (email, sms, both, none)
--   2. Retry columns on email_logs (attempt_count, max_attempts, next_retry_at)
--   3. Idempotency index on email_logs (repair_id + email_type + day)
--   4. retry_failed_emails() function + pg_cron job (every 5 minutes)
-- ============================================================================


-- ─── 1. Customer Notification Preferences ───────────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS notification_preference TEXT
    DEFAULT 'both'
    CHECK (notification_preference IN ('email', 'sms', 'both', 'none'));

COMMENT ON COLUMN customers.notification_preference IS
  'Controls which channels receive transactional notifications. Edge Function checks this before sending email.';


-- ─── 2. Retry Columns on email_logs ─────────────────────────────────────────

ALTER TABLE email_logs
  ADD COLUMN IF NOT EXISTS attempt_count  INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_attempts   INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at  TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN email_logs.attempt_count IS 'How many times this email has been attempted';
COMMENT ON COLUMN email_logs.max_attempts  IS 'Maximum retry attempts before giving up';
COMMENT ON COLUMN email_logs.next_retry_at IS 'When the next retry should be attempted (NULL = no retry scheduled)';

-- When an email fails, set next_retry_at so the retry job picks it up
-- Exponential backoff: 5 min, 25 min, 125 min
CREATE INDEX IF NOT EXISTS idx_email_logs_retry
  ON email_logs(next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;


-- ─── 3. Idempotency Index ───────────────────────────────────────────────────
-- Prevents duplicate emails for the same repair + email_type on the same day.
-- The Edge Function checks this before sending; the index makes the lookup fast.
-- Note: timestamptz::date depends on timezone so we use an IMMUTABLE wrapper
-- pinned to UTC, which is fine because email_logs.created_at defaults to NOW()
-- and we only need day-level granularity for deduplication.

CREATE OR REPLACE FUNCTION email_log_date(ts TIMESTAMPTZ)
RETURNS DATE
LANGUAGE sql IMMUTABLE AS
$$SELECT (ts AT TIME ZONE 'UTC')::date$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_idempotency
  ON email_logs(repair_id, email_type, email_log_date(created_at))
  WHERE status IN ('sent', 'queued');


-- ─── 4. Retry Function ─────────────────────────────────────────────────────
-- Picks up failed emails where next_retry_at <= NOW() and attempt_count < max_attempts.
-- Re-invokes the Edge Function with the original payload.

CREATE OR REPLACE FUNCTION retry_failed_emails()
RETURNS void AS $$
DECLARE
  v_log           RECORD;
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
    RAISE WARNING '[email_retry] Missing app.settings — skipping retry run';
    RETURN;
  END IF;

  FOR v_log IN
    SELECT el.*
      FROM email_logs el
     WHERE el.status = 'failed'
       AND el.next_retry_at IS NOT NULL
       AND el.next_retry_at <= NOW()
       AND el.attempt_count < el.max_attempts
     ORDER BY el.next_retry_at ASC
     LIMIT 20  -- process at most 20 per run to avoid overload
  LOOP
    -- Skip if a successful send already exists for this repair+type+day (idempotency)
    IF EXISTS (
      SELECT 1 FROM email_logs
       WHERE repair_id = v_log.repair_id
         AND email_type = v_log.email_type
         AND created_at::date = v_log.created_at::date
         AND status = 'sent'
         AND id != v_log.id
    ) THEN
      -- Mark as superseded so we don't keep retrying
      UPDATE email_logs
         SET status = 'sent',
             error_message = 'Superseded by successful send',
             next_retry_at = NULL
       WHERE id = v_log.id;
      CONTINUE;
    END IF;

    -- Look up repair data to rebuild the payload
    SELECT r.* INTO v_repair FROM repairs r WHERE r.id = v_log.repair_id;
    IF v_repair IS NULL THEN
      -- Repair was deleted; clear the retry
      UPDATE email_logs
         SET next_retry_at = NULL
       WHERE id = v_log.id;
      CONTINUE;
    END IF;

    -- Customer info
    SELECT email, full_name
      INTO v_customer_email, v_customer_name
      FROM customers
     WHERE id = v_repair.customer_id;

    IF v_customer_email IS NULL OR v_customer_email = '' THEN
      UPDATE email_logs SET next_retry_at = NULL WHERE id = v_log.id;
      CONTINUE;
    END IF;

    -- Tech name
    IF v_repair.technician_id IS NOT NULL THEN
      SELECT full_name INTO v_tech_name
        FROM technicians
       WHERE id = v_repair.technician_id;
    END IF;

    -- Build payload (same shape the Edge Function expects)
    v_payload := jsonb_build_object(
      'email_type',       v_log.email_type,
      'repair_id',        v_repair.id,
      'customer_email',   v_customer_email,
      'customer_name',    COALESCE(v_customer_name, 'Valued Customer'),
      'device',           v_repair.device,
      'issues',           v_repair.issues,
      'parts_tier',       v_repair.parts_tier,
      'status',           v_repair.status,
      'schedule_date',    v_repair.schedule_date,
      'schedule_time',    v_repair.schedule_time,
      'address',          v_repair.address,
      'total_estimate',   v_repair.total_estimate,
      'service_fee',      v_repair.service_fee,
      'technician_name',  COALESCE(v_tech_name, 'Your SEER Technician'),
      'notes',            v_repair.notes,
      'is_retry',         true,
      'retry_log_id',     v_log.id
    );

    -- Increment attempt count & clear next_retry_at (Edge Function will re-set it on failure)
    UPDATE email_logs
       SET attempt_count = attempt_count + 1,
           next_retry_at = NULL
     WHERE id = v_log.id;

    -- Fire the Edge Function
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


-- ─── Schedule retry job: every 5 minutes ────────────────────────────────────

SELECT cron.schedule(
  'retry-failed-emails',
  '*/5 * * * *',
  $$SELECT retry_failed_emails()$$
);


-- ============================================================================
-- After running this migration:
--   - Customers default to notification_preference = 'both'
--   - Failed emails auto-retry up to 3 times with exponential backoff
--   - Duplicate sends for the same repair+type+day are prevented
--   - The Edge Function must be redeployed to use these new features
-- ============================================================================
