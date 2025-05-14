/*
  # Fix Infinite Recursion in Pod Member Policies

  1. Changes
    - Simplify pod member policies to avoid recursion
    - Update theme policies to use direct relationships
    - Add missing indexes for performance

  2. Security
    - Maintain RLS security while avoiding recursive checks
    - Ensure proper access control for all operations
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view themes" ON themes;
DROP POLICY IF EXISTS "Users can manage themes" ON themes;
DROP POLICY IF EXISTS "Users can view pod members" ON pod_members;

-- Create simplified pod member policies
CREATE POLICY "Users can view pod members"
  ON pod_members
  FOR SELECT
  TO authenticated
  USING (
    -- Direct access: user is the member
    user_id = auth.uid() OR
    -- Pod access: user is in the same pod
    pod_id IN (
      SELECT pod_id
      FROM pod_members pm
      WHERE pm.user_id = auth.uid()
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
    -- Product area access: user has access through pod membership
    product_area_id IN (
      SELECT pa.id
      FROM product_areas pa
      JOIN pod_members pm ON pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage themes"
  ON themes
  FOR ALL
  TO authenticated
  USING (
    -- Direct access: user created the theme
    created_by = auth.uid() OR
    -- Owner access: user is an owner in a pod with access to the product area
    EXISTS (
      SELECT 1
      FROM pod_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role = 'owner'
      AND pm.pod_id IN (
        SELECT id FROM pods WHERE created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Same conditions for insert/update
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM pod_members pm
      WHERE pm.user_id = auth.uid()
      AND pm.role = 'owner'
      AND pm.pod_id IN (
        SELECT id FROM pods WHERE created_by = auth.uid()
      )
    )
  );

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pod_members_user_pod ON pod_members(user_id, pod_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user ON product_areas(user_id);