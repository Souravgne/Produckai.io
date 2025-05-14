/*
  # Add Integration Settings Table

  1. New Tables
    - integration_settings: Store integration configurations
      - id (uuid, primary key)
      - user_id (uuid, references users)
      - integration_type (text)
      - access_token (text)
      - refresh_token (text)
      - token_expires_at (timestamptz)
      - workspace_id (text)
      - additional_settings (jsonb)
      - created_at (timestamptz)
      - updated_at (timestamptz)
  
  2. Security
    - Enable RLS on integration_settings table
    - Add policy for users to manage their own integrations
*/

-- Create integration_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type text NOT NULL CHECK (integration_type IN ('hubspot', 'slack')),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  workspace_id text,
  additional_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, integration_type)
);

-- Enable RLS if not already enabled
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid the error
DROP POLICY IF EXISTS "Users can manage their own integrations" ON integration_settings;

-- Create policy for users to manage their own integrations
CREATE POLICY "Users can manage their own integrations"
  ON integration_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for integration type
CREATE INDEX IF NOT EXISTS idx_integration_settings_type ON integration_settings(integration_type);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_integration_settings_updated_at'
    AND tgrelid = 'integration_settings'::regclass
  ) THEN
    CREATE TRIGGER update_integration_settings_updated_at
      BEFORE UPDATE ON integration_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;