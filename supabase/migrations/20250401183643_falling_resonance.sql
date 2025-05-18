/*
  # Add Product Area Relationship to Pods

  1. Changes
    - Add product_area_id column to pods table
    - Create foreign key relationship to product_areas table
    - Add index for improved query performance
  
  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Add product_area_id column to pods table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pods' 
    AND column_name = 'product_area_id'
  ) THEN
    ALTER TABLE pods ADD COLUMN product_area_id uuid REFERENCES product_areas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for product_area_id
CREATE INDEX IF NOT EXISTS idx_pods_product_area_id ON pods(product_area_id);

-- Create index for combined queries
CREATE INDEX IF NOT EXISTS idx_pods_created_by_product_area ON pods(created_by, product_area_id);