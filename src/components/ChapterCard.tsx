import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, ChevronRight, RotateCcw } from 'lucide-react';
import { useTextSettings } from '@/hooks/useTextSettings';
import ResetProgressDialog from '@/components/ResetProgressDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { clearRepetitionForChapter } from '@/lib/spacedRepetition';

interface ChapterProgress {
  answered: number;
  correct: number;
  incorrect: number;
}

interface ChapterCardProps {
  id: string;
  chapterNumber: number;
  title: string;
  totalQuestions: number;
  progress: ChapterProgress;
  onReset?: () => void;
}

export default function ChapterCard({ id, chapterNumber, title, totalQuestions, progress, onReset }: ChapterCardProps) {
  const progressPercent = totalQuestions > 0 ? (progress.answered / totalQuestions) * 100 : 0;
  const { getTextStyle } = useTextSettings();
  const { user } = useAuth();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowResetDialog(true);
  };

  const confirmReset = async () => {
    if (!user) return;
    
    setIsResetting(true);
    try {
      // Get all question IDs for this chapter
      const { data: questions } = await supabase
        .from('questions')
        .select('id')
        .eq('chapter_id', id);

      if (questions && questions.length > 0) {
        const questionIds = questions.map(q => q.id);

        // Delete progress for these questions
        await supabase
          .from('user_progress')
          .delete()
          .eq('user_id', user.id)
          .in('question_id', questionIds);

        // Clear spaced repetition data for this chapter
        clearRepetitionForChapter(questionIds);
      }

      toast.success(`Chapter ${chapterNumber} progress reset`);
      setShowResetDialog(false);
      onReset?.();
    } catch (error) {
      console.error('Error resetting chapter:', error);
      toast.error('Failed to reset chapter progress');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Link to={`/quiz/${id}`}>
        <Card className="h-full hover:shadow-md transition-all hover:border-primary/30 group cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-primary mb-1">Chapter {chapterNumber}</div>
                <h3 
                  className="font-semibold text-sm leading-tight line-clamp-2"
                  style={getTextStyle()}
                >
                  {title}
                </h3>
              </div>
              <div className="flex items-center gap-1 shrink-0 mt-1">
                {progress.answered > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleReset}
                    title="Reset chapter progress"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
            
            <Progress value={progressPercent} className="h-1.5 mb-3" />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.answered}/{totalQuestions}</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5 text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  {progress.correct}
                </span>
                <span className="flex items-center gap-0.5 text-destructive">
                  <XCircle className="h-3 w-3" />
                  {progress.incorrect}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      <ResetProgressDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={confirmReset}
        title={`Reset Chapter ${chapterNumber}?`}
        description={`This will delete all your progress for "${title}". This action cannot be undone.`}
        isLoading={isResetting}
      />
    </>
  );
}
