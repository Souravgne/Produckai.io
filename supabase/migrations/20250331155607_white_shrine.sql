-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "pod_members_access_v2" ON pod_members;
DROP POLICY IF EXISTS "pod_members_select" ON pod_members;
DROP POLICY IF EXISTS "pod_members_insert" ON pod_members;
DROP POLICY IF EXISTS "pod_members_modify" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;
DROP POLICY IF EXISTS "users_view_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_view_profiles_v2" ON user_profiles;
DROP POLICY IF EXISTS "users_view_pod_profiles" ON user_profiles;
DROP POLICY IF EXISTS "insights_access" ON insights;
DROP POLICY IF EXISTS "insights_select" ON insights;
DROP POLICY IF EXISTS "insights_insert" ON insights;
DROP POLICY IF EXISTS "insights_modify" ON insights;
DROP POLICY IF EXISTS "insights_delete" ON insights;
DROP POLICY IF EXISTS "insight_themes_access" ON insight_themes;
DROP POLICY IF EXISTS "insight_themes_select" ON insight_themes;
DROP POLICY IF EXISTS "insight_themes_insert" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access" ON insight_customers;
DROP POLICY IF EXISTS "insight_customers_select" ON insight_customers;
DROP POLICY IF EXISTS "insight_customers_insert" ON insight_customers;
DROP POLICY IF EXISTS "pod_insights_access" ON pod_insights;
DROP POLICY IF EXISTS "pod_invitations_manage" ON pod_invitations;

-- Create maximally simplified pod_members policy
CREATE POLICY "pod_members_access"
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

-- Create simplified insights policy
CREATE POLICY "insights_access"
ON insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the insight
  -- 2. Has access to theme's product area (via materialized path)
  created_by = auth.uid() OR
  id IN (
    SELECT DISTINCT it.insight_id
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Only creator can insert/update
  created_by = auth.uid()
);

-- Create simplified insight_themes policy
CREATE POLICY "insight_themes_access"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the insight
  -- 2. Has access to theme's product area
  insight_id IN (
    SELECT id FROM insights WHERE created_by = auth.uid()
  ) OR
  theme_id IN (
    SELECT t.id
    FROM themes t
    WHERE t.product_area_id IN (
      SELECT id FROM product_areas WHERE user_id = auth.uid()
    )
  )
);

-- Create simplified insight_customers policy
CREATE POLICY "insight_customers_access"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Created the insight
  insight_id IN (
    SELECT id FROM insights WHERE created_by = auth.uid()
  )
);

-- Create simplified pod_insights policy
CREATE POLICY "pod_insights_access"
ON pod_insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Shared the insight
  -- 2. Member of the pod
  shared_by = auth.uid() OR
  pod_id IN (
    SELECT pod_id FROM pod_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Only allow sharing if member/owner
  pod_id IN (
    SELECT pod_id 
    FROM pod_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'member')
  )
);

-- Create simplified pod_invitations policy
CREATE POLICY "pod_invitations_access"
ON pod_invitations
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Pod owner
  -- 2. Invitation recipient
  pod_id IN (
    SELECT pod_id 
    FROM pod_members 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
  ) OR
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  -- Only pod owners can create/modify
  pod_id IN (
    SELECT pod_id 
    FROM pod_members 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
  )
);

-- Create simplified user_profiles policy
CREATE POLICY "users_view_profiles"
ON user_profiles
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  -- Direct ownership check:
  -- 1. Own profile
  -- 2. Share a pod (via materialized path)
  id = auth.uid() OR
  id IN (
    SELECT DISTINCT pm2.user_id
    FROM pod_members pm1
    JOIN pod_members pm2 ON pm2.pod_id = pm1.pod_id
    WHERE pm1.user_id = auth.uid()
  )
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
CREATE INDEX IF NOT EXISTS idx_pod_insights_shared_by ON pod_insights(shared_by);
CREATE INDEX IF NOT EXISTS idx_pod_insights_pod_id ON pod_insights(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_pod_id ON pod_invitations(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_invitations_email ON pod_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);