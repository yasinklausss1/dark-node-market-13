-- Update profile role to admin for xmlsfuak
UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE username = 'xmlsfuak';