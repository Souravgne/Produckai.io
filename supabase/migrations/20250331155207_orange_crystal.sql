/*
  # Fix Pod Permissions and Foreign Key Relationships

  1. Changes
    - Drop existing problematic policies
    - Create simplified policies without recursion
    - Fix foreign key relationships
    - Add optimized indexes
  
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Use direct ownership checks
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "pod_members_select" ON pod_members;
DROP POLICY IF EXISTS "pod_members_insert" ON pod_members;
DROP POLICY IF EXISTS "pod_members_modify" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;
DROP POLICY IF EXISTS "users_view_pod_profiles" ON user_profiles;

-- Fix foreign key relationship between pod_members and users
ALTER TABLE pod_members
DROP CONSTRAINT IF EXISTS pod_members_user_id_fkey,
ADD CONSTRAINT pod_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Create simplified pod_members policy
CREATE POLICY "pod_members_access_v2"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. User is the member
  -- 2. User created the pod
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
)
WITH CHECK (
  -- For insert/update:
  -- 1. Creating own owner membership
  -- 2. Pod creator
  (user_id = auth.uid() AND role = 'owner') OR
  EXISTS (
    SELECT 1 FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
);

-- Create simplified user_profiles policy
CREATE POLICY "users_view_profiles_v2"
ON user_profiles
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  -- Users can view profiles if they:
  -- 1. Own the profile
  -- 2. Share a pod with the user
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pods p
    JOIN pod_members pm ON pm.pod_id = p.id
    WHERE pm.user_id = user_profiles.id
    AND (
      p.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM pod_members
        WHERE pod_id = p.id
        AND user_id = auth.uid()
      )
    )
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);