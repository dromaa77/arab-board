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
      let totalQuestions = 0;

      // Send chapters one at a time to the edge function (uses service role)
      for (let i = 0; i < chapters.length; i++) {
        const { data, error } = await supabase.functions.invoke('import-mcq-data', {
          body: [chapters[i]]
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);

        totalQuestions += chapters[i].items.length;
        setProgress(((i + 1) / totalChapters) * 100);
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
