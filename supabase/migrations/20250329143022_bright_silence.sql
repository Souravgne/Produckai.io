/*
  # Fix pod members recursion with simplified policies

  1. Changes
    - Drop all existing policies to start fresh
    - Create simplified direct access policies
    - Add optimized indexes
  
  2. Security
    - Maintain proper access control
    - Eliminate policy recursion
    - Optimize query performance
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "themes_access" ON themes;

-- Create simplified pod_members policies
CREATE POLICY "pod_members_select"
ON pod_members
FOR SELECT
TO authenticated
USING (
  -- User can view if they:
  -- 1. Are the member themselves
  -- 2. Created the pod (direct check)
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1
    FROM pods
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_insert"
ON pod_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can insert if they:
  -- 1. Are creating their own owner membership
  -- 2. Are the pod creator
  (auth.uid() = user_id AND role = 'owner') OR
  EXISTS (
    SELECT 1
    FROM pods
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_modify"
ON pod_members
FOR UPDATE
TO authenticated
USING (
  -- Only pod creators can modify members
  EXISTS (
    SELECT 1
    FROM pods
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM pods
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
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
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
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
  EXISTS (
    SELECT 1
    FROM product_areas
    WHERE id = themes.product_area_id
    AND user_id = auth.uid()
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