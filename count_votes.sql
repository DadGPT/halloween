-- Count total votes in the costume_votes table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/tafpxyrvbnvrysuqfevs

SELECT COUNT(*) as total_votes FROM costume_votes;

-- Breakdown by category
SELECT
    category,
    COUNT(*) as vote_count
FROM costume_votes
GROUP BY category
ORDER BY category;

-- Total unique voters
SELECT COUNT(DISTINCT voter_id) as unique_voters FROM costume_votes;
