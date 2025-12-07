-- Add admin role for user xmlsfuak
INSERT INTO public.user_roles (user_id, role)
VALUES ('4d6368a5-fd4c-43cd-a1c2-c330000129a3', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;