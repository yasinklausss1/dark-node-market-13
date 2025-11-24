-- ===================================================
-- CRITICAL SECURITY FIX: Proper Role Management System
-- ===================================================

-- Step 1: Create the app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'seller', 'user');

-- Step 2: Create the user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Step 3: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Step 5: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 6: Create helper function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_primary_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'moderator' THEN 2
      WHEN 'seller' THEN 3
      WHEN 'user' THEN 4
    END
  LIMIT 1
$$;

-- Step 7: Migrate existing roles - ONLY for users that exist in auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.user_id,
  CASE p.role::text
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'seller' THEN 'seller'::public.app_role
    ELSE 'user'::public.app_role
  END
FROM public.profiles p
INNER JOIN auth.users u ON u.id = p.user_id
WHERE p.role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 8: Create trigger to auto-assign roles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- If metadata specifies seller role, add that too
  IF NEW.raw_user_meta_data->>'role' = 'seller' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'seller')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Step 9: Update the existing get_user_role function to use new table
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- For backwards compatibility, convert app_role back to user_role
  SELECT CASE public.get_user_primary_role(user_uuid)::text
    WHEN 'admin' THEN 'admin'::user_role
    WHEN 'seller' THEN 'seller'::user_role
    ELSE 'user'::user_role
  END
$$;

-- Step 10: Add comment to deprecate profiles.role column
COMMENT ON COLUMN public.profiles.role IS 'DEPRECATED: Use user_roles table instead. This column should not be trusted for authorization. Kept for backwards compatibility only.';

-- Grant permissions
GRANT SELECT ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_primary_role(UUID) TO authenticated;