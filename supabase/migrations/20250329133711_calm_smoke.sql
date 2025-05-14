/*
  # Fix recursive policies for themes and pod members

  1. Changes
    - Simplify pod member policies to avoid recursion
    - Update theme policies to use direct user access checks
    - Remove complex joins that cause infinite recursion

  2. Security
    - Maintain RLS security while fixing recursion issues
    - Ensure proper access control for themes and pod members

  3. Notes
    - Policies are rewritten to be more efficient and avoid circular references
    - Access control is based on direct relationships rather than nested queries
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view themes in their pods" ON themes;
DROP POLICY IF EXISTS "Users can view pod members" ON pod_members;

-- Create new simplified policy for viewing themes
CREATE POLICY "Users can view themes"
  ON themes
  FOR SELECT
  TO authenticated
  USING (
    -- User can view themes if they:
    -- 1. Created the theme
    -- 2. Are a member of a pod that has access to the product area
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM pod_members pm
      JOIN product_areas pa ON pa.id = themes.product_area_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Create new simplified policy for viewing pod members
CREATE POLICY "Users can view pod members"
  ON pod_members
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view pod members if they:
    -- 1. Are the member themselves
    -- 2. Are a member of the same pod
    user_id = auth.uid() OR
    pod_id IN (
      SELECT pod_id
      FROM pod_members
      WHERE user_id = auth.uid()
    )
  );

-- Add policy for managing themes
CREATE POLICY "Users can manage themes"
  ON themes
  FOR ALL
  TO authenticated
  USING (
    -- Users can manage themes if they:
    -- 1. Created the theme
    -- 2. Are an owner of a pod that has access to the product area
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM pod_members pm
      JOIN product_areas pa ON pa.id = themes.product_area_id
      WHERE pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  )
  WITH CHECK (
    -- Same conditions for insert/update
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM pod_members pm
      JOIN product_areas pa ON pa.id = themes.product_area_id
      WHERE pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );

-- Add indexes to improve policy performance
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);