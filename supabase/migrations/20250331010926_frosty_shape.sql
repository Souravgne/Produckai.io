/*
  # Fix pod members and themes policies

  1. Changes
    - Drop existing problematic policies
    - Create simplified pod_members policies without recursion
    - Create simplified themes policies
    - Add optimized indexes
  
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Optimize query performance
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "pod_members_select" ON pod_members;
DROP POLICY IF EXISTS "pod_members_insert" ON pod_members;
DROP POLICY IF EXISTS "pod_members_modify" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "themes_access" ON themes;
DROP POLICY IF EXISTS "themes_view" ON themes;
DROP POLICY IF EXISTS "themes_manage" ON themes;

-- Create simplified pod_members policies
CREATE POLICY "pod_members_access"
ON pod_members
FOR ALL
TO authenticated
USING (
  -- Direct ownership checks without recursion:
  -- 1. User is the member
  -- 2. User created the pod
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

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);