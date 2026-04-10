-- ============================================================================
-- ADMIN CRM MIGRATION
-- Adds columns needed by the internal admin CRM dashboard
-- ============================================================================

-- ─── Add price_charged and estimated_completion to repairs ──────────────────
-- price_charged: actual amount charged (vs total_estimate which is the quote)
-- estimated_completion: target date for job completion

ALTER TABLE repairs
  ADD COLUMN IF NOT EXISTS price_charged DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS estimated_completion DATE;

-- ─── Add guru_plus_subscriber flag to customers ────────────────────────────
-- Tracks whether a customer is a Guru Plus subscriber

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS guru_plus_subscriber BOOLEAN DEFAULT FALSE;

-- ─── Admin notes: repairs.notes already exists in schema.sql ────────────────
-- No action needed — notes column is already available.

-- ============================================================================
-- USAGE NOTE:
-- The admin CRM portal uses the Supabase SERVICE_ROLE_KEY to bypass RLS.
-- This key must be set in the admin portal's .env file:
--   VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
-- This is acceptable for an internal-only tool behind a password gate.
-- ============================================================================
