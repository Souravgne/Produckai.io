-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "insights_select_v3" ON insights;
DROP POLICY IF EXISTS "insights_insert_v3" ON insights;
DROP POLICY IF EXISTS "insights_modify_v3" ON insights;
DROP POLICY IF EXISTS "insights_delete_v3" ON insights;
DROP POLICY IF EXISTS "pod_members_access_v5" ON pod_members;

-- Create maximally simplified insights policy
CREATE POLICY "insights_access_v5"
ON insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Created the insight
  created_by = auth.uid()
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Create maximally simplified pod_members policy
CREATE POLICY "pod_members_access_v6"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. User is the member themselves
  -- 2. User created the pod
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

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);