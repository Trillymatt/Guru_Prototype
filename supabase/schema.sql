-- ============================================================================
-- GURU MOBILE REPAIR SOLUTIONS — Database Schema
-- Run this in your Supabase SQL Editor to set up the database
-- ============================================================================

-- ─── Enable UUID Extension ──────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Customers ──────────────────────────────────────────────────────────────
-- Customer profiles created when a user books a repair via the customer portal.

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Technicians ────────────────────────────────────────────────────────────
-- Technician profiles. Rows are created manually in Supabase for each tech.

CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Repairs ────────────────────────────────────────────────────────────────
-- Every booked repair. Customers create, technicians read & update.

CREATE TABLE IF NOT EXISTS repairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device TEXT NOT NULL,
  issues JSONB DEFAULT '[]'::jsonb,
  parts_tier JSONB DEFAULT '{}'::jsonb,
  service_fee DECIMAL(10, 2) DEFAULT 29,
  total_estimate DECIMAL(10, 2),
  schedule_date DATE,
  schedule_time TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'parts_ordered', 'parts_received',
    'scheduled', 'en_route', 'arrived', 'in_progress', 'complete', 'cancelled'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;

-- Customers: users can read / insert / update their own row
CREATE POLICY "Users can view own customer profile"
  ON customers FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own customer profile"
  ON customers FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own customer profile"
  ON customers FOR UPDATE USING (auth.uid() = id);

-- Technicians can also read customer profiles (needed for the join in queue/detail)
CREATE POLICY "Technicians can view customers"
  ON customers FOR SELECT USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- Technicians: can read / update their own row
CREATE POLICY "Technicians can view own profile"
  ON technicians FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Technicians can update own profile"
  ON technicians FOR UPDATE USING (auth.uid() = id);

-- Repairs: customers see their own
CREATE POLICY "Customers see own repairs"
  ON repairs FOR SELECT USING (auth.uid() = customer_id);

-- Repairs: customers can create their own
CREATE POLICY "Customers can create repairs"
  ON repairs FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Repairs: technicians can see all repairs
CREATE POLICY "Technicians see all repairs"
  ON repairs FOR SELECT USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- Repairs: technicians can update any repair (claim, advance status, etc.)
CREATE POLICY "Technicians can update repairs"
  ON repairs FOR UPDATE USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- ─── Auto-update timestamps trigger ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repairs_updated_at
  BEFORE UPDATE ON repairs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Messages (Chat per Repair) ──────────────────────────────────────────────
-- Each repair has its own chat thread between customer and technician.

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repair_id UUID NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'technician')),
  sender_name TEXT DEFAULT '',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by repair
CREATE INDEX idx_messages_repair_id ON messages(repair_id);
CREATE INDEX idx_messages_created_at ON messages(repair_id, created_at);

-- ─── Messages RLS ────────────────────────────────────────────────────────────

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Customers can read messages for their own repairs
CREATE POLICY "Customers can view messages for own repairs"
  ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repairs
      WHERE repairs.id = messages.repair_id
        AND repairs.customer_id = auth.uid()
    )
  );

-- Technicians can read all messages
CREATE POLICY "Technicians can view all messages"
  ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- Customers can send messages on their own repairs
CREATE POLICY "Customers can send messages on own repairs"
  ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND sender_role = 'customer'
    AND EXISTS (
      SELECT 1 FROM repairs
      WHERE repairs.id = messages.repair_id
        AND repairs.customer_id = auth.uid()
    )
  );

-- Technicians can send messages on any repair
CREATE POLICY "Technicians can send messages"
  ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND sender_role = 'technician'
    AND EXISTS (SELECT 1 FROM technicians WHERE id = auth.uid())
  );

-- ─── Chat Read Tracking ──────────────────────────────────────────────────────
-- Tracks when each user last opened the chat for a given repair.

CREATE TABLE IF NOT EXISTS chat_last_read (
  repair_id UUID NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (repair_id, user_id)
);

ALTER TABLE chat_last_read ENABLE ROW LEVEL SECURITY;

-- Users can read their own last-read timestamps
CREATE POLICY "Users can view own read timestamps"
  ON chat_last_read FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own last-read timestamps
CREATE POLICY "Users can insert own read timestamps"
  ON chat_last_read FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own last-read timestamps
CREATE POLICY "Users can update own read timestamps"
  ON chat_last_read FOR UPDATE USING (auth.uid() = user_id);

-- ─── Enable Realtime ─────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE repairs;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ─── IMPORTANT: After running this schema ────────────────────────────────────
-- 1. Create a Supabase auth user for your technician (email + password).
-- 2. Insert a row into the 'technicians' table with that user's UUID:
--
--    INSERT INTO technicians (id, full_name, email)
--    VALUES ('<tech-user-uuid>', 'Your Name', 'tech@example.com');
--
-- This lets RLS identify the user as a technician so they can see all repairs.
-- ============================================================================
