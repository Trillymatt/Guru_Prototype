-- ============================================================================
-- Migration: Add device_color column to repairs table
-- Stores the customer-selected back glass color for back-glass repair orders.
-- Run this in your Supabase SQL Editor.
-- ============================================================================

ALTER TABLE repairs
  ADD COLUMN IF NOT EXISTS device_color TEXT;

COMMENT ON COLUMN repairs.device_color IS
  'Selected back glass color for back-glass repairs (e.g. "Deep Blue", "Natural Titanium"). NULL for non-back-glass repairs.';
