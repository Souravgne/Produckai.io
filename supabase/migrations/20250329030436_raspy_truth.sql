/*
  # Fix pod creation policies

  1. Changes
    - Drop and recreate pod creation policies
    - Add policy for pod member creation
    - Simplify policy checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create pods" ON pods;
DROP POLICY IF EXISTS "Users can create initial pod membership" ON pod_members;

-- Recreate pod creation policy
CREATE POLICY "Users can create pods"
  ON pods
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add policy for pod member creation
CREATE POLICY "Users can create pod members"
  ON pod_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT created_by FROM pods WHERE id = pod_id
    )
  );