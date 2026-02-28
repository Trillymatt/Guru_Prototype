-- ============================================================================
-- SITE ANALYTICS — Lightweight event tracking for the customer portal
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS site_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Session identification (anonymous visitor fingerprint, not PII)
  session_id TEXT NOT NULL,
  -- Event classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view', 'button_click', 'session_start', 'session_end',
    'quiz_start', 'quiz_step', 'quiz_complete',
    'login', 'signup', 'booking_complete'
  )),
  -- What was interacted with (page path, button name, quiz step, etc.)
  event_target TEXT,
  -- Optional metadata (JSON) for extra context
  event_data JSONB DEFAULT '{}'::jsonb,
  -- Page the event occurred on
  page_path TEXT,
  -- Referrer URL (first page load only)
  referrer TEXT,
  -- Device info
  user_agent TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  -- Session timing
  session_duration_ms INTEGER,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common admin queries
CREATE INDEX IF NOT EXISTS idx_site_events_type ON site_events(event_type);
CREATE INDEX IF NOT EXISTS idx_site_events_created ON site_events(created_at);
CREATE INDEX IF NOT EXISTS idx_site_events_session ON site_events(session_id);
CREATE INDEX IF NOT EXISTS idx_site_events_page ON site_events(page_path);

-- RLS: Allow anonymous inserts (tracking from unauthenticated visitors)
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (the anon key is used by the customer site)
DO $$ BEGIN
  CREATE POLICY "Anyone can insert site events"
    ON site_events FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No one can read/update/delete via the anon key (admin uses service role)
-- This keeps event data private — only the admin CRM can read it.

-- ============================================================================
-- USAGE: The customer portal fires events via the shared analytics tracker.
-- The admin CRM reads this table using the service role key (bypasses RLS).
-- ============================================================================
