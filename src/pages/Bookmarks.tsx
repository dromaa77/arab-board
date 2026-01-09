import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Star, Trash2, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Bookmark {
  id: string;
  question_id: string;
  questions: {
    id: string;
    question_number: number;
    question_text: string;
    chapter_id: string;
    chapters: {
      chapter_number: number;
      title: string;
    } | null;
  } | null;
}

export default function Bookmarks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBookmarks();
    }
  }, [user]);

  const loadBookmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          id,
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeBookmark = async (bookmarkId: string) => {
    try {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId);
      
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      toast({ title: 'Bookmark removed' });
    } catch (error) {
      toast({ title: 'Failed to remove bookmark', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="flex items-center gap-3 mb-8">
          <Star className="h-8 w-8 text-star fill-star" />
          <h1 className="text-3xl font-bold">Your Bookmarked Questions</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-20">
            <Star className="h-16 w-16 text-star-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No bookmarks yet</h2>
            <p className="text-muted-foreground mb-6">
              Star questions while studying to save them here for quick review.
            </p>
            <Button asChild>
              <Link to="/">
                <BookOpen className="mr-2 h-4 w-4" />
                Start Studying
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map(bookmark => (
              <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-muted-foreground mb-1">
                        Chapter {bookmark.questions?.chapters?.chapter_number}: {bookmark.questions?.chapters?.title}
                      </div>
                      <Link
                        to={`/quiz/${bookmark.questions?.chapter_id}?q=${bookmark.questions?.question_number}`}
                        className="text-foreground hover:text-primary transition-colors"
                      >
                        <p className="font-medium">
                          <span className="text-primary">Q{bookmark.questions?.question_number}.</span>{' '}
                          {bookmark.questions?.question_text}
                        </p>
                      </Link>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBookmark(bookmark.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
