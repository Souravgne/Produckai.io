/*
  # Fix infinite recursion in RLS policies

  1. Changes
    - Drop all existing policies
    - Create maximally simplified policies
    - Use direct ownership checks only
    - Avoid complex joins in policy definitions
  
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Preserve data integrity
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "themes_access" ON themes;
DROP POLICY IF EXISTS "insights_access" ON insights;
DROP POLICY IF EXISTS "insights_select" ON insights;
DROP POLICY IF EXISTS "insights_insert" ON insights;
DROP POLICY IF EXISTS "insights_modify" ON insights;
DROP POLICY IF EXISTS "insights_delete" ON insights;
DROP POLICY IF EXISTS "insight_themes_access" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access" ON insight_customers;

-- Create simplified pod_members policy
CREATE POLICY "pod_members_access"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership checks without recursion:
  -- 1. User is the member
  -- 2. User created the pod
  user_id = auth.uid() OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  -- For insert/update:
  -- 1. Creating own owner membership
  -- 2. Pod creator
  (user_id = auth.uid() AND role = 'owner') OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

-- Create simplified themes policy
CREATE POLICY "themes_access"
ON themes
AS PERMISSIVE FOR ALL
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

-- Create single insights policy with minimal access checks
CREATE POLICY "insights_access"
ON insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Only allow access to:
  -- 1. Creator of the insight
  created_by = auth.uid()
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Create simplified insight_themes policy
CREATE POLICY "insight_themes_access"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Only allow access if:
  -- 1. User owns the theme
  theme_id IN (
    SELECT id FROM themes WHERE created_by = auth.uid()
  )
);

-- Create simplified insight_customers policy
CREATE POLICY "insight_customers_access"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Only allow access if:
  -- 1. User owns the insight
  insight_id IN (
    SELECT id FROM insights WHERE created_by = auth.uid()
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_insight_customers_insight_id ON insight_customers(insight_id);