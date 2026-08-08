/*
# Fix infinite recursion in profiles SELECT policy

## Problem
The `profiles_select_own_or_admin` policy checks admin status via:
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
This selects FROM profiles inside a policy ON profiles → infinite recursion.

## Fix
1. Create a SECURITY DEFINER function `is_admin(p_uid uuid)` that checks
   admin status bypassing RLS (no recursive policy evaluation).
2. Drop the recursive policy and recreate it using the function.
*/

CREATE OR REPLACE FUNCTION public.is_admin(p_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = p_uid),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));
