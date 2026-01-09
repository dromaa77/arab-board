import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import mcqData from '@/data/mcq_data.json';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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

interface ImportResult {
  success: boolean;
  message?: string;
  error?: string;
}

const ImportData = () => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const navigate = useNavigate();

  const handleImport = async () => {
    if (importing) return;
    setImporting(true);
    setProgress(0);
    setResult(null);
    setHasStarted(true);

    try {
      const chapters = mcqData as ChapterData[];
      const totalChapters = chapters.length;
      let processedChapters = 0;
      let totalQuestions = 0;

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const chapterNumber = i + 1;
        const items = chapter.items || [];

        // Convert answerIndex to answer letter (A, B, C, D, E)
        const getAnswerLetter = (index: number): string => {
          const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          return letters[index] || 'A';
        };

        // Convert options array to object format { A: "...", B: "...", etc }
        const formatOptions = (options: string[]): Record<string, string> => {
          const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          const formatted: Record<string, string> = {};
          options.forEach((option, idx) => {
            if (idx < letters.length) {
              formatted[letters[idx]] = option;
            }
          });
          return formatted;
        };

        const { data: chapterData, error: chapterError } = await supabase
          .from('chapters')
          .upsert(
            {
              chapter_number: chapterNumber,
              title: chapter.chapter,
              description: `Chapter ${chapterNumber}`,
              total_questions: items.length,
            },
            { onConflict: 'chapter_number' }
          )
          .select('id')
          .single();

        if (chapterError) {
          console.error(`Error inserting chapter ${chapterNumber}:`, chapterError);
          throw chapterError;
        }

        const questionsToInsert = items.map((item: QuestionItem, idx: number) => ({
          chapter_id: chapterData.id,
          question_number: idx + 1,
          question_text: item.question,
          options: formatOptions(item.options),
          correct_answer: getAnswerLetter(item.answerIndex),
          explanation: item.explanation || '',
        }));

        if (questionsToInsert.length > 0) {
          // Insert in batches of 100 to avoid timeout
          const batchSize = 100;
          for (let j = 0; j < questionsToInsert.length; j += batchSize) {
            const batch = questionsToInsert.slice(j, j + batchSize);
            const { error: questionsError } = await supabase
              .from('questions')
              .upsert(batch, { onConflict: 'chapter_id,question_number' });

            if (questionsError) {
              console.error(`Error inserting questions for chapter ${chapterNumber}:`, questionsError);
              throw questionsError;
            }
          }
        }

        totalQuestions += items.length;
        processedChapters++;
        setProgress((processedChapters / totalChapters) * 100);
      }

      setResult({
        success: true,
        message: `Successfully imported ${totalChapters} chapters and ${totalQuestions} questions!`
      });
      toast.success('Data imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (!hasStarted && !result) {
      handleImport();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import MCQ Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Importing all chapters and questions into the database.
          </p>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Importing... {Math.round(progress)}%
              </p>
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className={result.success ? 'text-success' : 'text-destructive'}>
                  {result.success ? result.message : result.error}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={importing}
              className="flex-1"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Retry Import
                </>
              )}
            </Button>
            
            {result?.success && (
              <Button variant="outline" onClick={() => navigate('/')}>
                Go to Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportData;
