/*
  # Add POD Spaces Schema

  1. New Tables
    - pod_insights: Track insights shared to pods
    - pod_invitations: Manage pending invites
    - Update pod_members with additional fields
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Ensure data isolation between pods
*/

-- Add status enum type for pod invitations
CREATE TYPE pod_invitation_status AS ENUM ('pending', 'accepted', 'declined');

-- Add last_active_at to pod_members
ALTER TABLE pod_members
ADD COLUMN joined_at timestamptz DEFAULT now(),
ADD COLUMN last_active_at timestamptz DEFAULT now();

-- Create pod_insights table
CREATE TABLE IF NOT EXISTS pod_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid REFERENCES pods(id) ON DELETE CASCADE,
  insight_id uuid REFERENCES insights(id) ON DELETE CASCADE,
  shared_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pod_id, insight_id)
);

-- Create pod_invitations table
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

-- Enable RLS
ALTER TABLE pod_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for pod_insights
CREATE POLICY "Users can view pod insights"
ON pod_insights
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_members.pod_id = pod_insights.pod_id
    AND pod_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can share insights to pods they belong to"
ON pod_insights
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_members.pod_id = pod_insights.pod_id
    AND pod_members.user_id = auth.uid()
    AND pod_members.role IN ('owner', 'member')
  )
);

-- Create policies for pod_invitations
CREATE POLICY "Pod owners can manage invitations"
ON pod_invitations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_members.pod_id = pod_invitations.pod_id
    AND pod_members.user_id = auth.uid()
    AND pod_members.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pod_members
    WHERE pod_members.pod_id = pod_invitations.pod_id
    AND pod_members.user_id = auth.uid()
    AND pod_members.role = 'owner'
  )
);

CREATE POLICY "Users can view invitations sent to their email"
ON pod_invitations
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pod_insights_pod_id ON pod_insights(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_insights_insight_id ON pod_insights(insight_id);
CREATE INDEX IF NOT EXISTS idx_pod_insights_shared_by ON pod_insights(shared_by);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_pod_id ON pod_invitations(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_email ON pod_invitations(email);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_status ON pod_invitations(status);

-- Add trigger for updating pod_invitations.updated_at
CREATE TRIGGER update_pod_invitations_updated_at
  BEFORE UPDATE ON pod_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();