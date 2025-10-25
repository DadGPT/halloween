-- Create timing_settings table for global contest timing configuration
-- This is a singleton table (only 1 row) to store global timing settings

CREATE TABLE IF NOT EXISTS timing_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Enforce singleton pattern
    enabled BOOLEAN NOT NULL DEFAULT false,
    pre_show_start TEXT NOT NULL DEFAULT '2025-10-25T18:30',
    pre_show_end TEXT NOT NULL DEFAULT '2025-10-25T19:45',
    voting_start TEXT NOT NULL DEFAULT '2025-10-25T19:45',
    voting_end TEXT NOT NULL DEFAULT '2025-10-25T20:15',
    post_voting_start TEXT NOT NULL DEFAULT '2025-10-25T20:15',
    results_time TEXT NOT NULL DEFAULT '2025-10-25T20:30',
    manual_override TEXT DEFAULT NULL, -- Can be 'preshow', 'voting', 'closed', or NULL
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row (singleton)
INSERT INTO timing_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Add RLS (Row Level Security) policies
ALTER TABLE timing_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read timing settings
CREATE POLICY "Allow public read access to timing_settings"
ON timing_settings FOR SELECT
TO public
USING (true);

-- Only authenticated users can update (you can adjust this based on your auth setup)
-- For now, allowing all updates since admin access is PIN-protected in the app
CREATE POLICY "Allow all updates to timing_settings"
ON timing_settings FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_timing_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timing_settings_updated_at
BEFORE UPDATE ON timing_settings
FOR EACH ROW
EXECUTE FUNCTION update_timing_settings_updated_at();

-- Add comment
COMMENT ON TABLE timing_settings IS 'Global timing settings for the Halloween contest. Singleton table with only one row.';
