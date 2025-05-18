-- Drop existing problematic policies
DROP POLICY IF EXISTS "users_view_profiles_v6" ON user_profiles;
DROP POLICY IF EXISTS "users_view_own_profile" ON user_profiles;

-- Create simplified user_profiles policies
CREATE POLICY "users_view_profiles_v7"
ON user_profiles
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Own profile
  id = auth.uid()
);

CREATE POLICY "users_create_profile"
ON user_profiles
FOR INSERT
TO public
WITH CHECK (
  -- Allow creating own profile during signup
  id = auth.uid()
);

-- Create trigger to automatically create user_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, department)
  VALUES (new.id, 'user', 'general')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);