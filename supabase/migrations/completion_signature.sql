-- ============================================================================
-- GURU — Completion Signature Migration
-- Adds a separate column for the post-repair completion signature,
-- distinct from the intake (authorization) signature captured at arrival.
-- Run this in your Supabase SQL Editor after signature_tracking.sql
-- ============================================================================

ALTER TABLE repairs ADD COLUMN IF NOT EXISTS completion_signature_path TEXT;

-- ============================================================================
-- signature_path          → intake signature (customer authorizes repair at arrival)
-- completion_signature_path → completion signature (customer confirms repair done + paid)
-- Both files live in the 'repair-photos' storage bucket:
--   signatures/<repair_id>_intake_<timestamp>.png
--   signatures/<repair_id>_completion_<timestamp>.png
-- ============================================================================
