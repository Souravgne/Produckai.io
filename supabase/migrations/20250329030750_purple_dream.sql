/*
  # Fix pod creation policies

  1. Changes
    - Simplify pod creation and membership policies
    - Remove circular dependencies in policies
    - Add explicit insert policies
*/

-- Drop existing pod member policies
DROP POLICY IF EXISTS "Users can manage pod memberships" ON pod_members;
DROP POLICY IF EXISTS "Users can view pod memberships" ON pod_members;

-- Create simplified pod member policies
CREATE POLICY "Users can insert pod members"
  ON pod_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to add themselves as owners for new pods
    (role = 'owner' AND auth.uid() = user_id) OR
    -- Allow pod owners to add members
    auth.uid() IN (
      SELECT user_id
      FROM pod_members
      WHERE pod_id = pod_members.pod_id
      AND role = 'owner'
    )
  );

CREATE POLICY "Users can view pod members"
  ON pod_members
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see members of pods they belong to
    EXISTS (
      SELECT 1
      FROM pod_members pm
      WHERE pm.pod_id = pod_members.pod_id
      AND pm.user_id = auth.uid()
    )
  );

-- Drop existing pod policies
DROP POLICY IF EXISTS "Users can manage their own pods" ON pods;
DROP POLICY IF EXISTS "Users can view pods they're members of" ON pods;

-- Create simplified pod policies
CREATE POLICY "Users can create pods"
  ON pods
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their pods"
  ON pods
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM pod_members
      WHERE pod_id = pods.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Pod owners can manage pods"
  ON pods
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM pod_members
      WHERE pod_id = pods.id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM pod_members
      WHERE pod_id = pods.id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );