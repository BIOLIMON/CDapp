CREATE OR REPLACE FUNCTION get_landing_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_users int;
    total_entries int;
    total_photos int;
    leaderboard jsonb;
BEGIN
    -- 1. Count Users
    SELECT count(*) INTO total_users FROM profiles;

    -- 2. Count Entries
    SELECT count(*) INTO total_entries FROM experiment_entries;

    -- 3. Count Photos
    -- Count valid image URLs in the pots table
    SELECT COALESCE(SUM(
         (CASE WHEN (images->>'front') IS NOT NULL AND (images->>'front') != '' THEN 1 ELSE 0 END) +
         (CASE WHEN (images->>'top') IS NOT NULL AND (images->>'top') != '' THEN 1 ELSE 0 END) +
         (CASE WHEN (images->>'profile') IS NOT NULL AND (images->>'profile') != '' THEN 1 ELSE 0 END)
    ), 0) INTO total_photos FROM pots;

    -- 4. Leaderboard (Top 3 by score)
    SELECT jsonb_agg(t) INTO leaderboard
    FROM (
        SELECT name, score 
        FROM profiles 
        ORDER BY score DESC 
        LIMIT 3
    ) t;

    RETURN jsonb_build_object(
        'totalUsers', total_users,
        'totalEntries', total_entries,
        'totalPhotos', total_photos,
        'activeExperiments', total_users, 
        'leaderboard', COALESCE(leaderboard, '[]'::jsonb)
    );
END;
$$;
