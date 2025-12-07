-- Make veiyo an admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('428eb219-a0de-421d-8f07-de0aacd72962', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE username = 'veiyo';