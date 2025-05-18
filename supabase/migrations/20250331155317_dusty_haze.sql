-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "pod_members_access_v2" ON pod_members;
DROP POLICY IF EXISTS "pod_members_select" ON pod_members;
DROP POLICY IF EXISTS "pod_members_insert" ON pod_members;
DROP POLICY IF EXISTS "pod_members_modify" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;
DROP POLICY IF EXISTS "users_view_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_view_profiles_v2" ON user_profiles;
DROP POLICY IF EXISTS "users_view_pod_profiles" ON user_profiles;

-- Create maximally simplified pod_members policy
CREATE POLICY "pod_members_access"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. User is the member themselves
  -- 2. User created the pod (direct check)
  user_id = auth.uid() OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  -- For insert/update:
  -- 1. Creating own owner membership
  -- 2. Pod creator
  (user_id = auth.uid() AND role = 'owner') OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

-- Create simplified user_profiles policy
CREATE POLICY "users_view_profiles"
ON user_profiles
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  -- Users can view profiles if they:
  -- 1. Own the profile
  -- 2. Are in a pod with the user
  id = auth.uid() OR
  id IN (
    SELECT pm2.user_id
    FROM pod_members pm1
    JOIN pod_members pm2 ON pm2.pod_id = pm1.pod_id
    WHERE pm1.user_id = auth.uid()
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);