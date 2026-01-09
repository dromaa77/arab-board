import { useLocation, useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, CheckCircle2, XCircle, RotateCcw, BookOpen, Home } from 'lucide-react';

export default function Results() {
  const { chapterId } = useParams();
  const location = useLocation();
  const { total = 0, answered = 0, correct = 0 } = (location.state as any) || {};

  const incorrect = answered - correct;
  const percentage = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  let message = 'Keep practicing!';
  let emoji = '📚';
  if (percentage >= 90) {
    message = 'Outstanding!';
    emoji = '🏆';
  } else if (percentage >= 70) {
    message = 'Great job!';
    emoji = '🎉';
  } else if (percentage >= 50) {
    message = 'Good effort!';
    emoji = '👍';
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="text-6xl mb-4">{emoji}</div>
          <CardTitle className="text-2xl">Chapter Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="text-5xl font-bold text-primary mb-2">{percentage}%</div>
            <p className="text-xl text-muted-foreground">{message}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4 border-y">
            <div>
              <div className="text-2xl font-bold">{answered}</div>
              <div className="text-sm text-muted-foreground">Answered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success flex items-center justify-center gap-1">
                <CheckCircle2 className="h-5 w-5" />
                {correct}
              </div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-destructive flex items-center justify-center gap-1">
                <XCircle className="h-5 w-5" />
                {incorrect}
              </div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
          </div>

          <div className="space-y-3">
            {incorrect > 0 && (
              <Button asChild className="w-full" variant="outline">
                <Link to={`/quiz/${chapterId}`}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Review Chapter
                </Link>
              </Button>
            )}
            <Button asChild className="w-full">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Chapters
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
