/*
  # Product Management Database Schema

  1. New Tables
    - product_areas: Track different product areas/features
    - pods: Team collaboration spaces
    - pod_members: Pod membership and roles
    - themes: Product feedback themes
    - insights: Individual feedback items
    - feedback_sources: Integration configurations

  2. Security
    - RLS enabled on all tables
    - Policies for user-specific access
    - Pod-based access control

  3. Indexes
    - Optimized for common queries
    - Foreign key relationships
*/

-- Create tables in dependency order
CREATE TABLE IF NOT EXISTS product_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE product_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their product areas"
  ON product_areas
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pods (Team Spaces)
CREATE TABLE IF NOT EXISTS pods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pods ENABLE ROW LEVEL SECURITY;

-- Pod Members (create before pod policies that reference it)
CREATE TABLE IF NOT EXISTS pod_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid REFERENCES pods(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(pod_id, user_id)
);

ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;

-- Now we can create pod policies that reference pod_members
CREATE POLICY "Pod creators can manage their pods"
  ON pods
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view pods they're members of"
  ON pods
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM pod_members WHERE pod_id = pods.id
    )
  );

CREATE POLICY "Users can view pod memberships"
  ON pod_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM pod_members WHERE pod_id = pod_members.pod_id
    )
  );

-- Themes
CREATE TABLE IF NOT EXISTS themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  product_area_id uuid REFERENCES product_areas(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  priority_score integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view themes in their pods"
  ON themes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM pod_members 
      WHERE pod_id IN (
        SELECT pod_id FROM product_areas WHERE id = themes.product_area_id
      )
    )
  );

-- Insights
CREATE TABLE IF NOT EXISTS insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid REFERENCES themes(id) ON DELETE CASCADE,
  content text NOT NULL,
  source text NOT NULL,
  sentiment text CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights in their pods"
  ON insights
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM pod_members 
      WHERE pod_id IN (
        SELECT pod_id FROM product_areas 
        WHERE id IN (
          SELECT product_area_id FROM themes WHERE id = insights.theme_id
        )
      )
    )
  );

-- Feedback Sources
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

ALTER TABLE feedback_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their feedback sources"
  ON feedback_sources
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_areas_updated_at
  BEFORE UPDATE ON product_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pods_updated_at
  BEFORE UPDATE ON pods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insights_updated_at
  BEFORE UPDATE ON insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_sources_updated_at
  BEFORE UPDATE ON feedback_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_product_areas_user_id ON product_areas(user_id);
CREATE INDEX idx_pods_created_by ON pods(created_by);
CREATE INDEX idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX idx_insights_theme_id ON insights(theme_id);
CREATE INDEX idx_feedback_sources_user_id ON feedback_sources(user_id);
CREATE INDEX idx_feedback_sources_type ON feedback_sources(source_type);