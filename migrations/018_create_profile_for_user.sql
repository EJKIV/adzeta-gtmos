-- Migration 018: Create profile for production user
-- User ID: 197d48c7-2d63-42c0-b55b-d678021ba50c
-- Email: jim.kernan@adzeta.io

INSERT INTO public.profiles (id, email, is_employee, role, created_at, updated_at)
VALUES (
    '197d48c7-2d63-42c0-b55b-d678021ba50c'::uuid,
    'jim.kernan@adzeta.io',
    true,
    'admin',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE 
SET 
    is_employee = true, 
    role = 'admin',
    updated_at = NOW();

-- Also delete the old profile for the other ID if it exists
DELETE FROM public.profiles 
WHERE email = 'jim.kernan@adzeta.io' 
AND id != '197d48c7-2d63-42c0-b55b-d678021ba50c'::uuid;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
