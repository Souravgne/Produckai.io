/*
  # Add insights tables and relationships

  1. New Tables
    - insights: Store individual feedback items
      - content: The actual feedback text
      - source: Where the feedback came from
      - sentiment: Positive/negative/neutral
      - frequency: Number of times mentioned
      - created_by: User who created/imported the insight
    
    - insight_themes: Many-to-many relationship between insights and themes
      - confidence_score: AI confidence in theme assignment
    
    - insight_customers: Track customer impact
      - customer_id: Unique customer identifier
      - customer_name: Display name
      - acv_impact: Annual contract value impact

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Prevent infinite recursion in policies

  3. Performance
    - Add indexes for common queries
    - Optimize policy checks
*/

-- Create insights table
CREATE TABLE IF NOT EXISTS insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  source text NOT NULL,
  sentiment text CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  frequency integer DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Create insight_themes table (many-to-many with confidence scores)
CREATE TABLE IF NOT EXISTS insight_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id uuid REFERENCES insights(id) ON DELETE CASCADE,
  theme_id uuid REFERENCES themes(id) ON DELETE CASCADE,
  confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(insight_id, theme_id)
);

ALTER TABLE insight_themes ENABLE ROW LEVEL SECURITY;

-- Create insight_customers table
CREATE TABLE IF NOT EXISTS insight_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id uuid REFERENCES insights(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  customer_name text,
  acv_impact numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(insight_id, customer_id)
);

ALTER TABLE insight_customers ENABLE ROW LEVEL SECURITY;

-- Create policies for insights
CREATE POLICY "insights_access"
ON insights
FOR ALL
TO authenticated
USING (
  -- Direct ownership check without recursion
  created_by = auth.uid() OR
  id IN (
    SELECT i.id
    FROM insights i
    JOIN insight_themes it ON it.insight_id = i.id
    JOIN themes t ON t.id = it.theme_id
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE pa.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for insert/update
  created_by = auth.uid() OR
  id IN (
    SELECT i.id
    FROM insights i
    JOIN insight_themes it ON it.insight_id = i.id
    JOIN themes t ON t.id = it.theme_id
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE pa.user_id = auth.uid()
  )
);

-- Create policies for insight_themes
CREATE POLICY "insight_themes_access"
ON insight_themes
FOR ALL
TO authenticated
USING (
  -- Direct ownership check without recursion
  theme_id IN (
    SELECT t.id
    FROM themes t
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE pa.user_id = auth.uid()
  )
);

-- Create policies for insight_customers
CREATE POLICY "insight_customers_access"
ON insight_customers
FOR ALL
TO authenticated
USING (
  -- Direct ownership check without recursion
  insight_id IN (
    SELECT i.id
    FROM insights i
    JOIN insight_themes it ON it.insight_id = i.id
    JOIN themes t ON t.id = it.theme_id
    JOIN product_areas pa ON pa.id = t.product_area_id
    WHERE pa.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_customers_insight_id ON insight_customers(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_customers_customer_id ON insight_customers(customer_id);

-- Add triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_insights_updated_at'
    AND tgrelid = 'insights'::regclass
  ) THEN
    CREATE TRIGGER update_insights_updated_at
      BEFORE UPDATE ON insights
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;