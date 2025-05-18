-- Create pod_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS pod_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_insight_id uuid REFERENCES pod_insights(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pod_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "pod_comments_access" ON pod_comments;
DROP POLICY IF EXISTS "pod_comments_access_v2" ON pod_comments;
DROP POLICY IF EXISTS "pod_comments_access_v3" ON pod_comments;

-- Create pod_comments policy with unique name
CREATE POLICY "pod_comments_access_v4"
ON pod_comments
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Allow access if:
  -- 1. Created the comment
  -- 2. Is a member of the pod
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM pod_insights pi
    JOIN pod_members pm ON pm.pod_id = pi.pod_id
    WHERE pi.id = pod_comments.pod_insight_id
    AND pm.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Only allow creating/updating if:
  -- 1. Is the comment author
  -- 2. Is a member of the pod
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1
    FROM pod_insights pi
    JOIN pod_members pm ON pm.pod_id = pi.pod_id
    WHERE pi.id = pod_comments.pod_insight_id
    AND pm.user_id = auth.uid()
  )
);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_pod_comments_updated_at'
    AND tgrelid = 'pod_comments'::regclass
  ) THEN
    CREATE TRIGGER update_pod_comments_updated_at
      BEFORE UPDATE ON pod_comments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create optimized indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_pod_comments_user_id ON pod_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_comments_pod_insight_id ON pod_comments(pod_insight_id);
CREATE INDEX IF NOT EXISTS idx_pod_comments_created_at ON pod_comments(created_at);

-- Drop existing trigger function if it exists
DROP FUNCTION IF EXISTS handle_pod_invitation CASCADE;

-- Create trigger function for handling invitations
CREATE FUNCTION handle_pod_invitation()
RETURNS trigger AS $$
BEGIN
  -- When an invitation is accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get the user ID for the email
    WITH user_lookup AS (
      SELECT id 
      FROM auth.users 
      WHERE email = NEW.email
      LIMIT 1
    )
    -- Create pod membership
    INSERT INTO pod_members (pod_id, user_id, role)
    SELECT 
      NEW.pod_id,
      user_lookup.id,
      NEW.role
    FROM user_lookup
    WHERE NOT EXISTS (
      SELECT 1 
      FROM pod_members 
      WHERE pod_id = NEW.pod_id 
      AND user_id = user_lookup.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pod invitations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_pod_invitation_update'
    AND tgrelid = 'pod_invitations'::regclass
  ) THEN
    CREATE TRIGGER on_pod_invitation_update
      AFTER UPDATE ON pod_invitations
      FOR EACH ROW
      WHEN (NEW.status IS DISTINCT FROM OLD.status)
      EXECUTE FUNCTION handle_pod_invitation();
  END IF;
END $$;