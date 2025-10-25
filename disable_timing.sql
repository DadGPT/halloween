-- Disable timing feature
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/tafpxyrvbnvrysuqfevs

UPDATE contest_timing
SET
    enabled = false,
    updated_at = NOW()
WHERE id = 1;

-- Verify the update
SELECT * FROM contest_timing;
