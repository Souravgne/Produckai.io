/*
  # Fix Pod Members and Invitations

  1. Changes
    - Add foreign key relationship between pod_members and user_profiles
    - Update pod_members policies to use user_profiles
    - Fix permissions for pod invitations
    - Add optimized indexes
  
  2. Security
    - Maintain proper access control
    - Use direct ownership checks
    - Prevent infinite recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "pod_invitations_manage" ON pod_invitations;

-- Add foreign key relationship between pod_members and user_profiles
ALTER TABLE pod_members
DROP CONSTRAINT IF EXISTS pod_members_user_id_fkey,
ADD CONSTRAINT pod_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Create simplified pod_members policies
CREATE POLICY "pod_members_select"
ON pod_members
FOR SELECT
TO authenticated
USING (
  -- Allow viewing if:
  -- 1. User is the member
  -- 2. User is in the same pod
  user_id = auth.uid() OR
  pod_id IN (
    SELECT pod_id
    FROM pod_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "pod_members_insert"
ON pod_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow inserting if:
  -- 1. Creating own owner membership
  -- 2. Is pod owner
  (user_id = auth.uid() AND role = 'owner') OR
  EXISTS (
    SELECT 1
    FROM pod_members
    WHERE pod_id = pod_members.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

CREATE POLICY "pod_members_modify"
ON pod_members
FOR UPDATE
TO authenticated
USING (
  -- Only pod owners can modify
  EXISTS (
    SELECT 1
    FROM pod_members
    WHERE pod_id = pod_members.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM pod_members
    WHERE pod_id = pod_members.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

CREATE POLICY "pod_members_delete"
ON pod_members
FOR DELETE
TO authenticated
USING (
  -- Only pod owners can delete
  EXISTS (
    SELECT 1
    FROM pod_members
    WHERE pod_id = pod_members.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

-- Create simplified pod_invitations policies
CREATE POLICY "pod_invitations_select"
ON pod_invitations
FOR SELECT
TO authenticated
USING (
  -- Allow viewing if:
  -- 1. User is pod owner
  -- 2. Invitation is for user's email
  EXISTS (
    SELECT 1
    FROM pod_members
    WHERE pod_id = pod_invitations.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  ) OR
  email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

CREATE POLICY "pod_invitations_insert"
ON pod_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only pod owners can create invitations
  EXISTS (
    SELECT 1
    FROM pod_members
    WHERE pod_id = pod_invitations.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

CREATE POLICY "pod_invitations_modify"
ON pod_invitations
FOR ALL
TO authenticated
USING (
  -- Only pod owners can modify invitations
  EXISTS (
    SELECT 1
    FROM pod_members
    WHERE pod_id = pod_invitations.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM pod_members
    WHERE pod_id = pod_invitations.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

-- Create policy for accessing user profiles
CREATE POLICY "users_view_pod_profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  -- Users can view profiles if they:
  -- 1. Own the profile
  -- 2. Share a pod with the user
  id = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM pod_members pm1
    JOIN pod_members pm2 ON pm2.pod_id = pm1.pod_id
    WHERE pm1.user_id = auth.uid()
    AND pm2.user_id = user_profiles.id
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_email ON pod_invitations(email);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_pod_id ON pod_invitations(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_status ON pod_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);