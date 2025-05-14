/*
  # Update integration_settings table to support more integration types
  
  1. Changes
    - Remove the CHECK constraint on integration_type to allow any integration type
    - Add index for faster lookups
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop the existing CHECK constraint on integration_type
ALTER TABLE integration_settings 
DROP CONSTRAINT IF EXISTS integration_settings_integration_type_check;

-- Create index for integration_type if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_integration_settings_type ON integration_settings(integration_type);