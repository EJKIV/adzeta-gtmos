-- ================================================================
-- Migration 001: Profiles
-- User profiles linked to Supabase auth, with auto-creation on signup
-- ================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    is_employee BOOLEAN DEFAULT false,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'employee', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_employee ON profiles(is_employee);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Helper functions that bypass RLS (SECURITY DEFINER) to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_employee(check_id UUID)
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT is_employee FROM public.profiles WHERE id = check_id),
        false
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin(check_id UUID)
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT role = 'admin' FROM public.profiles WHERE id = check_id),
        false
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Employees can view all profiles" ON profiles
    FOR SELECT USING (public.is_employee(auth.uid()));

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Allow insert on signup" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, is_employee, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        false,
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
