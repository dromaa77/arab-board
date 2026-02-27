import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTextSettings } from '@/hooks/useTextSettings';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSwipe } from '@/hooks/useSwipe';
import { useQuizSettings } from '@/hooks/useQuizSettings';
import { useOfflineData } from '@/hooks/useOfflineData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import NotesPanel from '@/components/NotesPanel';
import ResumeDialog from '@/components/ResumeDialog';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { updateRepetition, sortByPriority } from '@/lib/spacedRepetition';
import { 
  ArrowLeft, Star, StickyNote, Loader2, 
  Check, X, Keyboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string | null;
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
}

export default function Quiz() {
  const { chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getTextStyle } = useTextSettings();
  const { resumeByDefault } = useQuizSettings();
  const { isOnline, getQuestions, getChapters, saveAnswer, getAnswer } = useOfflineData();
  const topRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasNote, setHasNote] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeInfo, setResumeInfo] = useState<{ lastIndex: number; answeredCount: number } | null>(null);
  const [userProgress, setUserProgress] = useState<{ [questionId: string]: { answer: string; isCorrect: boolean } }>({});
  const [useSpacedRepetition, setUseSpacedRepetition] = useState(true);

  const currentQuestion = questions[currentIndex];
  const textStyle = getTextStyle();

  // Get option keys for keyboard shortcuts
  const optionKeys = useMemo(() => {
    if (!currentQuestion) return [];
    return Object.keys(currentQuestion.options);
  }, [currentQuestion]);

  // Spaced repetition sorting
  const sortedQuestions = useMemo(() => {
    if (!useSpacedRepetition) return questions;
    return sortByPriority(questions);
  }, [questions, useSpacedRepetition]);

  // Calculate score
  const chapterQuestionIds = questions.map(q => q.id);
  const correctCount = chapterQuestionIds.filter(id => userProgress[id]?.isCorrect).length;
  const incorrectCount = chapterQuestionIds.filter(id => userProgress[id] && !userProgress[id].isCorrect).length;

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
        handleShowAnswer();
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
    if (chapterId) {
      loadQuiz();
    }
  }, [user, chapterId, isOnline]);

  useEffect(() => {
    const questionNum = searchParams.get('q');
    if (questionNum && questions.length > 0) {
      const index = questions.findIndex(q => q.question_number === parseInt(questionNum));
      if (index >= 0) setCurrentIndex(index);
    }
  }, [searchParams, questions]);

  useEffect(() => {
    if (currentQuestion) {
      if (user && isOnline) {
        checkBookmarkAndNote();
      }
      const existing = userProgress[currentQuestion.id];
      if (existing) {
        setSelectedAnswer(existing.answer);
        setShowAnswer(true);
      } else {
        setSelectedAnswer(null);
        setShowAnswer(false);
      }
    }
  }, [currentQuestion, user, userProgress, isOnline]);

  const loadQuiz = async () => {
    try {
      // Offline mode - use local data
      if (!isOnline) {
        // Extract chapter number from chapterId (format: local-chapter-{number})
        const chapterMatch = chapterId?.match(/local-chapter-(\d+)/);
        const chapterNumber = chapterMatch ? parseInt(chapterMatch[1]) : null;
        
        if (chapterNumber) {
          const localChapters = getChapters();
          const localChapter = localChapters.find(c => c.chapter_number === chapterNumber);
          if (localChapter) {
            setChapter({ id: localChapter.id, chapter_number: localChapter.chapter_number, title: localChapter.title });
          }
          
          const localQuestions = getQuestions(chapterNumber);
          setQuestions(localQuestions as any);
          
          // Load offline progress
          const progressMap: { [id: string]: { answer: string; isCorrect: boolean } } = {};
          localQuestions.forEach(q => {
            const answer = getAnswer(q.id);
            if (answer) {
              progressMap[q.id] = { answer: answer.selectedAnswer, isCorrect: answer.isCorrect };
            }
          });
          setUserProgress(progressMap);
        }
        setIsLoading(false);
        return;
      }

      // Online mode
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (chapterError) throw chapterError;
      setChapter(chapterData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('question_number');

      if (questionsError) throw questionsError;
      const loadedQuestions = (questionsData || []).map(q => ({
        ...q,
        options: q.options as Record<string, string>
      }));
      setQuestions(loadedQuestions);

      // Only load progress if user is logged in
      let progressData: any[] = [];
      if (user) {
        const { data } = await supabase
          .from('user_progress')
          .select('question_id, selected_answer, is_correct')
          .eq('user_id', user.id);
        progressData = data || [];
      }

      const progressMap: { [id: string]: { answer: string; isCorrect: boolean } } = {};
      progressData.forEach(p => {
        progressMap[p.question_id] = { answer: p.selected_answer, isCorrect: p.is_correct };
      });
      setUserProgress(progressMap);

      // Check for resume functionality
      const questionNum = searchParams.get('q');
      if (!questionNum && loadedQuestions.length > 0) {
        // Find progress for this chapter's questions
        const chapterQuestionIds = loadedQuestions.map(q => q.id);
        const answeredInChapter = chapterQuestionIds.filter(id => progressMap[id]);
        
        if (answeredInChapter.length > 0 && answeredInChapter.length < loadedQuestions.length) {
          // Find the first unanswered question
          const firstUnansweredIndex = loadedQuestions.findIndex(q => !progressMap[q.id]);
          const lastIndex = firstUnansweredIndex >= 0 ? firstUnansweredIndex : loadedQuestions.length - 1;
          
          if (lastIndex > 0) {
            setResumeInfo({
              lastIndex,
              answeredCount: answeredInChapter.length
            });
            
            // If auto-resume is enabled, just go to the resume point
            if (resumeByDefault) {
              setCurrentIndex(lastIndex);
            } else {
              // Show the resume dialog
              setShowResumeDialog(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast({ title: 'Failed to load quiz', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = () => {
    if (resumeInfo) {
      setCurrentIndex(resumeInfo.lastIndex);
    }
    setShowResumeDialog(false);
  };

  const handleStartOver = () => {
    setCurrentIndex(0);
    setShowResumeDialog(false);
  };

  const checkBookmarkAndNote = async () => {
    if (!currentQuestion || !user) return;

    const [bookmarkResult, noteResult] = await Promise.all([
      supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_id', currentQuestion.id)
        .maybeSingle(),
      supabase
        .from('notes')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_id', currentQuestion.id)
        .maybeSingle()
    ]);

    setIsBookmarked(!!bookmarkResult.data);
    setHasNote(!!noteResult.data);
  };

  const handleSelectAnswer = async (key: string) => {
    if (showAnswer) return;
    setSelectedAnswer(key);
    
    // Check if the answer is unknown
    if (currentQuestion.correct_answer === 'UNKNOWN') {
      setShowAnswer(true);
      toast({ 
        title: 'Answer Unknown', 
        description: 'The correct answer for this question is not available yet. It will be updated soon.',
        variant: 'default'
      });
      return;
    }
    
    const isCorrect = key === currentQuestion.correct_answer;
    setShowAnswer(true);

    // Update spaced repetition data
    updateRepetition(currentQuestion.id, isCorrect);

    // Offline mode - save locally
    if (!isOnline) {
      saveAnswer(currentQuestion.id, key, isCorrect);
      setUserProgress(prev => ({
        ...prev,
        [currentQuestion.id]: { answer: key, isCorrect }
      }));
      return;
    }

    // Online mode - save to Supabase
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

      setUserProgress(prev => ({
        ...prev,
        [currentQuestion.id]: { answer: key, isCorrect }
      }));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleShowAnswer = () => {
    if (!currentQuestion || showAnswer) return;
    setShowAnswer(true);
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
    const answeredInChapter = chapterQuestionIds.filter(id => userProgress[id]);
    const correctInChapter = answeredInChapter.filter(id => userProgress[id]?.isCorrect);

    navigate(`/results/${chapterId}`, {
      state: {
        total: questions.length,
        answered: answeredInChapter.length,
        correct: correctInChapter.length
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

  if (!chapter || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No questions found in this chapter.</p>
        <Button asChild>
          <Link to="/">Back to Chapters</Link>
        </Button>
      </div>
    );
  }

  // Calculate swipe transform for visual feedback
  const swipeTransform = swipeState.isSwiping && Math.abs(swipeState.deltaX) > 20
    ? `translateX(${Math.min(Math.max(swipeState.deltaX * 0.3, -50), 50)}px)`
    : 'translateX(0)';

  return (
    <div className="min-h-screen bg-background" ref={topRef}>
      <Header />
      
      <main className="container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div 
            className="flex-1"
            ref={questionRef}
            {...swipeHandlers}
            style={{ 
              transform: swipeTransform,
              transition: swipeState.isSwiping ? 'none' : 'transform 0.2s ease-out',
              touchAction: 'pan-y pinch-zoom'
            }}
          >
            {/* Top Bar */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <Button variant="outline" size="sm" asChild className="rounded-full">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              
              <h1 className="text-lg font-semibold flex-1 text-center">
                Ch. {chapter.chapter_number}: {chapter.title}
              </h1>
              
              <div className="flex items-center gap-2 text-sm">
                <span>{currentIndex + 1}/{questions.length}</span>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-success">
                  <Check className="h-4 w-4" />
                  {correctCount}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-destructive">
                  <X className="h-4 w-4" />
                  {incorrectCount}
                </span>
              </div>
            </div>

            {/* Keyboard Hints (desktop only) */}
            <div className="hidden lg:flex items-center gap-4 mb-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Keyboard className="h-3 w-3" />
                Shortcuts:
              </span>
              <span>← → Navigate</span>
              <span>Space: Show Answer</span>
              <span>A-E: Select Option</span>
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

                const shortcutKey = String.fromCharCode(65 + idx); // A, B, C, D, E

                return (
                  <button
                    key={key}
                    onClick={() => handleSelectAnswer(key)}
                    disabled={showAnswer}
                    className={cn(
                      "w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 border-2",
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
              <div className="p-5 rounded-xl bg-muted/50 border-l-4 border-primary/30 mb-6 animate-fade-in">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={textStyle}>
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Swipe hint on mobile */}
            <p className="lg:hidden text-center text-xs text-muted-foreground mb-4">
              ← Swipe to navigate →
            </p>
          </div>

          {/* Sidebar Buttons */}
          <div className="lg:w-48 flex lg:flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
            <Button
              variant="outline"
              onClick={goPrevious}
              disabled={currentIndex === 0}
              className="flex-1 lg:flex-none"
            >
              ← Previous
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleShowAnswer}
              disabled={showAnswer}
              className="flex-1 lg:flex-none bg-primary/20 hover:bg-primary/30 text-primary"
            >
              Show Answer
            </Button>
            
            {currentIndex === questions.length - 1 ? (
              <Button onClick={handleComplete} className="flex-1 lg:flex-none">
                Finish Chapter
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

        {/* Mobile Bookmark/Notes */}
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

        {/* Footer */}
        <footer className="text-center mt-16 py-8 border-t">
          <p className="text-sm text-muted-foreground">Designed by Dr.Anonymous</p>
        </footer>
      </main>

      {/* Notes Panel */}
      <NotesPanel
        questionId={currentQuestion?.id || ''}
        isOpen={showNotes}
        onClose={() => {
          setShowNotes(false);
          checkBookmarkAndNote();
        }}
      />

      {/* Resume Dialog */}
      {resumeInfo && (
        <ResumeDialog
          open={showResumeDialog}
          onOpenChange={setShowResumeDialog}
          onResume={handleResume}
          onStartOver={handleStartOver}
          lastQuestionNumber={questions[resumeInfo.lastIndex]?.question_number || 1}
          totalQuestions={questions.length}
          answeredCount={resumeInfo.answeredCount}
        />
      )}
    </div>
  );
}
