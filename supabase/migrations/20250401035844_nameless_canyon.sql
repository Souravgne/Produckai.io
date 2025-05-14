-- Drop existing policies if they exist
DROP POLICY IF EXISTS "pods_create_v2" ON pods;
DROP POLICY IF EXISTS "pods_select_v2" ON pods;
DROP POLICY IF EXISTS "pods_modify_v2" ON pods;
DROP POLICY IF EXISTS "pod_members_access_v2" ON pod_members;
DROP POLICY IF EXISTS "pod_invitations_access_v2" ON pod_invitations;
DROP POLICY IF EXISTS "pod_insights_access_v2" ON pod_insights;

-- Drop the foreign key constraint if it exists
ALTER TABLE pod_members
DROP CONSTRAINT IF EXISTS pod_members_user_id_fkey;

-- Re-add the foreign key constraint to properly define the relationship
ALTER TABLE pod_members
ADD CONSTRAINT pod_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create simplified pod_members policy
CREATE POLICY "pod_members_access_final_v3"
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