-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "pod_members_access_v2" ON pod_members;
DROP POLICY IF EXISTS "pod_members_access_v3" ON pod_members;
DROP POLICY IF EXISTS "pod_members_access_v4" ON pod_members;
DROP POLICY IF EXISTS "pod_members_select" ON pod_members;
DROP POLICY IF EXISTS "pod_members_insert" ON pod_members;
DROP POLICY IF EXISTS "pod_members_modify" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;

-- Create maximally simplified pod_members policy
CREATE POLICY "pod_members_access_v5"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check only:
  -- 1. User is the member themselves
  -- 2. User is pod owner (via direct pods table check)
  user_id = auth.uid() OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  -- For insert/update:
  -- 1. Creating own owner membership
  -- 2. Pod owner
  (user_id = auth.uid() AND role = 'owner') OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

-- Create separate policies for insights table operations
CREATE POLICY "insights_select_v2"
ON insights
FOR SELECT
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the insight
  -- 2. Has access to theme's product area
  created_by = auth.uid() OR
  id IN (
    SELECT DISTINCT it.insight_id
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "insights_insert_v2"
ON insights
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only creator can insert
  created_by = auth.uid()
);

CREATE POLICY "insights_modify_v2"
ON insights
FOR UPDATE
TO authenticated
USING (
  -- Only creator can modify
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "insights_delete_v2"
ON insights
FOR DELETE
TO authenticated
USING (
  -- Only creator can delete
  created_by = auth.uid()
);

-- Create optimized indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);