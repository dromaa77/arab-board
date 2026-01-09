import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Star, StickyNote, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
interface ChapterStats {
  id: string;
  chapter_number: number;
  title: string;
  total: number;
  answered: number;
  correct: number;
}

interface DailyStats {
  date: string;
  answered: number;
  correct: number;
}

export default function Statistics() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalBookmarks, setTotalBookmarks] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);
  const [chapterStats, setChapterStats] = useState<ChapterStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  useEffect(() => {
    if (user) {
      loadStatistics();
    }
  }, [user]);

  const loadStatistics = async () => {
    try {
      // Load chapters with question counts
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id, chapter_number, title, total_questions')
        .order('chapter_number');

      // Load all user progress
      const { data: progress } = await supabase
        .from('user_progress')
        .select('question_id, is_correct, answered_at, questions(chapter_id)')
        .eq('user_id', user!.id);

      // Load bookmarks count
      const { count: bookmarksCount } = await supabase
        .from('bookmarks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Load notes count
      const { count: notesCount } = await supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Calculate totals
      const totalQ = (chapters || []).reduce((sum, ch) => sum + ch.total_questions, 0);
      const answered = progress?.length || 0;
      const correct = (progress || []).filter(p => p.is_correct).length;

      setTotalQuestions(totalQ);
      setTotalAnswered(answered);
      setTotalCorrect(correct);
      setTotalBookmarks(bookmarksCount || 0);
      setTotalNotes(notesCount || 0);

      // Calculate chapter stats
      const chapterProgress: { [id: string]: { answered: number; correct: number } } = {};
      (progress || []).forEach(p => {
        const chapterId = (p.questions as any)?.chapter_id;
        if (chapterId) {
          if (!chapterProgress[chapterId]) {
            chapterProgress[chapterId] = { answered: 0, correct: 0 };
          }
          chapterProgress[chapterId].answered++;
          if (p.is_correct) chapterProgress[chapterId].correct++;
        }
      });

      const stats = (chapters || []).map(ch => ({
        id: ch.id,
        chapter_number: ch.chapter_number,
        title: ch.title,
        total: ch.total_questions,
        answered: chapterProgress[ch.id]?.answered || 0,
        correct: chapterProgress[ch.id]?.correct || 0
      }));
      setChapterStats(stats);

      // Calculate daily stats (last 7 days)
      const dailyMap: { [date: string]: { answered: number; correct: number } } = {};
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap[dateStr] = { answered: 0, correct: 0 };
      }

      (progress || []).forEach(p => {
        const dateStr = new Date(p.answered_at).toISOString().split('T')[0];
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].answered++;
          if (p.is_correct) dailyMap[dateStr].correct++;
        }
      });

      const dailyData = Object.entries(dailyMap).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        ...data
      }));
      setDailyStats(dailyData);

    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const progressPercent = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

  const weakChapters = chapterStats
    .filter(ch => ch.answered >= 3)
    .map(ch => ({ ...ch, accuracy: Math.round((ch.correct / ch.answered) * 100) }))
    .filter(ch => ch.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

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
        <h1 className="text-3xl font-bold mb-8">Statistics Dashboard</h1>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{totalAnswered}</div>
              <div className="text-sm text-muted-foreground">Answered</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-success">{totalCorrect}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Correct
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-destructive">{totalAnswered - totalCorrect}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <XCircle className="h-4 w-4" /> Incorrect
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-star">{totalBookmarks}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Star className="h-4 w-4" /> Bookmarks
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{totalNotes}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <StickyNote className="h-4 w-4" /> Notes
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Completion</span>
                  <span>{totalAnswered}/{totalQuestions} questions ({progressPercent}%)</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Accuracy</span>
                  <span>{overallAccuracy}%</span>
                </div>
                <Progress value={overallAccuracy} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Chapter Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Chapter</CardTitle>
            </CardHeader>
            <CardContent>
              {chapterStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chapterStats.filter(ch => ch.answered > 0)}>
                    <XAxis dataKey="chapter_number" tickFormatter={(v) => `Ch ${v}`} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value}%`,
                        name === 'accuracy' ? 'Accuracy' : name
                      ]}
                      labelFormatter={(label) => `Chapter ${label}`}
                    />
                    <Bar
                      dataKey={(data) => data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0}
                      name="accuracy"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Answer some questions to see your performance
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyStats}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="answered" stroke="hsl(var(--primary))" strokeWidth={2} name="Answered" />
                  <Line type="monotone" dataKey="correct" stroke="hsl(var(--success))" strokeWidth={2} name="Correct" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weak Areas */}
        {weakChapters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Areas to Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weakChapters.map(ch => (
                  <Link
                    key={ch.id}
                    to={`/quiz/${ch.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-warning-muted hover:bg-warning-muted/80 transition-colors"
                  >
                    <div>
                      <div className="font-medium">Chapter {ch.chapter_number}: {ch.title}</div>
                      <div className="text-sm text-muted-foreground">{ch.correct}/{ch.answered} correct</div>
                    </div>
                    <div className="text-lg font-bold text-warning">{ch.accuracy}%</div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
