import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Question {
  id: number;
  question: string;
  choices: Record<string, string>;
  answer: string;
  explanation: string;
}

interface Chapter {
  number: number;
  title: string;
  questions: Question[];
}

interface MCQData {
  chapters: Chapter[];
}

// Embedded MCQ data - this is a subset for initial import
const mcqData: MCQData = {
  chapters: []
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the data from request body
    const requestData: MCQData = await req.json();
    
    if (!requestData.chapters || requestData.chapters.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No chapters provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing ${requestData.chapters.length} chapters...`);
    
    let totalQuestions = 0;
    
    for (const chapter of requestData.chapters) {
      // Insert chapter
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .upsert({
          chapter_number: chapter.number,
          title: chapter.title,
          description: `Chapter ${chapter.number}`,
          total_questions: chapter.questions.length
        }, { onConflict: 'chapter_number' })
        .select('id')
        .single();

      if (chapterError) {
        console.error(`Error inserting chapter ${chapter.number}:`, chapterError);
        throw chapterError;
      }

      console.log(`Inserted chapter ${chapter.number}: ${chapter.title} with ${chapter.questions.length} questions`);

      // Insert questions for this chapter in batches
      const questionsToInsert = chapter.questions.map(question => ({
        chapter_id: chapterData.id,
        question_number: question.id,
        question_text: question.question,
        options: question.choices,
        correct_answer: question.answer,
        explanation: question.explanation || ''
      }));

      // Batch insert questions
      const { error: questionsError } = await supabase
        .from('questions')
        .upsert(questionsToInsert, { onConflict: 'chapter_id,question_number' });

      if (questionsError) {
        console.error(`Error inserting questions for chapter ${chapter.number}:`, questionsError);
        throw questionsError;
      }
      
      totalQuestions += chapter.questions.length;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Imported ${requestData.chapters.length} chapters and ${totalQuestions} questions` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
