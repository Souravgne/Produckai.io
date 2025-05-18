-- Drop existing foreign key constraints
ALTER TABLE pod_members
DROP CONSTRAINT IF EXISTS pod_members_user_id_fkey;

ALTER TABLE pod_insights
DROP CONSTRAINT IF EXISTS pod_insights_shared_by_fkey;

-- Add proper foreign key relationships
ALTER TABLE pod_members
ADD CONSTRAINT pod_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE pod_insights
ADD CONSTRAINT pod_insights_shared_by_fkey
FOREIGN KEY (shared_by) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Create view to join user data
CREATE OR REPLACE VIEW user_profiles_view AS
SELECT 
  u.id,
  up.full_name,
  up.role,
  up.department
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id;

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;

-- Drop existing policies
DROP POLICY IF EXISTS "pod_members_access_final_v4" ON pod_members;
DROP POLICY IF EXISTS "pod_insights_access_final_v2" ON pod_insights;

-- Create updated pod_members policy
CREATE POLICY "pod_members_access_final_v5"
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

-- Create updated pod_insights policy
CREATE POLICY "pod_insights_access_final_v3"
ON pod_insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Shared the insight
  -- 2. Is pod member
  shared_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_id = pod_insights.pod_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  -- Only allow sharing if member/owner
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_id = pod_insights.pod_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'member')
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_pod_insights_shared_by ON pod_insights(shared_by);
CREATE INDEX IF NOT EXISTS idx_pod_insights_pod_id ON pod_insights(pod_id);