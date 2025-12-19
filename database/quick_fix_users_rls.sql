-- Quick Fix: Reset and Recreate Users Table Policies
-- Run this in Supabase SQL Editor if you're getting 500 errors

-- Step 1: Disable RLS temporarily to check if that's the issue
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.users;

-- Step 3: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, clean policies
CREATE POLICY "users_select_policy"
ON public.users
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users_insert_policy"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_policy"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Step 5: Verify policies were created
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';

-- Step 6: Test a simple query (replace the UUID with your actual user ID)
-- SELECT * FROM users WHERE id = auth.uid();
