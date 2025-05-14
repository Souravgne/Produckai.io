/*
  # Fix pod members recursion with simplified policies

  1. Changes
    - Drop existing policies that may cause recursion
    - Create minimal, non-recursive policies for pod_members
    - Simplify themes access control
  
  2. Security
    - Maintain proper access control through direct ownership checks
    - Prevent infinite recursion in policy evaluation
    - Optimize query performance with indexes
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "pod_members_access" ON pod_members;
DROP POLICY IF EXISTS "themes_access" ON themes;

-- Create separate pod_members policies for different operations
CREATE POLICY "pod_members_view"
ON pod_members
FOR SELECT
TO authenticated
USING (
  -- Simple direct checks without recursion:
  -- 1. User is the member
  -- 2. User created the pod
  auth.uid() = user_id OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_insert"
ON pod_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow only if:
  -- 1. User is creating their own owner membership
  -- 2. User is the pod creator
  (auth.uid() = user_id AND role = 'owner') OR
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_modify"
ON pod_members
FOR UPDATE
TO authenticated
USING (
  -- Only pod creators can modify members
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

CREATE POLICY "pod_members_delete"
ON pod_members
FOR DELETE
TO authenticated
USING (
  -- Only pod creators can delete members
  pod_id IN (
    SELECT id FROM pods WHERE created_by = auth.uid()
  )
);

-- Create simplified themes policy
CREATE POLICY "themes_access"
ON themes
FOR ALL
TO authenticated
USING (
  -- Direct ownership checks:
  -- 1. Theme creator
  -- 2. Product area owner
  created_by = auth.uid() OR
  product_area_id IN (
    SELECT id FROM product_areas WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for insert/update
  created_by = auth.uid() OR
  product_area_id IN (
    SELECT id FROM product_areas WHERE user_id = auth.uid()
  )
);

-- Ensure indexes exist for policy performance
CREATE INDEX IF NOT EXISTS idx_pods_created_by ON pods(created_by);
CREATE INDEX IF NOT EXISTS idx_pod_members_user_id ON pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_themes_created_by ON themes(created_by);
CREATE INDEX IF NOT EXISTS idx_themes_product_area_id ON themes(product_area_id);
CREATE INDEX IF NOT EXISTS idx_product_areas_user_id ON product_areas(user_id);