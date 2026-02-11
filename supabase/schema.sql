-- ============================================================================
-- GURU MOBILE REPAIR SOLUTIONS — Database Schema
-- Run this in your Supabase SQL Editor to set up the database
-- ============================================================================

-- ─── Enable UUID Extension ──────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ───────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with additional fields

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'technician', 'admin')),
  full_name TEXT,
  phone TEXT,
  notification_preference TEXT DEFAULT 'email' CHECK (notification_preference IN ('email', 'sms', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Devices ────────────────────────────────────────────────────────────────
-- iPhone model catalog

CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  generation TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Repair Types ───────────────────────────────────────────────────────────

CREATE TABLE repair_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Parts Pricing ──────────────────────────────────────────────────────────
-- Pricing per device + repair type + tier combination

CREATE TABLE parts_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  repair_type_id TEXT REFERENCES repair_types(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('economy', 'premium', 'genuine')),
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id, repair_type_id, tier)
);

-- ─── Repair Requests ────────────────────────────────────────────────────────

CREATE TABLE repair_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id TEXT REFERENCES devices(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'parts_ordered', 'parts_received',
    'scheduled', 'en_route', 'arrived', 'in_progress', 'complete', 'cancelled'
  )),
  tier_selected TEXT NOT NULL CHECK (tier_selected IN ('economy', 'premium', 'genuine')),
  location_address TEXT,
  location_lat DECIMAL(10, 7),
  location_lng DECIMAL(10, 7),
  scheduled_date DATE,
  scheduled_time TIME,
  estimated_price DECIMAL(10, 2),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Repair Request Issues (many-to-many) ────────────────────────────────────

CREATE TABLE repair_request_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_request_id UUID REFERENCES repair_requests(id) ON DELETE CASCADE NOT NULL,
  repair_type_id TEXT REFERENCES repair_types(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(repair_request_id, repair_type_id)
);

-- ─── Repair Status History ──────────────────────────────────────────────────

CREATE TABLE repair_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_request_id UUID REFERENCES repair_requests(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Messages (Live Chat) ───────────────────────────────────────────────────

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_request_id UUID REFERENCES repair_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Digital Signatures ─────────────────────────────────────────────────────

CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_request_id UUID REFERENCES repair_requests(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signature_data TEXT NOT NULL,
  agreement_text TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Technician Live Location ───────────────────────────────────────────────

CREATE TABLE technician_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  repair_request_id UUID REFERENCES repair_requests(id) ON DELETE CASCADE NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(technician_id, repair_request_id)
);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_request_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Devices & Repair Types: public read
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read devices" ON devices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read repair_types" ON repair_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read parts_pricing" ON parts_pricing FOR SELECT TO anon, authenticated USING (true);

-- Repair requests: customers see their own, technicians see all
CREATE POLICY "Customers see own requests" ON repair_requests
  FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Technicians see all requests" ON repair_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'technician')
  );
CREATE POLICY "Customers can create requests" ON repair_requests
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Technicians can update requests" ON repair_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'technician')
  );

-- Messages: participants of the repair can read/write
CREATE POLICY "Repair participants can read messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repair_requests
      WHERE id = repair_request_id
      AND (customer_id = auth.uid() OR technician_id = auth.uid())
    )
  );
CREATE POLICY "Repair participants can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ─── Auto-update timestamps trigger ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_repair_requests_updated_at
  BEFORE UPDATE ON repair_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Enable Realtime ─────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE repair_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE repair_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE technician_locations;
