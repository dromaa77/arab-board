import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, HelpCircle, FileText, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
}

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  explanation: string | null;
  chapter_id: string;
  chapters: { title: string; chapter_number: number } | null;
}

interface SearchResults {
  chapters: Chapter[];
  questions: Question[];
  explanations: Question[];
}

export default function UniversalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ chapters: [], questions: [], explanations: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults({ chapters: [], questions: [], explanations: [] });
        return;
      }

      setIsLoading(true);
      const words = query.toLowerCase().split(' ').filter(w => w.length > 0);

      try {
        // Search chapters
        const { data: chapters } = await supabase
          .from('chapters')
          .select('id, chapter_number, title')
          .order('chapter_number');

        const matchedChapters = (chapters || []).filter(ch =>
          words.every(word => ch.title.toLowerCase().includes(word))
        );

        // Search questions
        const { data: questions } = await supabase
          .from('questions')
          .select('id, question_number, question_text, explanation, chapter_id, chapters(title, chapter_number)')
          .order('question_number');

        const matchedQuestions = (questions || []).filter(q =>
          words.every(word => q.question_text.toLowerCase().includes(word))
        ).slice(0, 5);

        const matchedExplanations = (questions || []).filter(q =>
          q.explanation && words.every(word => q.explanation!.toLowerCase().includes(word))
        ).slice(0, 5);

        setResults({
          chapters: matchedChapters.slice(0, 5),
          questions: matchedQuestions as Question[],
          explanations: matchedExplanations as Question[]
        });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleResultClick = (type: 'chapter' | 'question', id: string, chapterNumber?: number, questionNumber?: number) => {
    setIsOpen(false);
    setQuery('');
    
    if (type === 'chapter') {
      navigate(`/quiz/${id}`);
    } else if (chapterNumber !== undefined && questionNumber !== undefined) {
      navigate(`/quiz/${id}?q=${questionNumber}`);
    }
  };

  const hasResults = results.chapters.length > 0 || results.questions.length > 0 || results.explanations.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search chapters, questions, or explanations..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 h-12 text-base"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-card rounded-lg shadow-lg border max-h-96 overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Searching...</div>
          ) : hasResults ? (
            <div className="p-2">
              {results.chapters.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    Chapters
                  </div>
                  {results.chapters.map(chapter => (
                    <button
                      key={chapter.id}
                      onClick={() => handleResultClick('chapter', chapter.id)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors"
                    >
                      <span className="font-medium">Chapter {chapter.chapter_number}:</span> {chapter.title}
                    </button>
                  ))}
                </div>
              )}

              {results.questions.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
                    <HelpCircle className="h-4 w-4" />
                    Questions
                  </div>
                  {results.questions.map(q => (
                    <button
                      key={q.id}
                      onClick={() => handleResultClick('question', q.chapter_id, q.chapters?.chapter_number, q.question_number)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors"
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        Chapter {q.chapters?.chapter_number}: {q.chapters?.title}
                      </div>
                      <div className="text-sm line-clamp-2">{q.question_text}</div>
                    </button>
                  ))}
                </div>
              )}

              {results.explanations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Explanations
                  </div>
                  {results.explanations.map(q => (
                    <button
                      key={`exp-${q.id}`}
                      onClick={() => handleResultClick('question', q.chapter_id, q.chapters?.chapter_number, q.question_number)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors"
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        Chapter {q.chapters?.chapter_number}, Q{q.question_number}
                      </div>
                      <div className="text-sm line-clamp-2">{q.explanation}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
