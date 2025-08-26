-- Fix user_presence table by adding unique constraint on user_id
-- This will allow upsert to work properly and prevent 409 conflicts

ALTER TABLE public.user_presence 
ADD CONSTRAINT user_presence_user_id_unique UNIQUE (user_id);