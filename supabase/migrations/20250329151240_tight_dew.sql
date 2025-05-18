/*
  # Fix infinite recursion in pod_members and themes policies

  1. Changes
    - Drop existing problematic policies
    - Create simplified policies without recursion
    - Add optimized indexes for performance

  2. Security
    - Maintain proper access control
    - Use direct ownership checks
    - Avoid policy recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "pod_members_view" ON pod_members;
DROP POLICY IF EXISTS "pod_members_insert" ON pod_members;
DROP POLICY IF EXISTS "pod_members_modify" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;
DROP POLICY IF EXISTS "themes_access" ON themes;

-- Create simplified pod_members policies
CREATE POLICY "pod_members_view"
ON pod_members
FOR SELECT
TO authenticated
USING (
  -- Direct ownership checks without recursion
  auth.uid() = user_id OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_insert"
ON pod_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow only if:
  -- 1. Creating own owner membership
  -- 2. Pod creator
  (auth.uid() = user_id AND role = 'owner') OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_modify"
ON pod_members
FOR UPDATE
TO authenticated
USING (
  -- Only pod creators can modify
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_delete"
ON pod_members
FOR DELETE
TO authenticated
USING (
  -- Only pod creators can delete
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

-- Create simplified themes policy
CREATE POLICY "themes_access"
ON themes
FOR ALL
TO authenticated
USING (
  -- Direct ownership checks:
  -- 1. Theme creator
  -- 2. Product area owner
  created_by = auth.uid() OR
  product_area_id IN (
    SELECT id FROM product_areas WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for insert/update
  created_by = auth.uid() OR
  product_area_id IN (
    SELECT id FROM product_areas WHERE user_id = auth.uid()
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);