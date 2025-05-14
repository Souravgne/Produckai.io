/*
  # Create onboarding progress table and policies

  1. New Tables
    - `onboarding_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `step_name` (text)
      - `completed` (boolean)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `onboarding_progress` table
    - Add policy for authenticated users to manage their own onboarding progress

  3. Indexes
    - Create index on `user_id` for faster lookups
    - Create index on `step_name` for faster lookups
*/

-- Create onboarding_progress table
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT onboarding_progress_user_id_step_name_key UNIQUE (user_id, step_name),
  CONSTRAINT onboarding_progress_step_name_check CHECK (
    step_name = ANY (ARRAY[
      'welcome',
      'role',
      'integrations',
      'product_areas',
      'pod_setup'
    ])
  )
);

-- Enable RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own onboarding progress if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'onboarding_progress' 
    AND policyname = 'Users can manage their own onboarding progress'
  ) THEN
    CREATE POLICY "Users can manage their own onboarding progress"
      ON onboarding_progress
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Create updated_at trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_onboarding_progress_updated_at'
  ) THEN
    CREATE TRIGGER update_onboarding_progress_updated_at
      BEFORE UPDATE ON onboarding_progress
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- Create indexes for faster lookups if they don't exist
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_step ON onboarding_progress(step_name);