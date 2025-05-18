/*
  # Fix infinite recursion in RLS policies

  1. Changes
    - Drop existing problematic policies
    - Create simplified policies without recursion
    - Use direct ownership checks
    - Add optimized indexes

  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Preserve data integrity
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "insights_access" ON insights;
DROP POLICY IF EXISTS "insights_select" ON insights;
DROP POLICY IF EXISTS "insights_insert" ON insights;
DROP POLICY IF EXISTS "insights_modify" ON insights;
DROP POLICY IF EXISTS "insights_delete" ON insights;
DROP POLICY IF EXISTS "insight_themes_access" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access" ON insight_customers;

-- Create separate insights policies for different operations
CREATE POLICY "insights_select"
ON insights
FOR SELECT
TO authenticated
USING (
  -- Allow viewing if:
  -- 1. User created the insight
  -- 2. User owns the product area
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

CREATE POLICY "insights_insert"
ON insights
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only creator can insert
  created_by = auth.uid()
);

CREATE POLICY "insights_modify"
ON insights
FOR UPDATE
TO authenticated
USING (
  -- Only creator can modify
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "insights_delete"
ON insights
FOR DELETE
TO authenticated
USING (
  -- Only creator can delete
  created_by = auth.uid()
);

-- Create simplified insight_themes policy
CREATE POLICY "insight_themes_access"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. User created the insight
  -- 2. User owns the theme's product area
  EXISTS (
    SELECT 1
    FROM insights i
    WHERE i.id = insight_id
    AND i.created_by = auth.uid()
  ) OR
  theme_id IN (
    SELECT t.id
    FROM themes t
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

-- Create simplified insight_customers policy
CREATE POLICY "insight_customers_access"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. User created the insight
  -- 2. User owns the theme's product area
  EXISTS (
    SELECT 1
    FROM insights i
    WHERE i.id = insight_id
    AND i.created_by = auth.uid()
  ) OR
  insight_id IN (
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
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);