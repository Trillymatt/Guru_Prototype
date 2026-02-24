-- ============================================================================
-- TECH LIVE LOCATION TRACKING
-- Stores real-time technician GPS coordinates during en_route status.
-- Uses upsert pattern: one row per repair, updated continuously.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tech_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_id UUID NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repair_id)
);

CREATE INDEX idx_tech_locations_repair ON tech_locations(repair_id);
CREATE INDEX idx_tech_locations_tech ON tech_locations(technician_id);

-- ─── Row Level Security ───────────────────────────────────────────────────

ALTER TABLE tech_locations ENABLE ROW LEVEL SECURITY;

-- Technicians can insert/update their own location
CREATE POLICY "Technicians can insert own location"
  ON tech_locations FOR INSERT WITH CHECK (
    auth.uid() = technician_id
    AND EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

CREATE POLICY "Technicians can update own location"
  ON tech_locations FOR UPDATE USING (
    auth.uid() = technician_id
    AND EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- Technicians can view their own locations
CREATE POLICY "Technicians can view own location"
  ON tech_locations FOR SELECT USING (
    auth.uid() = technician_id
  );

-- Technicians can delete their own locations (cleanup after arrival)
CREATE POLICY "Technicians can delete own location"
  ON tech_locations FOR DELETE USING (
    auth.uid() = technician_id
  );

-- Customers can view location for their own repairs
CREATE POLICY "Customers can view tech location for own repairs"
  ON tech_locations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repairs
      WHERE repairs.id = tech_locations.repair_id
        AND repairs.customer_id = auth.uid()
    )
  );

-- ─── Enable Realtime ─────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE tech_locations;
