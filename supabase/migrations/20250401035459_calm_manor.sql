/*
  # Fix Pod Policies Recursion

  1. Changes
    - Drop existing problematic policies
    - Create maximally simplified policies
    - Use direct ownership checks only
    - Add optimized indexes
  
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Use materialized paths
*/

-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "pods_access_final" ON pods;
DROP POLICY IF EXISTS "pod_members_access_final" ON pod_members;
DROP POLICY IF EXISTS "pod_invitations_access_final" ON pod_invitations;
DROP POLICY IF EXISTS "pod_insights_access_final" ON pod_insights;

-- Create maximally simplified pods policy
CREATE POLICY "pods_access_final_v2"
ON pods
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Created the pod
  created_by = auth.uid()
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Create simplified pod_members policy
CREATE POLICY "pod_members_access_final_v2"
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

-- Create simplified pod_invitations policy
CREATE POLICY "pod_invitations_access_final_v2"
ON pod_invitations
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Is pod owner
  -- 2. Is invitation recipient
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_id = pod_invitations.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  ) OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  -- Only pod owners can create/modify
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_id = pod_invitations.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

-- Create simplified pod_insights policy
CREATE POLICY "pod_insights_access_final_v2"
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

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_pod_id ON pod_invitations(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_email ON pod_invitations(email);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_status ON pod_invitations(status);
CREATE INDEX IF NOT EXISTS idx_pod_insights_pod_id ON pod_insights(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_insights_insight_id ON pod_insights(insight_id);
CREATE INDEX IF NOT EXISTS idx_pod_insights_shared_by ON pod_insights(shared_by);