-- Migration 020: Trigger test of new GitHub Actions workflow
-- This migration tests the REST API workflow

-- Simple test that won't break anything
SELECT 'Testing new GitHub Actions workflow' as status, NOW() as timestamp;

-- Refresh schema cache to confirm connection
NOTIFY pgrst, 'reload schema';
