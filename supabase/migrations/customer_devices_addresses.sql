-- ============================================================================
-- SEER — Customer Saved Devices & Addresses Migration
-- Allows customers to save their devices and addresses for faster booking
-- ============================================================================

-- ─── Customer Saved Devices ────────────────────────────────────────────────
-- Stores devices that customers own (e.g., iPhone 17 Pro, Black Titanium)

CREATE TABLE IF NOT EXISTS customer_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,          -- e.g., 'iphone-17-pro'
  device_name TEXT NOT NULL,        -- e.g., 'iPhone 17 Pro'
  device_color TEXT,                -- e.g., 'Black Titanium'
  nickname TEXT,                    -- e.g., 'My Work Phone'
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_devices_customer ON customer_devices(customer_id);

CREATE TRIGGER update_customer_devices_updated_at
  BEFORE UPDATE ON customer_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE customer_devices ENABLE ROW LEVEL SECURITY;

-- Customers can manage their own devices
CREATE POLICY "Customers can view own devices"
  ON customer_devices FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own devices"
  ON customer_devices FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own devices"
  ON customer_devices FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete own devices"
  ON customer_devices FOR DELETE USING (auth.uid() = customer_id);

-- Technicians can view customer devices (for repair context)
CREATE POLICY "Technicians can view customer devices"
  ON customer_devices FOR SELECT USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- ─── Customer Saved Addresses ─────────────────────────────────────────────
-- Stores addresses that customers frequently use for repairs

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home', -- e.g., 'Home', 'Work', 'Other'
  address TEXT NOT NULL,              -- Full address string
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);

CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- Customers can manage their own addresses
CREATE POLICY "Customers can view own addresses"
  ON customer_addresses FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own addresses"
  ON customer_addresses FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own addresses"
  ON customer_addresses FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete own addresses"
  ON customer_addresses FOR DELETE USING (auth.uid() = customer_id);

-- Technicians can view customer addresses (for repair context)
CREATE POLICY "Technicians can view customer addresses"
  ON customer_addresses FOR SELECT USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );
