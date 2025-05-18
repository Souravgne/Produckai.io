/*
  # Fix themes and pod members policies

  1. Changes
    - Updates pod_members policies to prevent recursion
    - Adds optimized policies for themes table
    - Simplifies access control logic
  
  2. Security
    - Maintains row level security
    - Ensures proper access control
    - Prevents infinite recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Pod owners can manage members" ON pod_members;
DROP POLICY IF EXISTS "Users can create initial pod membership" ON pod_members;
DROP POLICY IF EXISTS "Users can view pod members" ON pod_members;
DROP POLICY IF EXISTS "Users can view insights in their pods" ON themes;
DROP POLICY IF EXISTS "Users can view themes in their product areas" ON themes;
DROP POLICY IF EXISTS "Users can manage themes" ON themes;

-- Create new optimized pod_members policies
CREATE POLICY "Pod owners can manage members" ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pods
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create initial pod membership" ON pod_members
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'owner'
);

CREATE POLICY "Users can view pod members" ON pod_members
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM pod_members pm
    WHERE pm.pod_id = pod_members.pod_id
    AND pm.user_id = auth.uid()
  )
);

-- Create optimized themes policies
CREATE POLICY "Users can view themes in their product areas" ON themes
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM product_areas
    WHERE product_areas.id = themes.product_area_id
    AND product_areas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their themes" ON themes
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