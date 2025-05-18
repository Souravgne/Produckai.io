/*
  # Add Feedback Sources Table

  1. New Tables
    - feedback_sources: Store configuration for different feedback sources
      - id (uuid, primary key)
      - user_id (uuid, references users)
      - source_type (text, check constraint)
      - configuration (jsonb)
      - is_active (boolean)
      - last_sync_at (timestamptz)
      - created_at (timestamptz)
      - updated_at (timestamptz)
  
  2. Security
    - Enable RLS on feedback_sources table
    - Add policy for users to manage their own feedback sources
*/

-- Create feedback_sources table if it doesn't exist
CREATE TABLE IF NOT EXISTS feedback_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('slack', 'hubspot', 'document')),
  configuration jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE feedback_sources ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid the error
DROP POLICY IF EXISTS "Users can manage their feedback sources" ON feedback_sources;

-- Create policy for users to manage their own feedback sources
CREATE POLICY "Users can manage their feedback sources"
  ON feedback_sources
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feedback_sources_user_id ON feedback_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sources_type ON feedback_sources(source_type);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_feedback_sources_updated_at'
    AND tgrelid = 'feedback_sources'::regclass
  ) THEN
    CREATE TRIGGER update_feedback_sources_updated_at
      BEFORE UPDATE ON feedback_sources
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;