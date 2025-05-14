/*
  # Fix Insights-Themes Relationship

  1. Changes
    - Remove theme_id from insights table
    - Keep many-to-many relationship through insight_themes
    - Update policies to reflect new structure
  
  2. Security
    - Maintain proper access control
    - Update policies for new structure
*/

-- Remove theme_id from insights table
ALTER TABLE insights 
DROP COLUMN IF EXISTS theme_id;

-- Create optimized indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);

-- Drop existing policies
DROP POLICY IF EXISTS "insights_access_final_v15" ON insights;
DROP POLICY IF EXISTS "insight_themes_access_final_v15" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access_final_v15" ON insight_customers;

-- Create simplified insights policy
CREATE POLICY "insights_access_final_v16"
ON insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. Created the insight
  created_by = auth.uid()
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Create simplified insight_themes policy
CREATE POLICY "insight_themes_access_final_v16"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the associated insight
  EXISTS (
    SELECT 1 FROM insights WHERE id = insight_id AND created_by = auth.uid()
  )
);

-- Create simplified insight_customers policy
CREATE POLICY "insight_customers_access_final_v16"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the associated insight
  EXISTS (
    SELECT 1 FROM insights WHERE id = insight_id AND created_by = auth.uid()
  )
);