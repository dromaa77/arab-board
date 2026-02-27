-- Add unique constraints needed for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chapters_chapter_number_key'
  ) THEN
    ALTER TABLE public.chapters ADD CONSTRAINT chapters_chapter_number_key UNIQUE (chapter_number);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'questions_chapter_id_question_number_key'
  ) THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_chapter_id_question_number_key UNIQUE (chapter_id, question_number);
  END IF;
END $$;