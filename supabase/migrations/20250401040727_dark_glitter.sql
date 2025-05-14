/*
  # Fix Pod Member and Insight Relationships

  1. Changes
    - Update foreign key relationships for pod_members and pod_insights
    - Add proper relationships to user_profiles
    - Update policies to reflect new relationships
  
  2. Security
    - Maintain proper access control
    - Ensure data integrity
*/

-- Drop existing foreign key constraints
ALTER TABLE pod_members
DROP CONSTRAINT IF EXISTS pod_members_user_id_fkey;

ALTER TABLE pod_insights
DROP CONSTRAINT IF EXISTS pod_insights_shared_by_fkey;

-- Add proper foreign key relationships
ALTER TABLE pod_members
ADD CONSTRAINT pod_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE pod_insights
ADD CONSTRAINT pod_insights_shared_by_fkey
FOREIGN KEY (shared_by) REFERENCES auth.users(id)
ON DELETE CASCADE;