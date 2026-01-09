import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTextSettings } from '@/hooks/useTextSettings';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSwipe } from '@/hooks/useSwipe';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import NotesPanel from '@/components/NotesPanel';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { updateRepetition } from '@/lib/spacedRepetition';
import { 
  ArrowLeft, Star, StickyNote, Loader2, 
  Check, X, RefreshCw, Keyboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string | null;
  chapter_id: string;
  chapter_number?: number;
  chapter_title?: string;
}

export default function ReviewQuiz() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getTextStyle } = useTextSettings();
  const topRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  
  const textStyle = getTextStyle();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasNote, setHasNote] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  const questionIds = searchParams.get('ids')?.split(',') || [];
  const reviewType = searchParams.get('type') || 'incorrect';
  const currentQuestion = questions[currentIndex];

  // Get option keys for keyboard shortcuts
  const optionKeys = useMemo(() => {
    if (!currentQuestion) return [];
    return Object.keys(currentQuestion.options);
  }, [currentQuestion]);

  // Navigation functions
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const goPrevious = () => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSpace: () => {
      if (!showAnswer) {
        setShowAnswer(true);
      }
    },
    onArrowLeft: goPrevious,
    onArrowRight: goNext,
    onKeyA: () => !showAnswer && optionKeys[0] && handleSelectAnswer(optionKeys[0]),
    onKeyB: () => !showAnswer && optionKeys[1] && handleSelectAnswer(optionKeys[1]),
    onKeyC: () => !showAnswer && optionKeys[2] && handleSelectAnswer(optionKeys[2]),
    onKeyD: () => !showAnswer && optionKeys[3] && handleSelectAnswer(optionKeys[3]),
    onKeyE: () => !showAnswer && optionKeys[4] && handleSelectAnswer(optionKeys[4]),
  }, !showNotes);

  // Swipe gestures
  const { handlers: swipeHandlers, swipeState } = useSwipe({
    onSwipeLeft: goNext,
    onSwipeRight: goPrevious,
  }, 75);

  useEffect(() => {
    if (user && questionIds.length > 0) {
      loadQuestions();
    } else {
      navigate('/review');
    }
  }, [user]);

  useEffect(() => {
    if (currentQuestion && user) {
      checkBookmarkAndNote();
      setSelectedAnswer(null);
      setShowAnswer(false);
    }
  }, [currentQuestion, user]);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          chapters (
            chapter_number,
            title
          )
        `)
        .in('id', questionIds);

      if (error) throw error;

      const formattedQuestions = (data || []).map(q => ({
        ...q,
        options: q.options as Record<string, string>,
        chapter_number: (q.chapters as any)?.chapter_number,
        chapter_title: (q.chapters as any)?.title
      }));

      const orderedQuestions = questionIds
        .map(id => formattedQuestions.find(q => q.id === id))
        .filter(Boolean) as Question[];

      setQuestions(orderedQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({ title: 'Failed to load questions', variant: 'destructive' });
      navigate('/review');
    } finally {
      setIsLoading(false);
    }
  };

  const checkBookmarkAndNote = async () => {
    if (!currentQuestion) return;

    const [bookmarkResult, noteResult] = await Promise.all([
      supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user!.id)
        .eq('question_id', currentQuestion.id)
        .maybeSingle(),
      supabase
        .from('notes')
        .select('id')
        .eq('user_id', user!.id)
        .eq('question_id', currentQuestion.id)
        .maybeSingle()
    ]);

    setIsBookmarked(!!bookmarkResult.data);
    setHasNote(!!noteResult.data);
  };

  const handleSelectAnswer = async (key: string) => {
    if (showAnswer) return;
    setSelectedAnswer(key);
    
    const isCorrect = key === currentQuestion.correct_answer;
    setShowAnswer(true);
    
    setSessionResults(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));

    // Update spaced repetition
    updateRepetition(currentQuestion.id, isCorrect);

    try {
      await supabase
        .from('user_progress')
        .upsert({
          user_id: user!.id,
          question_id: currentQuestion.id,
          selected_answer: key,
          is_correct: isCorrect
        }, {
          onConflict: 'user_id,question_id'
        });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const toggleBookmark = async () => {
    if (!currentQuestion) return;

    try {
      if (isBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user!.id)
          .eq('question_id', currentQuestion.id);
        setIsBookmarked(false);
        toast({ title: 'Bookmark removed' });
      } else {
        await supabase
          .from('bookmarks')
          .insert({
            user_id: user!.id,
            question_id: currentQuestion.id
          });
        setIsBookmarked(true);
        toast({ title: 'Question bookmarked!' });
      }
    } catch (error) {
      toast({ title: 'Failed to update bookmark', variant: 'destructive' });
    }
  };

  const handleComplete = () => {
    navigate('/review', {
      state: {
        completed: true,
        correct: sessionResults.correct,
        total: questions.length
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No questions to review.</p>
        <Button asChild>
          <Link to="/review">Back to Review</Link>
        </Button>
      </div>
    );
  }

  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  
  // Swipe transform
  const swipeTransform = swipeState.isSwiping && Math.abs(swipeState.deltaX) > 20
    ? `translateX(${Math.min(Math.max(swipeState.deltaX * 0.3, -50), 50)}px)`
    : 'translateX(0)';

  return (
    <div className="min-h-screen bg-background" ref={topRef}>
      <Header />
      
      <main className="container py-6">
        {/* Progress Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/review">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit
              </Link>
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {reviewType === 'incorrect' ? 'Incorrect' : reviewType === 'bookmarked' ? 'Bookmarked' : 'Smart Review'}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">{currentIndex + 1}</span>
              <span className="text-muted-foreground">/{questions.length}</span>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Keyboard Hints */}
        <div className="hidden lg:flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Keyboard className="h-3 w-3" />
            Shortcuts:
          </span>
          <span>← → Navigate</span>
          <span>Space: Show Answer</span>
          <span>A-E: Select</span>
        </div>

        <div 
          className="flex flex-col lg:flex-row gap-6"
          ref={questionRef}
          {...swipeHandlers}
          style={{ 
            transform: swipeTransform,
            transition: swipeState.isSwiping ? 'none' : 'transform 0.2s ease-out',
            touchAction: 'pan-y pinch-zoom'
          }}
        >
          {/* Main Content */}
          <div className="flex-1">
            {/* Chapter Info */}
            <div className="text-sm text-primary font-medium mb-2">
              Chapter {currentQuestion.chapter_number}: {currentQuestion.chapter_title}
            </div>

            {/* Question Text */}
            <h2 className="text-xl font-medium mb-6 leading-relaxed" style={textStyle}>
              <span className="text-primary font-semibold">Q{currentQuestion.question_number}.</span>{' '}
              {currentQuestion.question_text}
            </h2>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {Object.entries(currentQuestion.options).map(([key, value], idx) => {
                const isSelected = selectedAnswer === key;
                const isCorrect = key === currentQuestion.correct_answer;
                
                let optionStyles = "bg-muted/50 hover:bg-muted border-transparent";
                let indicatorStyles = "border-2 border-muted-foreground/30";
                
                if (showAnswer) {
                  if (isCorrect) {
                    optionStyles = "bg-success/10 border-success";
                    indicatorStyles = "bg-success border-success text-success-foreground";
                  } else if (isSelected && !isCorrect) {
                    optionStyles = "bg-destructive/10 border-destructive";
                    indicatorStyles = "bg-destructive border-destructive text-destructive-foreground";
                  }
                } else if (isSelected) {
                  optionStyles = "bg-primary/10 border-primary";
                  indicatorStyles = "bg-primary border-primary text-primary-foreground";
                }

                const shortcutKey = String.fromCharCode(65 + idx);

                return (
                  <button
                    key={key}
                    onClick={() => handleSelectAnswer(key)}
                    disabled={showAnswer}
                    className={cn(
                      "w-full text-left p-4 rounded-lg transition-all flex items-center gap-4 border-2",
                      optionStyles,
                      !showAnswer && "cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all text-sm font-medium",
                      indicatorStyles
                    )}>
                      {showAnswer && isCorrect ? <Check className="h-4 w-4" /> : 
                       showAnswer && isSelected && !isCorrect ? <X className="h-4 w-4" /> : 
                       shortcutKey}
                    </div>
                    <span className="flex-1" style={textStyle}>{value}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showAnswer && currentQuestion.explanation && (
              <div className="p-5 rounded-lg bg-muted/50 border-l-4 border-primary/30 mb-6 animate-fade-in">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={textStyle}>
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Swipe hint */}
            <p className="lg:hidden text-center text-xs text-muted-foreground mb-4">
              ← Swipe to navigate →
            </p>
          </div>

          {/* Sidebar */}
          <div className="lg:w-48 flex lg:flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
            <Button
              variant="outline"
              onClick={goPrevious}
              disabled={currentIndex === 0}
              className="flex-1 lg:flex-none"
            >
              ← Previous
            </Button>
            
            {currentIndex === questions.length - 1 ? (
              <Button onClick={handleComplete} className="flex-1 lg:flex-none">
                Finish Review
              </Button>
            ) : (
              <Button
                onClick={goNext}
                className="flex-1 lg:flex-none"
              >
                Next →
              </Button>
            )}

            <div className="hidden lg:flex flex-col gap-2 mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBookmark}
                className={cn("justify-start", isBookmarked && "text-star")}
              >
                <Star className={cn("h-4 w-4 mr-2", isBookmarked && "fill-current")} />
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotes(true)}
                className={cn("justify-start", hasNote && "text-primary")}
              >
                <StickyNote className={cn("h-4 w-4 mr-2", hasNote && "fill-current")} />
                {hasNote ? 'View Notes' : 'Add Notes'}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Actions */}
        <div className="lg:hidden flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleBookmark}
            className={cn("flex-1", isBookmarked && "text-star border-star")}
          >
            <Star className={cn("h-4 w-4 mr-2", isBookmarked && "fill-current")} />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotes(true)}
            className={cn("flex-1", hasNote && "text-primary border-primary")}
          >
            <StickyNote className={cn("h-4 w-4 mr-2", hasNote && "fill-current")} />
            Notes
          </Button>
        </div>

        {/* Session Score */}
        {sessionResults.total > 0 && (
          <div className="mt-6 p-4 bg-card rounded-lg border text-center">
            <span className="text-sm text-muted-foreground">Session Score: </span>
            <span className="font-semibold text-success">{sessionResults.correct}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold">{sessionResults.total}</span>
            <span className="text-sm text-muted-foreground ml-2">
              ({Math.round((sessionResults.correct / sessionResults.total) * 100)}%)
            </span>
          </div>
        )}
      </main>

      <NotesPanel
        questionId={currentQuestion?.id || ''}
        isOpen={showNotes}
        onClose={() => {
          setShowNotes(false);
          checkBookmarkAndNote();
        }}
      />
    </div>
  );
}
