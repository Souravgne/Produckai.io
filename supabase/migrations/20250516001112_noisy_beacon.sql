/*
  # Add Status to Insights Table
  
  1. Changes
    - Add status column to insights table
    - Set default status to 'new'
    - Add check constraint for valid status values
    - Update existing insights to have 'new' status
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add status column to insights table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'insights' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE insights ADD COLUMN status text DEFAULT 'new' NOT NULL;
    
    -- Add check constraint for valid status values
    ALTER TABLE insights 
    ADD CONSTRAINT insights_status_check 
    CHECK (status IN ('new', 'read', 'in_review', 'planned'));
  END IF;
END $$;

-- Create index for status column
CREATE INDEX IF NOT EXISTS idx_insights_status ON insights(status);

-- Create index for combined queries
CREATE INDEX IF NOT EXISTS idx_insights_created_by_status ON insights(created_by, status);