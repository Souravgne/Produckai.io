/*
  # Seed themes data
  
  1. New Data
    - Adds initial theme records with dummy data
    - Includes priority scores and descriptions
  
  2. Changes
    - Inserts sample themes for testing and development
*/

-- Insert themes data
INSERT INTO themes (
  name,
  description,
  priority_score,
  status,
  is_auto_generated,
  product_area_id
)
SELECT
  themes.name,
  themes.description,
  themes.priority_score,
  'active' as status,
  true as is_auto_generated,
  (SELECT id FROM product_areas LIMIT 1) as product_area_id
FROM (
  VALUES
    (
      'Integration Issues',
      'Issues related to third-party integrations and sync failures',
      85
    ),
    (
      'Data Accuracy',
      'Concerns about data quality and outdated information',
      65
    ),
    (
      'Feature Requests',
      'New feature requests from customers',
      90
    ),
    (
      'User Experience',
      'Feedback about the user interface and navigation',
      60
    ),
    (
      'Security & Compliance',
      'Security requirements and compliance-related requests',
      95
    )
) as themes(name, description, priority_score)
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE themes.name = themes.name
);