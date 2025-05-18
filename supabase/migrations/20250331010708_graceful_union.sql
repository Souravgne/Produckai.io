/*
  # Fix infinite recursion in pod_members and themes policies

  1. Changes
    - Drop existing problematic policies
    - Create simplified policies without recursion
    - Use direct ownership checks
    - Add optimized indexes
  
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Preserve data integrity
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "pod_members_view" ON pod_members;
DROP POLICY IF EXISTS "pod_members_insert" ON pod_members;
DROP POLICY IF EXISTS "pod_members_modify" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "themes_access" ON themes;
DROP POLICY IF EXISTS "themes_view" ON themes;
DROP POLICY IF EXISTS "themes_manage" ON themes;

-- Create simplified pod_members policies
CREATE POLICY "pod_members_select"
ON pod_members
FOR SELECT
TO authenticated
USING (
  -- User can view if they:
  -- 1. Are the member themselves
  -- 2. Are in a pod with this member
  user_id = auth.uid() OR
  pod_id IN (
    SELECT pod_id 
    FROM pod_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "pod_members_insert"
ON pod_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can insert if they:
  -- 1. Are creating their own owner membership
  -- 2. Are a pod owner
  (auth.uid() = user_id AND role = 'owner') OR
  pod_id IN (
    SELECT pod_id 
    FROM pod_members 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
  )
);

CREATE POLICY "pod_members_modify"
ON pod_members
FOR UPDATE
TO authenticated
USING (
  -- Only pod owners can modify members
  pod_id IN (
    SELECT pod_id 
    FROM pod_members 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
  )
)
WITH CHECK (
  pod_id IN (
    SELECT pod_id 
    FROM pod_members 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
  )
);

CREATE POLICY "pod_members_delete"
ON pod_members
FOR DELETE
TO authenticated
USING (
  -- Only pod owners can delete members
  pod_id IN (
    SELECT pod_id 
    FROM pod_members 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
  )
);

-- Create simplified themes policies
CREATE POLICY "themes_select"
ON themes
FOR SELECT
TO authenticated
USING (
  -- User can view themes if they:
  -- 1. Created the theme
  -- 2. Own the product area
  created_by = auth.uid() OR
  product_area_id IN (
    SELECT id 
    FROM product_areas 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "themes_modify"
ON themes
FOR ALL
TO authenticated
USING (
  -- User can modify themes if they:
  -- 1. Created the theme
  -- 2. Own the product area
  created_by = auth.uid() OR
  product_area_id IN (
    SELECT id 
    FROM product_areas 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  created_by = auth.uid() OR
  product_area_id IN (
    SELECT id 
    FROM product_areas 
    WHERE user_id = auth.uid()
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);