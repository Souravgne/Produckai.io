/*
  # Add POD Spaces Schema

  1. New Tables
    - pods: Store POD space details
    - pod_members: Track POD membership and roles
    - pod_invitations: Manage pending invites
    - pod_insights: Track insights shared to PODs
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Ensure data isolation between PODs
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "pods_create" ON pods;
DROP POLICY IF EXISTS "pods_select" ON pods;
DROP POLICY IF EXISTS "pods_modify" ON pods;
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "pod_invitations_access" ON pod_invitations;
DROP POLICY IF EXISTS "pod_insights_access" ON pod_insights;

-- Create pods table if it doesn't exist
CREATE TABLE IF NOT EXISTS pods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pod_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS pod_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid REFERENCES pods(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member', 'viewer')),
  created_at timestamptz DEFAULT now(),
  joined_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  UNIQUE(pod_id, user_id)
);

-- Create pod_invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS pod_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid REFERENCES pods(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('member', 'viewer')),
  status pod_invitation_status DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pod_id, email)
);

-- Create pod_insights table if it doesn't exist
CREATE TABLE IF NOT EXISTS pod_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid REFERENCES pods(id) ON DELETE CASCADE,
  insight_id uuid REFERENCES insights(id) ON DELETE CASCADE,
  shared_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pod_id, insight_id)
);

-- Enable RLS
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_insights ENABLE ROW LEVEL SECURITY;

-- Create policies for pods
CREATE POLICY "pods_create_v2"
ON pods
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow authenticated users to create pods
  auth.uid() = created_by
);

CREATE POLICY "pods_select_v2"
ON pods
FOR SELECT
TO authenticated
USING (
  -- Users can view pods they:
  -- 1. Created
  -- 2. Are a member of
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM pod_members
    WHERE pod_id = pods.id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "pods_modify_v2"
ON pods
FOR ALL
TO authenticated
USING (
  -- Only pod creators can modify
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

-- Create policies for pod_members
CREATE POLICY "pod_members_access_v2"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. User is the member
  -- 2. User created the pod
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
)
WITH CHECK (
  -- For insert/update:
  -- 1. Creating own owner membership
  -- 2. Pod creator
  (user_id = auth.uid() AND role = 'owner') OR
  EXISTS (
    SELECT 1 FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
);

-- Create policies for pod_invitations
CREATE POLICY "pod_invitations_access_v2"
ON pod_invitations
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. User is pod owner
  -- 2. Invitation is for user's email
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_id = pod_invitations.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  ) OR
  email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
)
WITH CHECK (
  -- Only pod owners can create/modify invitations
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_id = pod_invitations.pod_id
    AND user_id = auth.uid()
    AND role = 'owner'
  )
);

-- Create policies for pod_insights
CREATE POLICY "pod_insights_access_v2"
ON pod_insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. User shared the insight
  -- 2. User is pod member
  shared_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_id = pod_insights.pod_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  -- Only allow sharing if member/owner
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_id = pod_insights.pod_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'member')
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_pod_id ON pod_invitations(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_email ON pod_invitations(email);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_status ON pod_invitations(status);
CREATE INDEX IF NOT EXISTS idx_pod_insights_pod_id ON pod_insights(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_insights_insight_id ON pod_insights(insight_id);
CREATE INDEX IF NOT EXISTS idx_pod_insights_shared_by ON pod_insights(shared_by);

-- Handle triggers in a safe way using DO block
DO $$
BEGIN
  -- Drop triggers if they exist
  DROP TRIGGER IF EXISTS update_pods_updated_at ON pods;
  DROP TRIGGER IF EXISTS update_pod_invitations_updated_at ON pod_invitations;

  -- Create triggers
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_pods_updated_at'
    AND tgrelid = 'pods'::regclass
  ) THEN
    CREATE TRIGGER update_pods_updated_at
      BEFORE UPDATE ON pods
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_pod_invitations_updated_at'
    AND tgrelid = 'pod_invitations'::regclass
  ) THEN
    CREATE TRIGGER update_pod_invitations_updated_at
      BEFORE UPDATE ON pod_invitations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;