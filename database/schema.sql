-- ==============================================================================
-- HOSTEL DAILY COUNT DATABASE SCHEMA FOR SUPABASE POSTGRESQL
-- ==============================================================================

-- 1. Create hostel_daily_counts table
CREATE TABLE IF NOT EXISTS hostel_daily_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_date DATE NOT NULL,
    students INTEGER NOT NULL CHECK (students >= 0),
    staff INTEGER NOT NULL CHECK (staff >= 0),
    others INTEGER NOT NULL CHECK (others >= 0),
    total INTEGER NOT NULL CHECK (total >= 0 AND total = (students + staff + others)),
    submitted_by TEXT NOT NULL,
    message_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_hostel_record_date UNIQUE (record_date)
);

-- Index for speedy date and message lookup
CREATE INDEX IF NOT EXISTS idx_hostel_daily_counts_date ON hostel_daily_counts (record_date DESC);
CREATE INDEX IF NOT EXISTS idx_hostel_daily_counts_message_id ON hostel_daily_counts (message_id);

-- 2. Pending updates table for 2-step confirmation (Section 10: "UPDATE" command)
CREATE TABLE IF NOT EXISTS hostel_pending_updates (
    phone_number TEXT PRIMARY KEY,
    record_date DATE NOT NULL,
    students INTEGER NOT NULL CHECK (students >= 0),
    staff INTEGER NOT NULL CHECK (staff >= 0),
    others INTEGER NOT NULL CHECK (others >= 0),
    total INTEGER NOT NULL CHECK (total >= 0),
    message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '2 hours') NOT NULL
);

-- 3. Idempotency tracker for non-saving commands (today, yesterday, help, etc.)
CREATE TABLE IF NOT EXISTS hostel_processed_messages (
    message_id TEXT PRIMARY KEY,
    phone_number TEXT,
    command TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for garbage collection of processed messages
CREATE INDEX IF NOT EXISTS idx_hostel_processed_messages_created_at ON hostel_processed_messages (created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE hostel_daily_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_pending_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_processed_messages ENABLE ROW LEVEL SECURITY;

-- 5. Policies: Service role (backend webhook) has full access
CREATE POLICY "Service role full access on hostel_daily_counts"
    ON hostel_daily_counts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on hostel_pending_updates"
    ON hostel_pending_updates
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on hostel_processed_messages"
    ON hostel_processed_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated or anon read on hostel_daily_counts if dashboard uses anon key with server session
CREATE POLICY "Allow read access to hostel_daily_counts"
    ON hostel_daily_counts
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 6. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hostel_counts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_hostel_counts_updated_at ON hostel_daily_counts;
CREATE TRIGGER trigger_update_hostel_counts_updated_at
    BEFORE UPDATE ON hostel_daily_counts
    FOR EACH ROW
    EXECUTE FUNCTION update_hostel_counts_updated_at();
