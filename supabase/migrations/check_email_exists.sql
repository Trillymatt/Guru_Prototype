-- Returns true if a customer account exists for the given email.
-- SECURITY DEFINER bypasses RLS so unauthenticated callers can check.
-- Only exposes a boolean, not any customer data.

CREATE OR REPLACE FUNCTION check_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM customers WHERE email = lower(trim(p_email))
  );
$$;
