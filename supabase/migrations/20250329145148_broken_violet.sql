/*
  # Fix pod_members and themes policies

  1. Changes
    - Simplify pod_members policies to prevent recursion
    - Update themes policies to use direct ownership checks
    - Add optimized indexes for performance

  2. Security
    - Maintain row level security
    - Ensure proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "pod_members_select" ON pod_members;
DROP POLICY IF EXISTS "pod_members_insert" ON pod_members;
DROP POLICY IF EXISTS "pod_members_modify" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;
DROP POLICY IF EXISTS "themes_select" ON themes;
DROP POLICY IF EXISTS "themes_modify" ON themes;

-- Create simplified pod_members policies
CREATE POLICY "pod_members_view"
ON pod_members
FOR SELECT
TO authenticated
USING (
  -- User can view if they:
  -- 1. Are the member themselves
  -- 2. Are the pod creator
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_create"
ON pod_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can create if they:
  -- 1. Are creating their own owner membership
  -- 2. Are the pod creator
  (auth.uid() = user_id AND role = 'owner') OR
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_update"
ON pod_members
FOR UPDATE
TO authenticated
USING (
  -- Only pod creators can update members
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_delete"
ON pod_members
FOR DELETE
TO authenticated
USING (
  -- Only pod creators can delete members
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
);

-- Create simplified themes policies
CREATE POLICY "themes_view"
ON themes
FOR SELECT
TO authenticated
USING (
  -- User can view if they:
  -- 1. Created the theme
  -- 2. Own the product area
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM product_areas
    WHERE id = themes.product_area_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "themes_manage"
ON themes
FOR ALL
TO authenticated
USING (
  -- User can manage if they:
  -- 1. Created the theme
  -- 2. Own the product area
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM product_areas
    WHERE id = themes.product_area_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM product_areas
    WHERE id = themes.product_area_id
    AND user_id = auth.uid()
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by_id ON pods(created_by, id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id_id ON product_areas(user_id, id);
CREATE INDEX IF NOT EXISTS idx_themes_created_by_product_area ON themes(created_by, product_area_id);