import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotesPanelProps {
  questionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotesPanel({ questionId, isOpen, onClose }: NotesPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user && questionId) {
      loadNote();
    }
  }, [isOpen, user, questionId]);

  const loadNote = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('content')
        .eq('user_id', user!.id)
        .eq('question_id', questionId)
        .maybeSingle();

      if (error) throw error;
      setContent(data?.content || '');
    } catch (error) {
      console.error('Error loading note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      if (content.trim()) {
        const { error } = await supabase
          .from('notes')
          .upsert({
            user_id: user.id,
            question_id: questionId,
            content: content.trim()
          }, {
            onConflict: 'user_id,question_id'
          });

        if (error) throw error;
        toast({ title: 'Note saved!' });
      } else {
        // Delete note if empty
        await supabase
          .from('notes')
          .delete()
          .eq('user_id', user.id)
          .eq('question_id', questionId);
        
        toast({ title: 'Note deleted' });
      }
      onClose();
    } catch (error) {
      toast({ title: 'Failed to save note', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Personal Notes</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add your personal notes for this question..."
              rows={6}
              className="resize-none"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Note
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
