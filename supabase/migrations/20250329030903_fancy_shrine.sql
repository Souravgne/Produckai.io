/*
  # Add pod creation and membership policies

  1. Changes
    - Add policy for authenticated users to create pods
    - Add policy for pod membership creation
    - Ensure proper security checks for initial pod setup

  2. Security
    - Only allow authenticated users to create pods
    - Ensure pod creators can set up initial ownership
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create pods" ON pods;
DROP POLICY IF EXISTS "Users can create initial pod membership" ON pod_members;

-- Add policy for users to create pods
CREATE POLICY "Users can create pods"
  ON pods
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Add policy for initial pod membership creation
CREATE POLICY "Users can create initial pod membership"
  ON pod_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to create their own membership as owner
    (auth.uid() = user_id AND role = 'owner') OR
    -- Allow pod owners to add members
    auth.uid() IN (
      SELECT user_id
      FROM pod_members
      WHERE pod_id = pod_members.pod_id
      AND role = 'owner'
    )
  );