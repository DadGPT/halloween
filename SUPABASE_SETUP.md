# Supabase Database Setup

## Quick Start - Run This SQL

Copy and paste the entire contents of `contest_timing_schema.sql` into your Supabase SQL Editor and run it.

**Or run this directly:**

```sql
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
```

## How to Run

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/tafpxyrvbnvrysuqfevs
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Paste the SQL above
5. Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)

## What This Creates

- **Table**: `contest_timing` (singleton - only 1 row)
- **Columns**:
  - `id` - Always 1 (enforced by CHECK constraint)
  - `enabled` - Boolean for timing on/off
  - `voting_start` - When voting period starts (before this = pre-show)
  - `voting_end` - When voting period ends (after this = closed)
  - `manual_override` - Manual phase override (preshow/voting/closed/null)
  - `updated_at` - Auto-updated timestamp

- **Policies**: Public read access, public update access (admin is PIN-protected in app)

- **How Timing Works**:
  - **Before voting_start**: Pre-show period (uploads allowed, voting disabled)
  - **During voting_start to voting_end**: Active voting (uploads and voting allowed)
  - **After voting_end**: Contest closed (no uploads or voting)

## Verify It Worked

After running the SQL, you should see:
- `contest_timing` table in your Tables list
- 1 row with default values (enabled: false, voting_start: 2025-10-25T19:00, voting_end: 2025-10-25T21:00)

You can verify by running:
```sql
SELECT * FROM contest_timing;
```

Expected result:
```
id | enabled | voting_start        | voting_end          | manual_override | updated_at
---+---------+--------------------+--------------------+-----------------+------------
 1 | false   | 2025-10-25T19:00   | 2025-10-25T21:00   | null            | [timestamp]
```
