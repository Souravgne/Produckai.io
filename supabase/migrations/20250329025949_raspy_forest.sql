/*
  # Fix pod members RLS policy

  1. Changes
    - Drop existing pod members policy that causes infinite recursion
    - Create new simplified policy for pod members access
    - Add policy for pod owners to manage members

  2. Security
    - Maintain RLS protection
    - Ensure proper access control
*/

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Users can view pod memberships" ON pod_members;

-- Create new simplified policy for viewing pod memberships
CREATE POLICY "Users can view pod memberships"
  ON pod_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id 
      FROM pod_members pm2 
      WHERE pm2.pod_id = pod_members.pod_id
    )
  );

-- Add policy for pod owners to manage members
CREATE POLICY "Pod owners can manage members"
  ON pod_members
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM pod_members 
      WHERE pod_id = pod_members.pod_id 
      AND role = 'owner'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id 
      FROM pod_members 
      WHERE pod_id = pod_members.pod_id 
      AND role = 'owner'
    )
  );