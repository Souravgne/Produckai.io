/*
  # Fix infinite recursion in database policies

  1. Changes
    - Drop existing problematic policies
    - Create simplified non-recursive policies
    - Add optimized indexes for performance
  
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Use direct ownership checks
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "pod_members_view" ON pod_members;
DROP POLICY IF EXISTS "pod_members_insert" ON pod_members;
DROP POLICY IF EXISTS "pod_members_modify" ON pod_members;
DROP POLICY IF EXISTS "pod_members_delete" ON pod_members;
DROP POLICY IF EXISTS "themes_access" ON themes;
DROP POLICY IF EXISTS "themes_select" ON themes;
DROP POLICY IF EXISTS "themes_modify" ON themes;
DROP POLICY IF EXISTS "insights_access" ON insights;
DROP POLICY IF EXISTS "insight_themes_access" ON insight_themes;
DROP POLICY IF EXISTS "insight_customers_access" ON insight_customers;

-- Create single simplified pod_members policy
CREATE POLICY "pod_members_access"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Simple direct checks:
  -- 1. User is the member
  -- 2. User created the pod
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
)
WITH CHECK (
  -- For insert/update:
  -- 1. Creating own owner membership
  -- 2. Pod creator
  (auth.uid() = user_id AND role = 'owner') OR
  EXISTS (
    SELECT 1
    FROM pods
    WHERE id = pod_members.pod_id
    AND created_by = auth.uid()
  )
);

-- Create single simplified themes policy
CREATE POLICY "themes_access"
ON themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Simple direct checks:
  -- 1. Theme creator
  -- 2. Product area owner
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM product_areas
    WHERE id = themes.product_area_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for insert/update
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM product_areas
    WHERE id = themes.product_area_id
    AND user_id = auth.uid()
  )
);

-- Create single simplified insights policy
CREATE POLICY "insights_access"
ON insights
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Simple direct checks:
  -- 1. Insight creator
  -- 2. Product area owner of associated theme
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1
    FROM insight_themes it
    JOIN themes t ON t.id = it.theme_id
    WHERE it.insight_id = insights.id
    AND (
      t.created_by = auth.uid() OR
      EXISTS (
        SELECT 1
        FROM product_areas pa
        WHERE pa.id = t.product_area_id
        AND pa.user_id = auth.uid()
      )
    )
  )
);

-- Create single simplified insight_themes policy
CREATE POLICY "insight_themes_access"
ON insight_themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Simple direct check:
  -- Theme creator or product area owner
  EXISTS (
    SELECT 1
    FROM themes t
    WHERE t.id = theme_id
    AND (
      t.created_by = auth.uid() OR
      EXISTS (
        SELECT 1
        FROM product_areas pa
        WHERE pa.id = t.product_area_id
        AND pa.user_id = auth.uid()
      )
    )
  )
);

-- Create single simplified insight_customers policy
CREATE POLICY "insight_customers_access"
ON insight_customers
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- Simple direct check:
  -- Insight creator or product area owner
  EXISTS (
    SELECT 1
    FROM insights i
    WHERE i.id = insight_id
    AND (
      i.created_by = auth.uid() OR
      EXISTS (
        SELECT 1
        FROM insight_themes it
        JOIN themes t ON t.id = it.theme_id
        WHERE it.insight_id = i.id
        AND (
          t.created_by = auth.uid() OR
          EXISTS (
            SELECT 1
            FROM product_areas pa
            WHERE pa.id = t.product_area_id
            AND pa.user_id = auth.uid()
          )
        )
      )
    )
  )
);

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_role ON pod_members(role);
CREATE INDEX IF NOT EXISTS idx_pod_members_composite ON pod_members(pod_id, user_id, role);
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_by ON insights(created_by);
CREATE INDEX IF NOT EXISTS idx_insight_themes_insight_id ON insight_themes(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_themes_theme_id ON insight_themes(theme_id);
CREATE INDEX IF NOT EXISTS idx_insight_customers_insight_id ON insight_customers(insight_id);