-- ============================================================================
-- GURU — Signature Tracking Migration
-- Adds a signature_path column to repairs so the technician's captured
-- customer signature (stored in Supabase Storage) can be retrieved later.
-- Run this in your Supabase SQL Editor after repair_photos.sql
-- ============================================================================

-- Add signature_path column to repairs table
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS signature_path TEXT;

-- ============================================================================
-- After running this migration, the technician portal will save the storage
-- path of the signed repair agreement to this column when a customer signs.
-- The file itself lives in the 'repair-photos' storage bucket under:
--   signatures/<repair_id>_<timestamp>.png
-- ============================================================================
