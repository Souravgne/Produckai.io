/*
  # Fix pod members recursion and simplify policies

  1. Changes
    - Drops existing problematic policies
    - Creates simplified pod_members policies without recursion
    - Updates themes policies to use direct ownership checks
  
  2. Security
    - Maintains row level security
    - Ensures proper access control through direct ownership checks
    - Prevents infinite recursion in policy evaluation
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Pod owners can manage pod members" ON pod_members;
DROP POLICY IF EXISTS "Pod owners can manage members" ON pod_members;
DROP POLICY IF EXISTS "Users can create initial pod membership" ON pod_members;
DROP POLICY IF EXISTS "Users can create owner membership" ON pod_members;
DROP POLICY IF EXISTS "Users can view pod members" ON pod_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON pod_members;
DROP POLICY IF EXISTS "Users can view insights in their pods" ON insights;
DROP POLICY IF EXISTS "Users can view their product area themes" ON themes;
DROP POLICY IF EXISTS "Users can manage their product area themes" ON themes;
DROP POLICY IF EXISTS "Users can view themes in their product areas" ON themes;
DROP POLICY IF EXISTS "Users can manage their themes" ON themes;

-- Create simplified pod_members policies without recursion
CREATE POLICY "allow_pod_owner_management"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pods
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
  )
);

CREATE POLICY "allow_view_own_memberships"
ON pod_members
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "allow_create_owner_membership"
ON pod_members
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'owner'
);

-- Create simplified themes policies with direct ownership checks
CREATE POLICY "allow_view_owned_themes"
ON themes
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM product_areas
    WHERE product_areas.id = themes.product_area_id
    AND product_areas.user_id = auth.uid()
  )
);

CREATE POLICY "allow_manage_owned_themes"
ON themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM product_areas
    WHERE product_areas.id = themes.product_area_id
    AND product_areas.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM product_areas
    WHERE product_areas.id = themes.product_area_id
    AND product_areas.user_id = auth.uid()
  )
);