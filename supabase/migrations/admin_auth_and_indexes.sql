-- ============================================================================
-- Admin Auth, Database Indexes, and Constraints
-- Run this in your Supabase SQL Editor after the base schema
-- ============================================================================

-- ─── Admins Table ─────────────────────────────────────────────────────────
-- Identifies which auth users have admin access.
-- Insert a row here for each admin user after creating their Supabase auth account.

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own row"
  ON admins FOR SELECT USING (auth.uid() = id);

-- ─── Helper function: is current user an admin? ──────────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admins WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── Admin RLS Policies ──────────────────────────────────────────────────
-- Allow admins to read all data across tables they need for the dashboard.

-- Customers: admins can read all + update (e.g. guru_plus toggle)
CREATE POLICY "Admins can view all customers"
  ON customers FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update customers"
  ON customers FOR UPDATE USING (is_admin());

-- Repairs: admins can read all + update + delete + insert
CREATE POLICY "Admins can view all repairs"
  ON repairs FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update repairs"
  ON repairs FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete repairs"
  ON repairs FOR DELETE USING (is_admin());

CREATE POLICY "Admins can insert repairs"
  ON repairs FOR INSERT WITH CHECK (is_admin());

-- Messages: admins can read all
CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT USING (is_admin());

-- Site events: admins can read all (for analytics)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_events') THEN
    EXECUTE 'CREATE POLICY "Admins can view site events" ON site_events FOR SELECT USING (is_admin())';
  END IF;
END $$;

-- Parts inventory: admins can read all
CREATE POLICY "Admins can view inventory"
  ON parts_inventory FOR SELECT USING (is_admin());

-- ─── Customers: add guru_plus_subscriber column if missing ───────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'guru_plus_subscriber'
  ) THEN
    ALTER TABLE customers ADD COLUMN guru_plus_subscriber BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ─── Performance Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_repairs_customer_id ON repairs(customer_id);
CREATE INDEX IF NOT EXISTS idx_repairs_technician_id ON repairs(technician_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
CREATE INDEX IF NOT EXISTS idx_repairs_created_at ON repairs(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- ─── Unique constraint on customers.email ────────────────────────────────
-- Prevents duplicate customer records for the same email.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_email_unique'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_email_unique UNIQUE (email);
  END IF;
END $$;

-- ─── Instructions ────────────────────────────────────────────────────────
-- After running this migration:
-- 1. Create a Supabase auth user for admin (email + password) via the Auth dashboard
-- 2. Insert a row into the admins table:
--    INSERT INTO admins (id, email) VALUES ('<admin-user-uuid>', 'admin@example.com');
-- ============================================================================
