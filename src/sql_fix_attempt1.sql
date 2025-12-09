-- ============================================================
-- GROWTH PLAN BUILDER - FIX FOR SIGNUP PROFILE CREATION
-- ============================================================
-- The issue: RLS policy blocks profile INSERT because user 
-- isn't fully authenticated yet (email confirmation pending)
-- 
-- Solution: Allow authenticated users to insert their own profile
-- OR allow service-level insert (we'll use a more permissive policy)
-- ============================================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create a more permissive insert policy
-- This allows any authenticated user to insert a row where id matches their auth.uid()
-- The key insight: even with email confirmation pending, auth.uid() is available
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- If the above still doesn't work (email confirmation blocks auth.uid()),
-- we need to allow the insert from the signup flow directly.
-- This is safe because the id must be a valid UUID from auth.users

-- Alternative: Allow insert if the id exists in auth.users
-- Uncomment below if the above doesn't work:

-- DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
-- CREATE POLICY "Allow profile creation for valid auth users"
--   ON user_profiles
--   FOR INSERT
--   TO authenticated, anon
--   WITH CHECK (
--     EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = user_profiles.id)
--   );

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'user_profiles';
