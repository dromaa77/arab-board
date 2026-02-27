import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface QuestionItem {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface ChapterData {
  chapter: string;
  items: QuestionItem[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const chaptersData: ChapterData[] = await req.json();

    if (!chaptersData || chaptersData.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No chapters provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${chaptersData.length} chapters...`);

    let totalQuestions = 0;

    for (let i = 0; i < chaptersData.length; i++) {
      const ch = chaptersData[i];
      const chapterNumber = i + 1;
      // Extract title after "Chapter X: "
      const title = ch.chapter.replace(/^Chapter \d+:\s*/, '');

      const { data: chapterRow, error: chapterError } = await supabase
        .from('chapters')
        .upsert({
          chapter_number: chapterNumber,
          title: title,
          description: ch.chapter,
          total_questions: ch.items.length
        }, { onConflict: 'chapter_number' })
        .select('id')
        .single();

      if (chapterError) {
        console.error(`Error inserting chapter ${chapterNumber}:`, chapterError);
        throw chapterError;
      }

      console.log(`Chapter ${chapterNumber}: ${title} (${ch.items.length} questions)`);

      // Convert options array to object { A: "...", B: "...", ... }
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const questionsToInsert = ch.items.map((item, idx) => {
        const optionsObj: Record<string, string> = {};
        item.options.forEach((opt, oi) => {
          optionsObj[letters[oi]] = opt;
        });
        const correctLetter = letters[item.answerIndex] || 'A';
        return {
          chapter_id: chapterRow.id,
          question_number: idx + 1,
          question_text: item.question,
          options: optionsObj,
          correct_answer: correctLetter,
          explanation: item.explanation || ''
        };
      });

      // Batch insert in groups of 100
      for (let b = 0; b < questionsToInsert.length; b += 100) {
        const batch = questionsToInsert.slice(b, b + 100);
        const { error: qErr } = await supabase
          .from('questions')
          .upsert(batch, { onConflict: 'chapter_id,question_number' });
        if (qErr) {
          console.error(`Error inserting questions batch for ch ${chapterNumber}:`, qErr);
          throw qErr;
        }
      }

      totalQuestions += ch.items.length;
    }

    return new Response(
      JSON.stringify({ success: true, message: `Imported ${chaptersData.length} chapters and ${totalQuestions} questions` }),
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
