/*
  # Create company_data table for storing HubSpot company information
  
  1. New Tables
    - company_data: Store company information from HubSpot
      - id (uuid, primary key)
      - user_id (uuid, references users)
      - hubspot_id (text)
      - name (text)
      - domain (text)
      - industry (text)
      - annual_revenue (numeric)
      - size (text)
      - location (text)
      - created_date (timestamptz)
      - last_modified_date (timestamptz)
      - properties (jsonb)
      - created_at (timestamptz)
      - updated_at (timestamptz)
  
  2. Security
    - Enable RLS on company_data table
    - Add policy for users to manage their own company data
*/

-- Create company_data table
CREATE TABLE IF NOT EXISTS company_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  hubspot_id text NOT NULL,
  name text,
  domain text,
  industry text,
  annual_revenue numeric,
  size text,
  location text,
  created_date timestamptz,
  last_modified_date timestamptz,
  properties jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, hubspot_id)
);

-- Enable RLS
ALTER TABLE company_data ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own company data
CREATE POLICY "Users can manage their own company data"
  ON company_data
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_data_user_id ON company_data(user_id);
CREATE INDEX IF NOT EXISTS idx_company_data_hubspot_id ON company_data(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_company_data_name ON company_data(name);
CREATE INDEX IF NOT EXISTS idx_company_data_domain ON company_data(domain);
CREATE INDEX IF NOT EXISTS idx_company_data_industry ON company_data(industry);

-- Create trigger for updated_at
CREATE TRIGGER update_company_data_updated_at
  BEFORE UPDATE ON company_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();