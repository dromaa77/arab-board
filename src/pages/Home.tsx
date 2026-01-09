import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineData } from '@/hooks/useOfflineData';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import UniversalSearch from '@/components/UniversalSearch';
import ChapterCard from '@/components/ChapterCard';
import ResetProgressDialog from '@/components/ResetProgressDialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, RotateCcw, Settings, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import bookCover from '@/assets/arab-board-cover.png';
import { clearAllRepetitionData } from '@/lib/spacedRepetition';
import { useQuizSettings } from '@/hooks/useQuizSettings';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  total_questions: number;
}

interface ChapterProgress {
  [chapterId: string]: {
    answered: number;
    correct: number;
    incorrect: number;
  };
}

export default function Home() {
  const { user } = useAuth();
  const { isOnline, getChapters, getProgress } = useOfflineData();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<ChapterProgress>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const { resumeByDefault, setResumeByDefault } = useQuizSettings();
  useEffect(() => {
    // Load chapters - works for both online (with user) and offline modes
    if (user || !isOnline) {
      loadChapters();
    }
  }, [user, isOnline]);

  const loadChapters = async () => {
    try {
      // If offline, use local data
      if (!isOnline) {
        const localChapters = getChapters();
        setChapters(localChapters);
        setProgress(getProgress());
        setIsLoading(false);
        return;
      }

      // Online mode - load from Supabase
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .order('chapter_number');

      if (chaptersError) throw chaptersError;
      

      setChapters(chaptersData || []);

      // Load user progress (only if logged in)
      if (user) {
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('question_id, is_correct, questions(chapter_id)')
          .eq('user_id', user.id);

        if (progressError) throw progressError;

        const progressByChapter: ChapterProgress = {};
        (progressData || []).forEach(p => {
          const chapterId = (p.questions as any)?.chapter_id;
          if (chapterId) {
            if (!progressByChapter[chapterId]) {
              progressByChapter[chapterId] = { answered: 0, correct: 0, incorrect: 0 };
            }
            progressByChapter[chapterId].answered++;
            if (p.is_correct) {
              progressByChapter[chapterId].correct++;
            } else {
              progressByChapter[chapterId].incorrect++;
            }
          }
        });
        setProgress(progressByChapter);
      } else {
        // Use offline progress if not logged in
        setProgress(getProgress());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to offline data on error
      if (!isOnline) {
        setChapters(getChapters());
        setProgress(getProgress());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (!user) return;
    
    setIsResettingAll(true);
    try {
      // Delete all user progress
      await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', user.id);

      // Clear all spaced repetition data
      clearAllRepetitionData();

      // Reset progress state
      setProgress({});
      toast.success('All progress has been reset');
      setShowResetAllDialog(false);
    } catch (error) {
      console.error('Error resetting all progress:', error);
      toast.error('Failed to reset progress');
    } finally {
      setIsResettingAll(false);
    }
  };

  const handleChapterReset = useCallback(() => {
    loadChapters();
  }, [user]);

  const totalQuestions = chapters.reduce((sum, ch) => sum + ch.total_questions, 0);
  const totalAnswered = Object.values(progress).reduce((sum, p) => sum + p.answered, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        {/* About the Source Material */}
        <div className="bg-card rounded-lg border shadow-sm p-6 md:p-8 mb-10 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <div className="shrink-0 mx-auto md:mx-0">
              <img 
                src={bookCover} 
                alt="Arab Board Final Exam" 
                className="w-40 md:w-48 rounded shadow-lg"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3">About Arab Board Final Exam</h2>
              <p className="text-muted-foreground mb-4">
                Comprehensive MCQ collection for <strong className="text-foreground">Arab Board Final Exam</strong> preparation with detailed explanations.
              </p>
              <h3 className="font-semibold text-foreground mb-2">Key Features:</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span><strong>Numbered questions</strong> for easy reference and tracking.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span>MCQs from <strong>ABC 2nd Part</strong> - comprehensive coverage.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span><strong>Previous years exam MCQs</strong> for authentic practice.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span>Spaced repetition and progress tracking for effective learning.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quiz Section - Multiple Chapters */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No chapters found. Please contact support.</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Header with Settings and Stats */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
                  Chapters
                </h2>
                <p className="text-muted-foreground text-lg">
                  {chapters.length} chapters · {totalQuestions} questions · {totalAnswered} answered
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="w-64 hidden md:block">
                  <UniversalSearch />
                </div>
                {/* Settings Popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="end">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Quiz Settings</h4>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-resume" className="text-sm">Auto-resume quizzes</Label>
                        <Switch
                          id="auto-resume"
                          checked={resumeByDefault}
                          onCheckedChange={setResumeByDefault}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        When enabled, quizzes will automatically resume where you left off.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* Reset All Button */}
                {totalAnswered > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowResetAllDialog(true)}
                    className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Reset all progress"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Search */}
            <div className="md:hidden">
              <UniversalSearch />
            </div>

            {/* Chapter Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {chapters.map(chapter => {
                const chapterProgress = progress[chapter.id] || { answered: 0, correct: 0, incorrect: 0 };
                const progressPercent = chapter.total_questions > 0 ? (chapterProgress.answered / chapter.total_questions) * 100 : 0;
                const accuracy = chapterProgress.answered > 0 ? Math.round((chapterProgress.correct / chapterProgress.answered) * 100) : 0;
                
                return (
                  <div 
                    key={chapter.id} 
                    className="bg-card rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow"
                  >
                    {/* Chapter Header */}
                    <div className="mb-4">
                      <p className="text-xs font-medium text-primary mb-1">Chapter {chapter.chapter_number}</p>
                      <h3 className="text-lg font-semibold text-foreground line-clamp-2">{chapter.title}</h3>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Questions</p>
                        <p className="text-sm font-bold text-foreground">{chapter.total_questions}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Done</p>
                        <p className="text-sm font-bold text-foreground">{chapterProgress.answered}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                        <p className="text-sm font-bold text-primary">{accuracy}%</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <Progress value={progressPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1 text-right">{Math.round(progressPercent)}% complete</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        asChild
                        size="sm" 
                        className="flex-1"
                      >
                        <Link to={`/quiz/${chapter.id}`}>
                          {chapterProgress.answered > 0 ? 'Continue' : 'Start'}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                      {chapterProgress.incorrect > 0 && (
                        <Button 
                          asChild
                          variant="outline"
                          size="sm"
                        >
                          <Link to={`/review?chapter=${chapter.id}`}>
                            Review ({chapterProgress.incorrect})
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-16 py-8 border-t">
          <p className="text-sm text-muted-foreground">Designed by Dr.Anonymous</p>
        </footer>
      </main>

      {/* Reset All Dialog */}
      <ResetProgressDialog
        open={showResetAllDialog}
        onOpenChange={setShowResetAllDialog}
        onConfirm={handleResetAll}
        title="Reset All Progress?"
        description="This will permanently delete all your progress across all chapters. This action cannot be undone."
        isLoading={isResettingAll}
      />
    </div>
  );
}
