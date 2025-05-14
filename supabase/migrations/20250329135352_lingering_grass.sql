/*
  # Simplify policies to eliminate recursion

  1. Changes
    - Drops all existing policies to start fresh
    - Creates minimal pod_members policies with direct ownership checks
    - Simplifies themes policies to use direct user ownership
  
  2. Security
    - Maintains row level security through direct ownership checks
    - Eliminates potential for policy recursion
    - Preserves necessary access control
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Pod owners can manage pod members" ON pod_members;
DROP POLICY IF EXISTS "Pod owners can manage members" ON pod_members;
DROP POLICY IF EXISTS "Users can create initial pod membership" ON pod_members;
DROP POLICY IF EXISTS "Users can create owner membership" ON pod_members;
DROP POLICY IF EXISTS "Users can view pod members" ON pod_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON pod_members;
DROP POLICY IF EXISTS "allow_pod_owner_management" ON pod_members;
DROP POLICY IF EXISTS "allow_view_own_memberships" ON pod_members;
DROP POLICY IF EXISTS "allow_create_owner_membership" ON pod_members;
DROP POLICY IF EXISTS "pod_members_owner_access" ON pod_members;
DROP POLICY IF EXISTS "pod_members_self_view" ON pod_members;
DROP POLICY IF EXISTS "pod_members_owner_insert" ON pod_members;
DROP POLICY IF EXISTS "Users can view insights in their pods" ON insights;
DROP POLICY IF EXISTS "Users can view their product area themes" ON themes;
DROP POLICY IF EXISTS "Users can manage their product area themes" ON themes;
DROP POLICY IF EXISTS "Users can view themes in their product areas" ON themes;
DROP POLICY IF EXISTS "Users can manage their themes" ON themes;
DROP POLICY IF EXISTS "allow_view_owned_themes" ON themes;
DROP POLICY IF EXISTS "allow_manage_owned_themes" ON themes;
DROP POLICY IF EXISTS "themes_owner_access" ON themes;

-- Create single pod_members policy for all operations
CREATE POLICY "pod_members_access"
ON pod_members
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  -- User is the pod owner
  EXISTS (
    SELECT 1 FROM pods
    WHERE pods.id = pod_members.pod_id
    AND pods.created_by = auth.uid()
  )
  OR
  -- User is the member themselves
  user_id = auth.uid()
);

-- Create single themes policy for all operations
CREATE POLICY "themes_access"
ON themes
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM product_areas
    WHERE product_areas.id = themes.product_area_id
    AND product_areas.user_id = auth.uid()
  )
);