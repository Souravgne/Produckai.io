/*
  # Fix Infinite Recursion in Policies

  1. Changes
    - Drop existing policies that may cause recursion
    - Create simplified policies with direct ownership checks
    - Remove unnecessary joins and subqueries
    - Add optimized indexes for performance

  2. Security
    - Maintain proper access control through direct ownership checks
    - Prevent infinite recursion in policy evaluation
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "themes_access" ON themes;
DROP POLICY IF EXISTS "insights_select" ON insights;
DROP POLICY IF EXISTS "insights_insert" ON insights;
DROP POLICY IF EXISTS "insights_modify" ON insights;
DROP POLICY IF EXISTS "insights_delete" ON insights;

-- Create simplified pod_members policy
CREATE POLICY "pod_members_access"
ON pod_members
FOR ALL
TO authenticated
USING (
  -- Direct ownership checks without recursion:
  -- 1. User is the member
  -- 2. User created the pod
  auth.uid() = user_id OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  -- For insert/update, user must be:
  -- 1. Creating their own owner membership
  -- 2. The pod creator
  (auth.uid() = user_id AND role = 'owner') OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
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
  product_area_id IN (
    SELECT id FROM product_areas WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for insert/update
  created_by = auth.uid() OR
  product_area_id IN (
    SELECT id FROM product_areas WHERE user_id = auth.uid()
  )
);

-- Create simplified insights policies
CREATE POLICY "insights_access"
ON insights
FOR ALL
TO authenticated
USING (
  -- Direct ownership checks:
  -- 1. Created the insight
  -- 2. Has access to the theme's product area
  created_by = auth.uid() OR
  id IN (
    SELECT i.id
    FROM insights i
    JOIN insight_themes it ON it.insight_id = i.id
    JOIN themes t ON t.id = it.theme_id
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Same conditions for insert/update
  created_by = auth.uid() OR
  id IN (
    SELECT i.id
    FROM insights i
    JOIN insight_themes it ON it.insight_id = i.id
    JOIN themes t ON t.id = it.theme_id
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);