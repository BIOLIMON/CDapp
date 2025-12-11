
-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'allowed_kits';

-- Check RPC
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'admin_upload_kits';
