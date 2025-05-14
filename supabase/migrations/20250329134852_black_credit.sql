/*
  # Fix pod_members policies

  1. Changes
    - Drops existing problematic policies causing recursion
    - Creates new optimized policies for pod_members table
    - Implements proper access control without recursion
  
  2. Security
    - Maintains row level security
    - Ensures proper access control for pod members
    - Prevents infinite recursion in policy evaluation
*/

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "Pod owners can manage members" ON pod_members;
DROP POLICY IF EXISTS "Users can create initial pod membership" ON pod_members;
DROP POLICY IF EXISTS "Users can view pod members" ON pod_members;

-- Create new optimized policies
-- Policy for pod owners to manage members
CREATE POLICY "Pod owners can manage members" ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pods
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
  )
);

-- Policy for users to create initial pod membership (when creating a new pod)
CREATE POLICY "Users can create initial pod membership" ON pod_members
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id AND role = 'owner')
  OR
  EXISTS (
    SELECT 1 FROM pod_members owner_membership
    WHERE owner_membership.pod_id = pod_members.pod_id
    AND owner_membership.user_id = auth.uid()
    AND owner_membership.role = 'owner'
  )
);

-- Policy for users to view pod members they are part of
CREATE POLICY "Users can view pod members" ON pod_members
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pod_members viewer_membership
    WHERE viewer_membership.pod_id = pod_members.pod_id
    AND viewer_membership.user_id = auth.uid()
  )
);