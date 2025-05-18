/*
  # Fix Insights Policies Recursion

  1. Changes
    - Drop existing problematic policies
    - Create new simplified policies without recursion
    - Use direct ownership checks and materialized paths
    - Add optimized indexes for performance
  
  2. Security
    - Maintain proper access control through ownership
    - Prevent infinite recursion with simplified checks
    - Optimize query performance with indexes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "insights_access" ON insights;
DROP POLICY IF EXISTS "insight_themes_access" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access" ON insight_customers;

-- Create simplified insights policy using materialized path approach
CREATE POLICY "insights_access_v2"
ON insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 
    FROM product_areas pa
    WHERE pa.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM themes t
      WHERE t.product_area_id = pa.id
      AND EXISTS (
        SELECT 1
        FROM insight_themes it
        WHERE it.theme_id = t.id
        AND it.insight_id = insights.id
      )
    )
  )
);

-- Create simplified insight_themes policy
CREATE POLICY "insight_themes_access_v2"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM product_areas pa
    WHERE pa.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM themes t
      WHERE t.id = insight_themes.theme_id
      AND t.product_area_id = pa.id
    )
  )
);

-- Create simplified insight_customers policy
CREATE POLICY "insight_customers_access_v2"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM insights i
    WHERE i.id = insight_customers.insight_id
    AND i.created_by = auth.uid()
  )
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);