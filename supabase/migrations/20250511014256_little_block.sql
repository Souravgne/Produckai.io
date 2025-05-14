/*
  # Update onboarding_progress step_name constraint

  1. Changes
    - Update the step_name check constraint to include new onboarding steps
    - Handle existing records to prevent constraint violations
  
  2. Security
    - Maintain data integrity with updated constraint
*/

-- First, create a temporary table to store existing records
CREATE TEMP TABLE temp_onboarding_progress AS
SELECT * FROM onboarding_progress;

-- Delete all records from the main table
DELETE FROM onboarding_progress;

-- Drop the constraint
ALTER TABLE onboarding_progress
DROP CONSTRAINT IF EXISTS onboarding_progress_step_name_check;

-- Add the new constraint with additional steps
ALTER TABLE onboarding_progress
ADD CONSTRAINT onboarding_progress_step_name_check CHECK (
  step_name = ANY (ARRAY[
    'welcome',
    'role',
    'integrations',
    'product_areas',
    'pod_setup',
    'profile_setup',
    'product_details',
    'product_themes',
    'data_sources'
  ])
);

-- Reinsert the records, fixing any invalid step names
INSERT INTO onboarding_progress (id, user_id, step_name, completed, completed_at, created_at, updated_at)
SELECT 
  id, 
  user_id, 
  CASE 
    WHEN step_name NOT IN (
      'welcome', 'role', 'integrations', 'product_areas', 'pod_setup', 
      'profile_setup', 'product_details', 'product_themes', 'data_sources'
    ) THEN 'welcome'
    ELSE step_name
  END,
  completed, 
  completed_at, 
  created_at, 
  updated_at
FROM temp_onboarding_progress
ON CONFLICT (user_id, step_name) DO NOTHING;

-- Drop the temporary table
DROP TABLE temp_onboarding_progress;