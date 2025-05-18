/*
  # Fix pod_members infinite recursion with simplified policies

  1. Changes
    - Drop existing problematic policies
    - Create single simplified policy without recursion
    - Add optimized indexes
  
  2. Security
    - Maintain proper access control through direct ownership checks
    - Prevent infinite recursion in policy evaluation
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "pod_members_view" ON pod_members;
DROP POLICY IF EXISTS "pod_members_insert" ON pod_members;
DROP POLICY IF EXISTS "pod_members_modify" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;

-- Create single simplified pod_members policy
CREATE POLICY "pod_members_access"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Simple direct checks:
  -- 1. User is the member
  -- 2. User created the pod
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
)
WITH CHECK (
  -- For insert/update:
  -- 1. Creating own owner membership
  -- 2. Pod creator
  (auth.uid() = user_id AND role = 'owner') OR
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);