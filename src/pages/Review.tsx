import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, XCircle, Star, Play, RefreshCw, BookOpen, Brain, ArrowLeft } from 'lucide-react';
import { sortByPriority, getReviewCount, getRepetitionStats } from '@/lib/spacedRepetition';

interface ReviewQuestion {
  id: string;
  question_number: number;
  question_text: string;
  chapter_id: string;
  chapter_number: number;
  chapter_title: string;
}

export default function Review() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chapterFilter = searchParams.get('chapter');
  const [isLoading, setIsLoading] = useState(true);
  const [incorrectQuestions, setIncorrectQuestions] = useState<ReviewQuestion[]>([]);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<ReviewQuestion[]>([]);
  const [allQuestions, setAllQuestions] = useState<ReviewQuestion[]>([]);
  const [activeTab, setActiveTab] = useState(chapterFilter ? 'incorrect' : 'smart');
  const [smartStats, setSmartStats] = useState({ mastered: 0, learning: 0, needsReview: 0, notStarted: 0 });

  useEffect(() => {
    if (user) {
      loadReviewData();
    }
  }, [user, chapterFilter]);

  const loadReviewData = async () => {
    try {
      // Load all questions for smart review
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          question_number,
          question_text,
          chapter_id,
          chapters (
            chapter_number,
            title
          )
        `)
        .order('question_number');

      if (questionsError) throw questionsError;

      const all = (questionsData || []).map(q => ({
        id: q.id,
        question_number: q.question_number,
        question_text: q.question_text,
        chapter_id: q.chapter_id,
        chapter_number: (q.chapters as any)?.chapter_number || 0,
        chapter_title: (q.chapters as any)?.title || ''
      }));

      setAllQuestions(all);

      // Calculate smart review stats
      const questionIds = all.map(q => q.id);
      const stats = getRepetitionStats(questionIds);
      setSmartStats(stats);

      // Load incorrect answers
      let incorrectQuery = supabase
        .from('user_progress')
        .select(`
          question_id,
          questions (
            id,
            question_number,
            question_text,
            chapter_id,
            chapters (
              chapter_number,
              title
            )
          )
        `)
        .eq('user_id', user!.id)
        .eq('is_correct', false);

      const { data: incorrectData, error: incorrectError } = await incorrectQuery;

      if (incorrectError) throw incorrectError;

      let incorrect = (incorrectData || [])
        .filter(p => p.questions)
        .map(p => ({
          id: (p.questions as any).id,
          question_number: (p.questions as any).question_number,
          question_text: (p.questions as any).question_text,
          chapter_id: (p.questions as any).chapter_id,
          chapter_number: (p.questions as any).chapters?.chapter_number || 0,
          chapter_title: (p.questions as any).chapters?.title || ''
        }))
        .sort((a, b) => a.chapter_number - b.chapter_number || a.question_number - b.question_number);

      // Filter by chapter if specified
      if (chapterFilter) {
        incorrect = incorrect.filter(q => q.chapter_id === chapterFilter);
      }

      setIncorrectQuestions(incorrect);

      // Load bookmarked questions
      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from('bookmarks')
        .select(`
          question_id,
          questions (
            id,
            question_number,
            question_text,
            chapter_id,
            chapters (
              chapter_number,
              title
            )
          )
        `)
        .eq('user_id', user!.id);

      if (bookmarkError) throw bookmarkError;

      const bookmarked = (bookmarkData || [])
        .filter(b => b.questions)
        .map(b => ({
          id: (b.questions as any).id,
          question_number: (b.questions as any).question_number,
          question_text: (b.questions as any).question_text,
          chapter_id: (b.questions as any).chapter_id,
          chapter_number: (b.questions as any).chapters?.chapter_number || 0,
          chapter_title: (b.questions as any).chapters?.title || ''
        }))
        .sort((a, b) => a.chapter_number - b.chapter_number || a.question_number - b.question_number);

      setBookmarkedQuestions(bookmarked);
    } catch (error) {
      console.error('Error loading review data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startSmartReview = (count: number = 20) => {
    if (allQuestions.length === 0) return;
    
    // Sort by priority and take top N questions
    const prioritized = sortByPriority(allQuestions).slice(0, count);
    const questionIds = prioritized.map(q => q.id).join(',');
    navigate(`/review-quiz?ids=${questionIds}&type=smart`);
  };

  const startReviewSession = (questions: ReviewQuestion[], type: 'incorrect' | 'bookmarked') => {
    if (questions.length === 0) return;
    
    // Navigate to a special review quiz mode
    const questionIds = questions.map(q => q.id).join(',');
    navigate(`/review-quiz?ids=${questionIds}&type=${type}`);
  };

  const QuestionList = ({ questions, emptyIcon: EmptyIcon, emptyTitle, emptyMessage }: {
    questions: ReviewQuestion[];
    emptyIcon: React.ElementType;
    emptyTitle: string;
    emptyMessage: string;
  }) => {
    if (questions.length === 0) {
      return (
        <div className="text-center py-12">
          <EmptyIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">{emptyTitle}</h3>
          <p className="text-muted-foreground mb-6">{emptyMessage}</p>
          <Button asChild>
            <Link to="/">
              <BookOpen className="mr-2 h-4 w-4" />
              Start Studying
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {questions.map(question => (
          <Link
            key={question.id}
            to={`/quiz/${question.chapter_id}?q=${question.question_number}`}
            className="block"
          >
            <Card className="hover:shadow-md hover:border-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="text-xs text-primary font-medium mb-1">
                  Chapter {question.chapter_number}: {question.chapter_title}
                </div>
                <p className="text-sm">
                  <span className="font-semibold">Q{question.question_number}.</span>{' '}
                  <span className="text-muted-foreground line-clamp-2">{question.question_text}</span>
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <RefreshCw className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-serif font-bold">Review Mode</h1>
            <p className="text-sm text-muted-foreground">Practice your weak areas and bookmarked questions</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="smart" className="gap-2">
              <Brain className="h-4 w-4" />
              Smart Review
            </TabsTrigger>
            <TabsTrigger value="incorrect" className="gap-2">
              <XCircle className="h-4 w-4" />
              Incorrect ({incorrectQuestions.length})
            </TabsTrigger>
            <TabsTrigger value="bookmarked" className="gap-2">
              <Star className="h-4 w-4" />
              Bookmarked ({bookmarkedQuestions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="smart" className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Smart Review Mode</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Uses spaced repetition to prioritize questions you struggle with. Questions you get wrong appear more frequently.
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="text-center p-3 rounded-lg bg-background border">
                        <div className="text-2xl font-bold text-green-600">{smartStats.mastered}</div>
                        <div className="text-xs text-muted-foreground">Mastered</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-background border">
                        <div className="text-2xl font-bold text-blue-600">{smartStats.learning}</div>
                        <div className="text-xs text-muted-foreground">Learning</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-background border">
                        <div className="text-2xl font-bold text-orange-600">{smartStats.needsReview}</div>
                        <div className="text-xs text-muted-foreground">Needs Review</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-background border">
                        <div className="text-2xl font-bold text-muted-foreground">{smartStats.notStarted}</div>
                        <div className="text-xs text-muted-foreground">Not Started</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => startSmartReview(10)} variant="outline">
                        <Play className="mr-2 h-4 w-4" />
                        Quick (10)
                      </Button>
                      <Button onClick={() => startSmartReview(20)}>
                        <Play className="mr-2 h-4 w-4" />
                        Standard (20)
                      </Button>
                      <Button onClick={() => startSmartReview(50)} variant="outline">
                        <Play className="mr-2 h-4 w-4" />
                        Extended (50)
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {allQuestions.length === 0 && (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No questions available</h3>
                <p className="text-muted-foreground mb-6">Start studying chapters to build your review queue.</p>
                <Button asChild>
                  <Link to="/">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Start Studying
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="incorrect" className="space-y-4">
            {incorrectQuestions.length > 0 && (
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Review Incorrect Answers</h3>
                    <p className="text-sm text-muted-foreground">
                      {incorrectQuestions.length} questions to review
                    </p>
                  </div>
                  <Button onClick={() => startReviewSession(incorrectQuestions, 'incorrect')}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Review
                  </Button>
                </CardContent>
              </Card>
            )}
            
            <QuestionList 
              questions={incorrectQuestions}
              emptyIcon={XCircle}
              emptyTitle="No incorrect answers"
              emptyMessage="Great job! You haven't gotten any questions wrong yet."
            />
          </TabsContent>

          <TabsContent value="bookmarked" className="space-y-4">
            {bookmarkedQuestions.length > 0 && (
              <Card className="bg-accent border-accent/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Review Bookmarked Questions</h3>
                    <p className="text-sm text-muted-foreground">
                      {bookmarkedQuestions.length} questions saved for review
                    </p>
                  </div>
                  <Button onClick={() => startReviewSession(bookmarkedQuestions, 'bookmarked')}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Review
                  </Button>
                </CardContent>
              </Card>
            )}
            
            <QuestionList 
              questions={bookmarkedQuestions}
              emptyIcon={Star}
              emptyTitle="No bookmarked questions"
              emptyMessage="Star questions while studying to save them here for quick review."
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
