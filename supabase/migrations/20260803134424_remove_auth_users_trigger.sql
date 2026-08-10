/*
# Remove auth.users trigger — handle profile creation from the frontend

## Problem
Sign-up still fails with "Database error saving new user". The trigger
`trg_promote_first_user` on `auth.users` runs inside Supabase's auth
signup transaction. Any failure inside that trigger aborts the entire
signup. The exact cause is hard to isolate without server logs, but
triggers on `auth.users` that write to user tables are fragile in
Supabase because they run inside the auth service's own transaction
context.

## Fix
1. Drop the `trg_promote_first_user` trigger and its function. Profile
   creation is now handled by the frontend immediately after a
   successful `signUp()` call, using an upsert with `onConflict: 'id'`.
2. Add a permissive INSERT policy on `profiles` scoped to the owner so
   the frontend can create its own profile row after signup.
3. Keep the "first user becomes admin" logic, but move it to the
   frontend: after signup, if no other profiles exist, the new user
   promotes themselves to admin.

## Security
- RLS stays enabled. The new INSERT policy is owner-scoped
  (`auth.uid() = id`), so a user can only create their own profile.
- No data is lost.
*/

-- 1. Drop the problematic trigger + function
DROP TRIGGER IF EXISTS trg_promote_first_user ON auth.users;
DROP FUNCTION IF EXISTS promote_first_user();

-- 2. Owner-scoped INSERT policy on profiles (so frontend can create its row)
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
