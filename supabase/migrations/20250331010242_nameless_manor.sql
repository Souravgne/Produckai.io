/*
  # Fix insights policies and remove frequency column

  1. Changes
    - Drop existing insights policies to prevent recursion
    - Create simplified policies with direct ownership checks
    - Remove frequency column from insights table
    - Add optimized indexes for performance

  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Preserve data integrity
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "insights_access" ON insights;

-- Remove frequency column from insights table
ALTER TABLE insights DROP COLUMN IF EXISTS frequency;

-- Create simplified insights policy
CREATE POLICY "insights_select"
ON insights
FOR SELECT
TO authenticated
USING (
  -- User can view insights if they:
  -- 1. Created the insight
  -- 2. Own the product area the insight's theme belongs to
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE it.insight_id = insights.id
    AND pa.user_id = auth.uid()
  )
);

CREATE POLICY "insights_insert"
ON insights
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can insert insights if they:
  -- 1. Are the creator
  created_by = auth.uid()
);

CREATE POLICY "insights_modify"
ON insights
FOR UPDATE
TO authenticated
USING (
  -- User can modify insights if they:
  -- 1. Created the insight
  -- 2. Own the product area the insight's theme belongs to
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE it.insight_id = insights.id
    AND pa.user_id = auth.uid()
  )
)
WITH CHECK (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE it.insight_id = insights.id
    AND pa.user_id = auth.uid()
  )
);

CREATE POLICY "insights_delete"
ON insights
FOR DELETE
TO authenticated
USING (
  -- User can delete insights if they:
  -- 1. Created the insight
  -- 2. Own the product area the insight's theme belongs to
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE it.insight_id = insights.id
    AND pa.user_id = auth.uid()
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_theme ON insight_themes(insight_id, theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_created_by ON themes(product_area_id, created_by);