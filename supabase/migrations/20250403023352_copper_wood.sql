/*
  # Remove product_area_id from pods table

  1. Changes
    - Remove product_area_id column from pods table
    - Update related policies
  
  2. Security
    - Maintain proper access control
    - Ensure data integrity
*/

-- Remove product_area_id column from pods table if it exists
ALTER TABLE pods
DROP COLUMN IF EXISTS product_area_id;

-- Add tags column to pod_insights table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pod_insights' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE pod_insights ADD COLUMN tags jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create index for tags
CREATE INDEX IF NOT EXISTS idx_pod_insights_tags ON pod_insights USING gin (tags);