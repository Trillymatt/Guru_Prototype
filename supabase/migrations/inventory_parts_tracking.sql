-- ============================================================================
-- GURU — Parts Inventory & Tracking Migration
-- Adds shared parts inventory table and parts_in_stock flag on repairs
-- Run this in your Supabase SQL Editor after the base schema
-- ============================================================================

-- ─── Parts Inventory ────────────────────────────────────────────────────────
-- Shared inventory of parts across all technicians.
-- Tracks quantity per device + repair_type + parts_tier combination.

CREATE TABLE IF NOT EXISTS parts_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device TEXT NOT NULL,
  repair_type TEXT NOT NULL,
  parts_tier TEXT NOT NULL CHECK (parts_tier IN ('economy', 'premium', 'genuine')),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device, repair_type, parts_tier)
);

CREATE INDEX idx_parts_inventory_device ON parts_inventory(device);
CREATE INDEX idx_parts_inventory_lookup ON parts_inventory(device, repair_type, parts_tier);

-- Auto-update timestamps
CREATE TRIGGER update_parts_inventory_updated_at
  BEFORE UPDATE ON parts_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE parts_inventory ENABLE ROW LEVEL SECURITY;

-- Technicians can view all inventory
CREATE POLICY "Technicians can view inventory"
  ON parts_inventory FOR SELECT USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- Technicians can insert inventory items
CREATE POLICY "Technicians can insert inventory"
  ON parts_inventory FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- Technicians can update inventory items
CREATE POLICY "Technicians can update inventory"
  ON parts_inventory FOR UPDATE USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- Technicians can delete inventory items
CREATE POLICY "Technicians can delete inventory"
  ON parts_inventory FOR DELETE USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- Customers can view inventory (for checking part availability)
CREATE POLICY "Customers can view inventory"
  ON parts_inventory FOR SELECT USING (
    EXISTS (SELECT 1 FROM customers WHERE id = auth.uid())
  );

-- ─── Enable Realtime ────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE parts_inventory;

-- ─── Add parts_in_stock column to repairs ───────────────────────────────────
-- Tracks whether parts were in stock at booking time.
-- NULL = legacy repair (before inventory feature), true = all in stock, false = needs ordering

ALTER TABLE repairs ADD COLUMN IF NOT EXISTS parts_in_stock BOOLEAN DEFAULT NULL;
