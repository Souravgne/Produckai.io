/*
  # Fix Pod Members and Invitations Access

  1. Changes
    - Fix RLS policies for pod_invitations
    - Add policy for users to view their own profile
    - Add optimized indexes for performance
  
  2. Security
    - Maintain proper access control
    - Allow access to necessary user data
    - Prevent unauthorized access
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Pod owners can manage invitations" ON pod_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON pod_invitations;

-- Create simplified pod_invitations policies
CREATE POLICY "pod_invitations_manage"
ON pod_invitations
FOR ALL
TO authenticated
USING (
  -- Allow access if user:
  -- 1. Is a pod owner
  -- 2. Is the recipient of the invitation
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_members.pod_id = pod_invitations.pod_id
    AND pod_members.user_id = auth.uid()
    AND pod_members.role = 'owner'
  ) OR
  email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
)
WITH CHECK (
  -- Only pod owners can create/modify invitations
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_members.pod_id = pod_invitations.pod_id
    AND pod_members.user_id = auth.uid()
    AND pod_members.role = 'owner'
  )
);

-- Create policy for users to view their own profile
CREATE POLICY "users_view_own_profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  -- Users can view their own profile
  id = auth.uid()
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pod_invitations_email ON pod_invitations(email);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_pod_id_status ON pod_invitations(pod_id, status);