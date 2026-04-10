-- ============================================================================
-- SEER MOBILE REPAIR SOLUTIONS — Full Repair Lifecycle Email Notifications
-- Extends email_notifications.sql with emails for every status transition.
--
-- Run this AFTER email_notifications.sql.
--
-- Adds emails for:
--   confirmed      → repair_accepted    (admin/tech accepted the repair)
--   parts_ordered  → parts_ordered      (parts have been ordered)
--   parts_received → parts_received     (parts arrived, ready for repair day)
--   scheduled      → repair_scheduled   (in-stock flow: appointment confirmed)
--   in_progress    → repair_in_progress (tech started the repair)
--
-- Existing emails (from email_notifications.sql):
--   INSERT         → repair_confirmed   (booking confirmation)
--   en_route       → tech_en_route
--   arrived        → tech_arrived
--   complete       → repair_complete
-- ============================================================================


-- ─── Replace the trigger function with the full lifecycle version ─────────────

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
      WHEN 'confirmed'      THEN v_email_type := 'repair_accepted';
      WHEN 'parts_ordered'  THEN v_email_type := 'parts_ordered';
      WHEN 'parts_received' THEN v_email_type := 'parts_received';
      WHEN 'scheduled'      THEN v_email_type := 'repair_scheduled';
      WHEN 'en_route'       THEN v_email_type := 'tech_en_route';
      WHEN 'arrived'        THEN v_email_type := 'tech_arrived';
      WHEN 'in_progress'    THEN v_email_type := 'repair_in_progress';
      WHEN 'complete'       THEN v_email_type := 'repair_complete';
      ELSE
        -- No email for cancelled or any other status
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
    'technician_name',  COALESCE(v_tech_name, 'Your SEER Technician'),
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


-- ─── Re-create triggers (DROP + CREATE ensures they use the updated function) ──

DROP TRIGGER IF EXISTS on_repair_created_email ON repairs;
CREATE TRIGGER on_repair_created_email
  AFTER INSERT ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION handle_repair_email_notification();

DROP TRIGGER IF EXISTS on_repair_status_changed_email ON repairs;
CREATE TRIGGER on_repair_status_changed_email
  AFTER UPDATE ON repairs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_repair_email_notification();


-- ============================================================================
-- This migration is additive and safe to re-run.
-- It replaces the trigger function and recreates the triggers.
-- All pg_cron jobs from email_notifications.sql are unchanged.
-- ============================================================================
