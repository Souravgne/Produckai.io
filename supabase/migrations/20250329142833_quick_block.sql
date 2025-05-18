/*
  # Fix pod_members policies to prevent recursion

  1. Changes
    - Drop all existing pod_members policies
    - Create a single simplified policy for pod_members
    - Ensure direct ownership checks without recursion
  
  2. Security
    - Maintains proper access control
    - Prevents infinite recursion
    - Preserves data integrity
*/

-- Drop all existing pod_members policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "pod_members_owner_access" ON pod_members;
DROP POLICY IF EXISTS "pod_members_self_view" ON pod_members;
DROP POLICY IF EXISTS "pod_members_owner_insert" ON pod_members;
DROP POLICY IF EXISTS "allow_pod_owner_management" ON pod_members;
DROP POLICY IF EXISTS "allow_view_own_memberships" ON pod_members;
DROP POLICY IF EXISTS "allow_create_owner_membership" ON pod_members;
DROP POLICY IF EXISTS "Pod owners can manage members" ON pod_members;
DROP POLICY IF EXISTS "Users can create initial pod membership" ON pod_members;
DROP POLICY IF EXISTS "Users can view pod members" ON pod_members;
DROP POLICY IF EXISTS "Users can create owner membership" ON pod_members;

-- Create a single, simplified policy for pod_members
CREATE POLICY "pod_members_access"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- User is either:
  -- 1. The pod owner (via direct pods table check)
  -- 2. The member themselves
  EXISTS (
    SELECT 1
    FROM pods
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
  ) OR auth.uid() = user_id
)
WITH CHECK (
  -- For insert/update/delete, user must be the pod owner
  EXISTS (
    SELECT 1
    FROM pods
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
  )
);

-- Create index to optimize policy performance
CREATE INDEX IF NOT EXISTS idx_pods_created_by_id ON pods(created_by, id);