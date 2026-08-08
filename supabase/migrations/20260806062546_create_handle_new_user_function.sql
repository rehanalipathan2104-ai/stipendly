/*
# Server-side profile creation via SECURITY DEFINER function

## Problem
After signUp, the frontend tries to upsert into profiles directly.
If the session isn't established yet (email confirmation on) or
RLS policies block the insert, profile creation silently fails and
the user can't use the app.

## Fix
Create a SECURITY DEFINER function that handles profile creation
server-side (bypasses RLS). The frontend calls it via rpc() after
signUp, and also as a fallback on loadProfile if the profile is
missing.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_is_first boolean;
  v_final_role text;
  v_is_admin boolean;
BEGIN
  SELECT count(*) INTO v_count FROM profiles;
  v_is_first := (v_count = 0);
  v_final_role := CASE WHEN v_is_first THEN 'admin' ELSE p_role END;
  v_is_admin := v_is_first;

  INSERT INTO profiles (id, email, full_name, role, is_admin)
  VALUES (p_user_id, p_email, p_full_name, v_final_role, v_is_admin)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

  RETURN jsonb_build_object(
    'is_first', v_is_first,
    'role', v_final_role,
    'is_admin', v_is_admin
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user(uuid, text, text, text) TO authenticated, anon;
