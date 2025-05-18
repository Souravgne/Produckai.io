/*
  # Fix recursive policies for pod_members and themes

  1. Changes
    - Simplify pod_members policies to avoid recursion
    - Simplify themes policies to avoid circular dependencies
    - Add optimized indexes for performance

  2. Security
    - Maintain proper access control while avoiding recursion
    - Ensure users can only access appropriate data
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view themes" ON themes;
DROP POLICY IF EXISTS "Users can manage themes" ON themes;
DROP POLICY IF EXISTS "Users can view pod members" ON pod_members;
DROP POLICY IF EXISTS "Users can insert pod members" ON pod_members;
DROP POLICY IF EXISTS "Pod owners can manage members" ON pod_members;

-- Create simplified pod member policies
CREATE POLICY "Users can view pod members"
  ON pod_members
  FOR SELECT
  TO authenticated
  USING (
    -- Simple direct access check without recursion
    user_id = auth.uid()
  );

CREATE POLICY "Pod owners can manage members"
  ON pod_members
  FOR ALL
  TO authenticated
  USING (
    -- Allow pod owners to manage members
    EXISTS (
      SELECT 1
      FROM pods
      WHERE id = pod_members.pod_id
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    -- Same condition for insert/update
    EXISTS (
      SELECT 1
      FROM pods
      WHERE id = pod_members.pod_id
      AND created_by = auth.uid()
    )
  );

-- Create simplified theme policies
CREATE POLICY "Users can view themes"
  ON themes
  FOR SELECT
  TO authenticated
  USING (
    -- Direct access: user created the theme
    created_by = auth.uid() OR
    -- Product area access: user owns the product area
    EXISTS (
      SELECT 1
      FROM product_areas
      WHERE id = themes.product_area_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage themes"
  ON themes
  FOR ALL
  TO authenticated
  USING (
    -- Direct access: user created the theme
    created_by = auth.uid() OR
    -- Product area access: user owns the product area
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

-- Optimize indexes for the new policies
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);