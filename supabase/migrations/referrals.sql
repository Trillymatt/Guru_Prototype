-- ============================================================================
-- Guru — Referral Program + Safe Booking RPC
-- Adds profile referral links and enforces anti-abuse checks server-side
-- ============================================================================

-- ─── Customers: referral code ────────────────────────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customers_referral_code_format'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT customers_referral_code_format
      CHECK (referral_code IS NULL OR referral_code ~ '^[A-Z0-9]{8}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS customers_referral_code_unique_idx
  ON customers (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE OR REPLACE FUNCTION generate_customer_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  generated_code TEXT;
BEGIN
  LOOP
    generated_code := UPPER(SUBSTRING(REPLACE(uuid_generate_v4()::TEXT, '-', '') FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM customers
      WHERE referral_code = generated_code
    );
  END LOOP;

  RETURN generated_code;
END;
$$;

CREATE OR REPLACE FUNCTION set_customer_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := generate_customer_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_customer_referral_code_on_customers ON customers;
CREATE TRIGGER set_customer_referral_code_on_customers
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_referral_code();

UPDATE customers
SET referral_code = generate_customer_referral_code()
WHERE referral_code IS NULL OR referral_code = '';

-- ─── Repairs: track referral discount applied to booking ─────────────────────

ALTER TABLE repairs
  ADD COLUMN IF NOT EXISTS referral_discount_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code_used TEXT;

-- ─── Referral relationships ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referred_customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  referrer_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 5.00 CHECK (discount_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT customer_referrals_no_self_referral CHECK (referred_customer_id <> referrer_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_referrals_referrer
  ON customer_referrals(referrer_customer_id);

ALTER TABLE customer_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own referral relationships"
  ON customer_referrals FOR SELECT USING (
    auth.uid() = referred_customer_id OR auth.uid() = referrer_customer_id
  );

-- ─── Referral validation attempts (admin abuse monitoring) ───────────────────

CREATE TABLE IF NOT EXISTS referral_validation_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempted_by_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  attempted_referral_code TEXT,
  matched_referrer_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_attempts_created_at
  ON referral_validation_attempts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_attempts_code
  ON referral_validation_attempts(attempted_referral_code);

CREATE INDEX IF NOT EXISTS idx_referral_attempts_customer
  ON referral_validation_attempts(attempted_by_customer_id);

CREATE INDEX IF NOT EXISTS idx_repairs_referral_code_used
  ON repairs(referral_code_used)
  WHERE referral_code_used IS NOT NULL;

ALTER TABLE referral_validation_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own referral attempts"
  ON referral_validation_attempts FOR SELECT USING (
    auth.uid() = attempted_by_customer_id
  );

-- ─── Admin-facing referral monitoring views ──────────────────────────────────

CREATE OR REPLACE VIEW admin_referral_summary AS
SELECT
  COUNT(*)::INTEGER AS total_successful_referrals,
  COALESCE(SUM(discount_amount), 0)::DECIMAL(10, 2) AS total_discount_granted,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::INTEGER AS successful_last_7_days,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::INTEGER AS successful_last_30_days
FROM customer_referrals;

CREATE OR REPLACE VIEW admin_referral_details AS
SELECT
  cr.id AS referral_id,
  cr.created_at AS referred_at,
  cr.referral_code,
  cr.discount_amount,
  referrer.id AS referrer_customer_id,
  referrer.full_name AS referrer_name,
  referrer.email AS referrer_email,
  referred.id AS referred_customer_id,
  referred.full_name AS referred_name,
  referred.email AS referred_email,
  r.id AS repair_id,
  r.status AS repair_status,
  r.payment_status,
  r.total_estimate,
  r.referral_discount_amount
FROM customer_referrals cr
JOIN customers referrer ON referrer.id = cr.referrer_customer_id
JOIN customers referred ON referred.id = cr.referred_customer_id
LEFT JOIN repairs r
  ON r.customer_id = cr.referred_customer_id
  AND r.referral_code_used = cr.referral_code;

CREATE OR REPLACE VIEW admin_referral_attempts AS
SELECT
  a.id AS attempt_id,
  a.created_at AS attempted_at,
  a.outcome,
  a.rejection_reason,
  a.attempted_referral_code,
  attempted.id AS attempted_by_customer_id,
  attempted.full_name AS attempted_by_name,
  attempted.email AS attempted_by_email,
  matched.id AS matched_referrer_customer_id,
  matched.full_name AS matched_referrer_name,
  matched.email AS matched_referrer_email
FROM referral_validation_attempts a
LEFT JOIN customers attempted ON attempted.id = a.attempted_by_customer_id
LEFT JOIN customers matched ON matched.id = a.matched_referrer_customer_id;

-- ─── Safe booking RPC (atomic booking + referral validation) ────────────────

CREATE OR REPLACE FUNCTION book_repair_with_referral(
  p_device TEXT,
  p_issues JSONB,
  p_parts_tier JSONB,
  p_service_fee DECIMAL,
  p_labor_fee DECIMAL,
  p_total_estimate_base DECIMAL,
  p_schedule_date DATE,
  p_schedule_time TEXT,
  p_address TEXT,
  p_parts_in_stock BOOLEAN,
  p_device_color TEXT,
  p_notes TEXT,
  p_referral_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  repair_id UUID,
  total_estimate DECIMAL,
  referral_discount_amount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_referrer_id UUID;
  v_discount DECIMAL(10, 2) := 0;
  v_referral_code TEXT := NULLIF(UPPER(TRIM(p_referral_code)), '');
  v_user_repairs_count INTEGER := 0;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_customer_email_normalized TEXT;
  v_referrer_email_normalized TEXT;
  v_normalized_user_phone TEXT;
  v_normalized_referrer_phone TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT COUNT(*)
  INTO v_user_repairs_count
  FROM repairs
  WHERE customer_id = v_user_id;

  IF v_referral_code IS NOT NULL THEN
    SELECT
      email,
      phone,
      LOWER(NULLIF(TRIM(email), '')),
      NULLIF(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g'), '')
    INTO
      v_customer_email,
      v_customer_phone,
      v_customer_email_normalized,
      v_normalized_user_phone
    FROM customers
    WHERE id = v_user_id;

    IF v_referral_code !~ '^[A-Z0-9]{8}$' THEN
      INSERT INTO referral_validation_attempts (
        attempted_by_customer_id,
        attempted_referral_code,
        outcome,
        rejection_reason
      )
      VALUES (
        v_user_id,
        v_referral_code,
        'rejected',
        'invalid_format'
      );
      RAISE EXCEPTION 'Referral code format is invalid.';
    END IF;

    IF v_user_repairs_count > 0 THEN
      INSERT INTO referral_validation_attempts (
        attempted_by_customer_id,
        attempted_referral_code,
        outcome,
        rejection_reason
      )
      VALUES (
        v_user_id,
        v_referral_code,
        'rejected',
        'not_first_repair'
      );
      RAISE EXCEPTION 'Referral discount is only valid on your first repair.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM customer_referrals
      WHERE referred_customer_id = v_user_id
    ) THEN
      INSERT INTO referral_validation_attempts (
        attempted_by_customer_id,
        attempted_referral_code,
        outcome,
        rejection_reason
      )
      VALUES (
        v_user_id,
        v_referral_code,
        'rejected',
        'already_used'
      );
      RAISE EXCEPTION 'A referral has already been used on this account.';
    END IF;

    SELECT
      id,
      LOWER(NULLIF(TRIM(email), '')),
      NULLIF(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g'), '')
    INTO
      v_referrer_id,
      v_referrer_email_normalized,
      v_normalized_referrer_phone
    FROM customers
    WHERE referral_code = v_referral_code;

    IF v_referrer_id IS NULL THEN
      INSERT INTO referral_validation_attempts (
        attempted_by_customer_id,
        attempted_referral_code,
        outcome,
        rejection_reason
      )
      VALUES (
        v_user_id,
        v_referral_code,
        'rejected',
        'code_not_found'
      );
      RAISE EXCEPTION 'Referral code not found.';
    END IF;

    IF v_referrer_id = v_user_id THEN
      INSERT INTO referral_validation_attempts (
        attempted_by_customer_id,
        attempted_referral_code,
        matched_referrer_customer_id,
        outcome,
        rejection_reason
      )
      VALUES (
        v_user_id,
        v_referral_code,
        v_referrer_id,
        'rejected',
        'self_referral_same_account'
      );
      RAISE EXCEPTION 'You cannot use your own referral code.';
    END IF;

    IF v_customer_email_normalized IS NOT NULL
      AND v_referrer_email_normalized IS NOT NULL
      AND v_customer_email_normalized = v_referrer_email_normalized THEN
      INSERT INTO referral_validation_attempts (
        attempted_by_customer_id,
        attempted_referral_code,
        matched_referrer_customer_id,
        outcome,
        rejection_reason
      )
      VALUES (
        v_user_id,
        v_referral_code,
        v_referrer_id,
        'rejected',
        'similarity_email'
      );
      RAISE EXCEPTION 'Referral rejected due to account similarity checks.';
    END IF;

    IF v_normalized_user_phone IS NOT NULL
      AND v_normalized_referrer_phone IS NOT NULL
      AND v_normalized_user_phone = v_normalized_referrer_phone THEN
      INSERT INTO referral_validation_attempts (
        attempted_by_customer_id,
        attempted_referral_code,
        matched_referrer_customer_id,
        outcome,
        rejection_reason
      )
      VALUES (
        v_user_id,
        v_referral_code,
        v_referrer_id,
        'rejected',
        'similarity_phone'
      );
      RAISE EXCEPTION 'Referral rejected due to account similarity checks.';
    END IF;

    v_discount := 5.00;

    INSERT INTO customer_referrals (
      referred_customer_id,
      referrer_customer_id,
      referral_code,
      discount_amount
    )
    VALUES (
      v_user_id,
      v_referrer_id,
      v_referral_code,
      v_discount
    );

    INSERT INTO referral_validation_attempts (
      attempted_by_customer_id,
      attempted_referral_code,
      matched_referrer_customer_id,
      outcome
    )
    VALUES (
      v_user_id,
      v_referral_code,
      v_referrer_id,
      'accepted'
    );
  END IF;

  INSERT INTO repairs (
    customer_id,
    device,
    issues,
    parts_tier,
    service_fee,
    labor_fee,
    total_estimate,
    schedule_date,
    schedule_time,
    address,
    status,
    parts_in_stock,
    device_color,
    notes,
    referral_discount_amount,
    referral_code_used
  )
  VALUES (
    v_user_id,
    COALESCE(p_device, 'Unknown Device'),
    COALESCE(p_issues, '[]'::jsonb),
    COALESCE(p_parts_tier, '{}'::jsonb),
    COALESCE(p_service_fee, 29),
    COALESCE(p_labor_fee, 10),
    GREATEST(COALESCE(p_total_estimate_base, 0) - v_discount, 0),
    p_schedule_date,
    p_schedule_time,
    p_address,
    'pending',
    p_parts_in_stock,
    p_device_color,
    NULLIF(TRIM(p_notes), ''),
    v_discount,
    v_referral_code
  )
  RETURNING id, repairs.total_estimate, repairs.referral_discount_amount
  INTO repair_id, total_estimate, referral_discount_amount;

  RETURN NEXT;
END;
$$;
