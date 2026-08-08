/*
# Fix signup failure — function search_path + remove auth.users mutation

## Problem
Sign-up returned HTTP 500 "Database error saving new user".

Root cause: the `promote_first_user` SECURITY DEFINER trigger function
on `auth.users` had a mutable search_path. When Supabase Auth inserts a
new user, the session search_path does not include the `public` schema,
so the unqualified `profiles` / `auth.users` references inside the
function failed to resolve, raising an error that aborted the signup
transaction.

A second trigger, `sync_profile_meta`, updated `auth.users` from inside
a profile trigger — a nested mutation of auth.users during the signup
flow that added further risk of transaction failure.

## Changes
1. Drop the `sync_profile_meta` trigger and function entirely. The app
   reads `role` / `is_admin` directly from the `profiles` table, so the
   JWT metadata mirror is redundant and not worth the auth.users mutation.
2. Recreate `promote_first_user`, `recalc_honour_score`, and
   `auto_ban_low_honour` with an explicit `search_path = public, auth`
   so unqualified table references always resolve regardless of the
   caller's search_path. This also clears the database linter warning
   about mutable search paths.
3. Re-attach the existing triggers to the corrected functions.
4. Add a permissive INSERT policy on `profiles` for authenticated users
   (owner-scoped) as a safety net so the profile row can always be
   written after signup if the trigger is ever removed.

## Security
- RLS remains enabled on all tables.
- The new INSERT policy scopes to the owner (`auth.uid() = id`).
- No data is lost; this is purely a function/trigger/policy correction.
*/

-- 1. Remove the risky auth.users-mutating trigger + function
DROP TRIGGER IF EXISTS trg_sync_profile_meta ON profiles;
DROP FUNCTION IF EXISTS sync_profile_meta();

-- 2. Recreate promote_first_user with explicit search_path
DROP TRIGGER IF EXISTS trg_promote_first_user ON auth.users;
DROP FUNCTION IF EXISTS promote_first_user();

CREATE OR REPLACE FUNCTION promote_first_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_count int;
  admin_count int;
BEGIN
  SELECT count(*) INTO user_count FROM auth.users;
  SELECT count(*) INTO admin_count FROM profiles WHERE is_admin = true;
  IF user_count <= 1 AND admin_count = 0 THEN
    INSERT INTO profiles (id, email, full_name, role, is_admin)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Administrator'), 'admin', true);
  ELSE
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_promote_first_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION promote_first_user();

-- 3. Recreate recalc_honour_score with explicit search_path
DROP TRIGGER IF EXISTS trg_recalc_honour ON honour_events;
DROP FUNCTION IF EXISTS recalc_honour_score();

CREATE OR REPLACE FUNCTION recalc_honour_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base int := 100;
  total int;
BEGIN
  SELECT COALESCE(SUM(delta), 0) INTO total
  FROM honour_events WHERE internship_id = NEW.internship_id;
  UPDATE internships
    SET honour_score = GREATEST(base + total, 0),
        updated_at = now()
    WHERE id = NEW.internship_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_honour
  AFTER INSERT ON honour_events
  FOR EACH ROW EXECUTE FUNCTION recalc_honour_score();

-- 4. Recreate auto_ban_low_honour with explicit search_path
DROP TRIGGER IF EXISTS trg_auto_ban ON internships;
DROP FUNCTION IF EXISTS auto_ban_low_honour();

CREATE OR REPLACE FUNCTION auto_ban_low_honour()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  threshold int := 40;
  pid uuid;
BEGIN
  SELECT provider_id INTO pid FROM internships WHERE id = NEW.id;
  IF NEW.honour_score < threshold THEN
    UPDATE internships SET status = 'banned', updated_at = now()
      WHERE id = NEW.id AND status NOT IN ('banned', 'closed');
    IF pid IS NOT NULL THEN
      UPDATE profiles SET is_banned = true WHERE id = pid;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_ban
  AFTER UPDATE OF honour_score ON internships
  FOR EACH ROW
  WHEN (NEW.honour_score IS DISTINCT FROM OLD.honour_score)
  EXECUTE FUNCTION auto_ban_low_honour();

-- 5. Safety-net INSERT policy on profiles (owner-scoped)
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
