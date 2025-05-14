-- Drop existing problematic policies
DROP POLICY IF EXISTS "pod_invitations_access_final_v2" ON pod_invitations;
DROP POLICY IF EXISTS "users_view_profiles_v7" ON user_profiles;

-- First drop the existing view
DROP VIEW IF EXISTS user_profiles_view;

-- Recreate the view with the desired columns
CREATE VIEW user_profiles_view AS
SELECT 
  u.id,
  u.email,
  up.full_name,
  up.role,
  up.department
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.id = u.id;

-- Create updated pod_invitations policy
CREATE POLICY "pod_invitations_access_final_v3"
ON pod_invitations
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. User is pod owner
  -- 2. Invitation is for user's email
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_id = pod_invitations.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  ) OR
  EXISTS (
    SELECT 1 FROM user_profiles_view
    WHERE id = auth.uid()
    AND email = pod_invitations.email
  )
)
WITH CHECK (
  -- Only pod owners can create/modify
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_id = pod_invitations.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

-- Create policy for users to view their own profile
CREATE POLICY "users_view_profiles_v7"
ON user_profiles
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Own profile
  id = auth.uid()
);

-- Create policy for users to create their own profile only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'users_create_profile'
  ) THEN
    EXECUTE 'CREATE POLICY "users_create_profile"
      ON user_profiles
      FOR INSERT
      TO public
      WITH CHECK (id = auth.uid())';
  END IF;
END
$$;

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;