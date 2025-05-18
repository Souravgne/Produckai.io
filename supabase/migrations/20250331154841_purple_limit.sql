/*
  # Fix Pod Details and Permissions

  1. Changes
    - Add foreign key relationship between pod_insights and user_profiles
    - Update pod_insights policies to use user_profiles
    - Fix permissions for accessing user data
    - Add optimized indexes
  
  2. Security
    - Maintain proper access control
    - Use direct ownership checks
    - Prevent infinite recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view pod insights" ON pod_insights;
DROP POLICY IF EXISTS "Users can share insights to pods they belong to" ON pod_insights;

-- Add foreign key relationship between pod_insights and user_profiles
ALTER TABLE pod_insights
DROP CONSTRAINT IF EXISTS pod_insights_shared_by_fkey,
ADD CONSTRAINT pod_insights_shared_by_fkey
FOREIGN KEY (shared_by) REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Create simplified pod_insights policies
CREATE POLICY "pod_insights_access"
ON pod_insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if user:
  -- 1. Shared the insight
  -- 2. Is a member of the pod
  shared_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_members.pod_id = pod_insights.pod_id
    AND pod_members.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Only allow sharing if user:
  -- 1. Is a member or owner of the pod
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_members.pod_id = pod_insights.pod_id
    AND pod_members.user_id = auth.uid()
    AND pod_members.role IN ('owner', 'member')
  )
);

-- Create policy for accessing user profiles
CREATE POLICY "users_view_profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  -- Users can view profiles if they:
  -- 1. Own the profile
  -- 2. Share a pod with the user
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pod_members pm1
    JOIN pod_members pm2 ON pm2.pod_id = pm1.pod_id
    WHERE pm1.user_id = auth.uid()
    AND pm2.user_id = user_profiles.id
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pod_insights_shared_by ON pod_insights(shared_by);
CREATE INDEX IF NOT EXISTS idx_pod_insights_pod_id ON pod_insights(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_role ON pod_members(user_id, role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);