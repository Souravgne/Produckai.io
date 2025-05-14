/*
  # Fix pod members and themes policies

  1. Changes
    - Drop existing policies to start fresh
    - Create simplified pod_members policy with direct ownership checks
    - Create simplified themes policy with direct ownership checks
    - Add optimized indexes for performance
  
  2. Security
    - Maintain row level security through direct ownership checks
    - Prevent infinite recursion in policy evaluation
    - Ensure proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "pod_members_view" ON pod_members;
DROP POLICY IF EXISTS "pod_members_create" ON pod_members;
DROP POLICY IF EXISTS "pod_members_update" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;
DROP POLICY IF EXISTS "themes_view" ON themes;
DROP POLICY IF EXISTS "themes_manage" ON themes;

-- Create single, simplified pod_members policy
CREATE POLICY "pod_members_access"
ON pod_members
FOR ALL
TO authenticated
USING (
  -- User can access if they:
  -- 1. Are the member themselves
  -- 2. Created the pod (direct check)
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
)
WITH CHECK (
  -- For insert/update, user must be:
  -- 1. Creating their own owner membership
  -- 2. The pod creator
  (auth.uid() = user_id AND role = 'owner') OR
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
);

-- Create single, simplified themes policy
CREATE POLICY "themes_access"
ON themes
FOR ALL
TO authenticated
USING (
  -- User can access if they:
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
  -- Same conditions for insert/update
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM product_areas
    WHERE id = themes.product_area_id
    AND user_id = auth.uid()
  )
);

-- Create optimized indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);