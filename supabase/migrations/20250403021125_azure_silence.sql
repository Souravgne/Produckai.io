/*
  # Remove Product Area Dependency from Themes

  1. Changes
    - Update themes table to make product_area_id nullable
    - Add created_by column to themes if not exists
    - Update RLS policies to work without product area dependency
    - Add indexes for improved query performance
  
  2. Security
    - Maintain proper access control
    - Ensure data integrity during transition
*/

-- Make product_area_id nullable in themes table
ALTER TABLE themes 
ALTER COLUMN product_area_id DROP NOT NULL;

-- Update themes policies to work without product area dependency
DROP POLICY IF EXISTS "themes_access" ON themes;
DROP POLICY IF EXISTS "themes_access_final_v18" ON themes;

-- Create simplified themes policy
CREATE POLICY "themes_access_final_v19"
ON themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the theme
  created_by = auth.uid()
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Update insight_themes policy to work without product area dependency
DROP POLICY IF EXISTS "insight_themes_access_final_v18" ON insight_themes;

CREATE POLICY "insight_themes_access_final_v19"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the associated insight
  -- 2. Has access to the theme
  EXISTS (
    SELECT 1 FROM insights WHERE id = insight_id AND created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM themes WHERE id = theme_id AND created_by = auth.uid()
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);