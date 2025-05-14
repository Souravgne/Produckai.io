/*
  # Fix Pod Creation RLS Policies

  1. Changes
    - Drop existing problematic pod policies
    - Create simplified policies that allow proper pod creation
    - Add optimized indexes for performance
  
  2. Security
    - Maintain proper access control
    - Allow pod creation during onboarding
    - Ensure proper owner assignment
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Pod owners can manage pods" ON pods;
DROP POLICY IF EXISTS "Users can create pods" ON pods;
DROP POLICY IF EXISTS "Users can view their pods" ON pods;
DROP POLICY IF EXISTS "Pod owners can manage pod members" ON pods;

-- Create simplified pod policies
CREATE POLICY "pods_create"
ON pods
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow authenticated users to create pods
  -- The created_by field must match their user ID
  auth.uid() = created_by
);

CREATE POLICY "pods_select"
ON pods
FOR SELECT
TO authenticated
USING (
  -- Users can view pods they:
  -- 1. Created
  -- 2. Are a member of
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM pod_members
    WHERE pod_members.pod_id = pods.id
    AND pod_members.user_id = auth.uid()
  )
);

CREATE POLICY "pods_update"
ON pods
FOR UPDATE
TO authenticated
USING (
  -- Only pod creators can update
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "pods_delete"
ON pods
FOR DELETE
TO authenticated
USING (
  -- Only pod creators can delete
  created_by = auth.uid()
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);