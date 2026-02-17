-- ============================================================================
-- GURU — Repair Photos Migration
-- Adds technician-only before/after repair photo tracking
-- Run this in your Supabase SQL Editor after the base schema
-- ============================================================================

-- ─── Repair Photos Table ──────────────────────────────────────────────────
-- Tracks before/after photos uploaded by technicians for each repair.
-- These photos are ONLY visible to technicians (not customers).
-- Actual files are stored in Supabase Storage bucket 'repair-photos'.

CREATE TABLE IF NOT EXISTS repair_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_id UUID NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
  file_path TEXT NOT NULL,
  file_name TEXT,
  content_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_repair_photos_repair ON repair_photos(repair_id);

-- ─── Row Level Security ───────────────────────────────────────────────────
-- IMPORTANT: Only technicians can access repair photos. Customers cannot.

ALTER TABLE repair_photos ENABLE ROW LEVEL SECURITY;

-- Technicians can view all repair photos
CREATE POLICY "Technicians can view repair photos"
  ON repair_photos FOR SELECT USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- Technicians can insert repair photos
CREATE POLICY "Technicians can insert repair photos"
  ON repair_photos FOR INSERT WITH CHECK (
    auth.uid() = technician_id
    AND EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- Technicians can delete repair photos
CREATE POLICY "Technicians can delete repair photos"
  ON repair_photos FOR DELETE USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- ─── IMPORTANT: Supabase Storage Setup ────────────────────────────────────
-- The 'repair-photos' storage bucket should already exist (used for signatures).
-- If not, create it in the Supabase Dashboard → Storage → New Bucket:
--   Name: repair-photos
--   Public: false (private — use signed URLs for access)
--
-- Storage RLS policies (run in SQL Editor if needed):
--
--   -- Allow technicians to upload photos
--   CREATE POLICY "Technicians can upload repair photos"
--     ON storage.objects FOR INSERT
--     WITH CHECK (
--       bucket_id = 'repair-photos'
--       AND EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
--     );
--
--   -- Allow technicians to view/download repair photos
--   CREATE POLICY "Technicians can view repair photos"
--     ON storage.objects FOR SELECT
--     USING (
--       bucket_id = 'repair-photos'
--       AND EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
--     );
--
--   -- Allow technicians to delete repair photos
--   CREATE POLICY "Technicians can delete repair photos"
--     ON storage.objects FOR DELETE
--     USING (
--       bucket_id = 'repair-photos'
--       AND EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
--     );
-- ============================================================================
