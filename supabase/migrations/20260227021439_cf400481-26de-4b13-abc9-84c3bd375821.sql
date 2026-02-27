-- Fix guest read access for optional-auth mode
-- Recreate SELECT policies as PERMISSIVE so anon/authenticated can read chapters and questions.

DROP POLICY IF EXISTS "Anyone can view chapters" ON public.chapters;
CREATE POLICY "Anyone can view chapters"
ON public.chapters
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
CREATE POLICY "Anyone can view questions"
ON public.questions
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);