-- Refresh PostgREST schema cache after adding context column
-- Run this in Supabase SQL Editor if you see PGRST204 errors

NOTIFY pgrst, 'reload schema';