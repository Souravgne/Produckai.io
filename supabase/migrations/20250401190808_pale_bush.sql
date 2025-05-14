/*
  # Add Tags to POD Insights and Fix Comments Relationship

  1. Changes
    - Add tags column to pod_insights table
    - Update pod_comments to properly reference user_profiles_view
    - Add indexes for improved query performance
  
  2. Security
    - Maintain proper access control
    - Ensure data integrity
*/

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

-- Create view to join user data with profiles if it doesn't exist
CREATE OR REPLACE VIEW user_profiles_view AS
SELECT 
  u.id,
  up.full_name,
  up.role,
  up.department
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.id = u.id;

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pod_insights_tags ON pod_insights USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_pod_insights_pod_id_insight_id ON pod_insights(pod_id, insight_id);
CREATE INDEX IF NOT EXISTS idx_pod_comments_pod_insight_id ON pod_comments(pod_insight_id);