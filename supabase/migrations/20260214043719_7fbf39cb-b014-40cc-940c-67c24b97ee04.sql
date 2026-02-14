CREATE POLICY "user_profiles_update_own"
ON public.user_profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());