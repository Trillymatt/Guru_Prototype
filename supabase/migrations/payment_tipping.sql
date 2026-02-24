-- ============================================================================
-- Migration: Add payment, tipping, and labor fee columns to repairs
-- ============================================================================

-- Labor fee — flat $10 charge per repair
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS labor_fee DECIMAL(10, 2) DEFAULT 10;

-- Payment method — cash or stripe
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS payment_method TEXT
  CHECK (payment_method IN ('cash', 'stripe'));

-- Payment status tracking
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'pending', 'completed'));

-- Customer tip amount
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10, 2) DEFAULT 0;

-- Stripe payment intent ID for card payments
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- When payment was completed
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
