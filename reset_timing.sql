-- Reset timing settings to default values
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/tafpxyrvbnvrysuqfevs

UPDATE contest_timing
SET
    enabled = false,
    voting_start = '2025-10-25T19:00',
    voting_end = '2025-10-25T21:00',
    manual_override = NULL,
    updated_at = NOW()
WHERE id = 1;

-- Verify the reset
SELECT * FROM contest_timing;
