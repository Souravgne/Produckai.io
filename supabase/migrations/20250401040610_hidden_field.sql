/*
  # Fix pod_members and user_profiles relationship

  1. Changes
    - Drop existing foreign key constraint
    - Add proper foreign key relationship to user_profiles
    - Update pod_members policies to reflect new relationship
  
  2. Security
    - Maintain proper access control
    - Ensure data integrity
*/

-- Drop existing foreign key constraint
ALTER TABLE pod_members
DROP CONSTRAINT IF EXISTS pod_members_user_id_fkey;

-- Add foreign key relationship to user_profiles
ALTER TABLE pod_members
ADD CONSTRAINT pod_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "pod_members_access_final_v3" ON pod_members;

-- Create updated pod_members policy
CREATE POLICY "pod_members_access_final_v4"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Is the member
  -- 2. Created the pod
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

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);