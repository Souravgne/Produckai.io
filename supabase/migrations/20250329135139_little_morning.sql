/*
  # Fix recursive policies for themes and pod members

  1. Changes
    - Drops all existing policies to start fresh
    - Creates simplified pod_members policies that avoid recursion
    - Updates themes policies to use direct product area ownership checks
  
  2. Security
    - Maintains row level security
    - Ensures proper access control through direct ownership checks
    - Prevents infinite recursion in policy evaluation
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Pod owners can manage members" ON pod_members;
DROP POLICY IF EXISTS "Users can create initial pod membership" ON pod_members;
DROP POLICY IF EXISTS "Users can view pod members" ON pod_members;
DROP POLICY IF EXISTS "Users can view insights in their pods" ON themes;
DROP POLICY IF EXISTS "Users can view themes in their product areas" ON themes;
DROP POLICY IF EXISTS "Users can manage their themes" ON themes;

-- Simplified pod_members policies
CREATE POLICY "Pod owners can manage pod members"
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

CREATE POLICY "Users can view their own memberships"
ON pod_members
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can create owner membership"
ON pod_members
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'owner'
);

-- Direct product area ownership check for themes
CREATE POLICY "Users can view their product area themes"
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

CREATE POLICY "Users can manage their product area themes"
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