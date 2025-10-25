-- Create contest_timing table for global contest timing configuration
-- This is a singleton table (only 1 row) to store global timing settings

CREATE TABLE IF NOT EXISTS contest_timing (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Enforce singleton pattern
    enabled BOOLEAN NOT NULL DEFAULT false,
    voting_start TEXT NOT NULL DEFAULT '2025-10-25T19:00',
    voting_end TEXT NOT NULL DEFAULT '2025-10-25T21:00',
    manual_override TEXT DEFAULT NULL, -- Can be 'preshow', 'voting', 'closed', or NULL
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row (singleton)
INSERT INTO contest_timing (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Add RLS (Row Level Security) policies
ALTER TABLE contest_timing ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read timing settings
CREATE POLICY "Allow public read access to contest_timing"
ON contest_timing FOR SELECT
TO public
USING (true);

-- Only authenticated users can update (you can adjust this based on your auth setup)
-- For now, allowing all updates since admin access is PIN-protected in the app
CREATE POLICY "Allow all updates to contest_timing"
ON contest_timing FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_contest_timing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contest_timing_updated_at
BEFORE UPDATE ON contest_timing
FOR EACH ROW
EXECUTE FUNCTION update_contest_timing_updated_at();

-- Add comment
COMMENT ON TABLE contest_timing IS 'Global timing settings for the Halloween contest. Singleton table with only one row.';
