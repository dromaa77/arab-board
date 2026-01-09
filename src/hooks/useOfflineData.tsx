import { useState, useEffect, useCallback } from 'react';

const OFFLINE_PROGRESS_KEY = 'offline-progress';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  total_questions: number;
}

interface Question {
  id: string;
  chapter_id: string;
  question_number: number;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
}

interface ChapterProgress {
  [chapterId: string]: {
    answered: number;
    correct: number;
    incorrect: number;
  };
}

interface OfflineProgress {
  [questionId: string]: {
    selectedAnswer: string;
    isCorrect: boolean;
    answeredAt: string;
  };
}

function getLocalChapters(): Chapter[] {
  return [];
}

function getLocalQuestions(_chapterNumber: number): Question[] {
  return [];
}

function getAllLocalQuestions(): Question[] {
  return [];
}

// Get offline progress from localStorage
function getOfflineProgress(): OfflineProgress {
  try {
    const stored = localStorage.getItem(OFFLINE_PROGRESS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save offline progress
function saveOfflineProgress(progress: OfflineProgress) {
  localStorage.setItem(OFFLINE_PROGRESS_KEY, JSON.stringify(progress));
}

// Calculate chapter progress from offline data
function calculateChapterProgress(): ChapterProgress {
  const offlineProgress = getOfflineProgress();
  const progressByChapter: ChapterProgress = {};
  
  Object.entries(offlineProgress).forEach(([questionId, data]) => {
    // Extract chapter number from question ID (format: local-q-{chapterNum}-{questionNum})
    const match = questionId.match(/local-q-(\d+)-/);
    if (match) {
      const chapterId = `local-chapter-${match[1]}`;
      if (!progressByChapter[chapterId]) {
        progressByChapter[chapterId] = { answered: 0, correct: 0, incorrect: 0 };
      }
      progressByChapter[chapterId].answered++;
      if (data.isCorrect) {
        progressByChapter[chapterId].correct++;
      } else {
        progressByChapter[chapterId].incorrect++;
      }
    }
  });
  
  return progressByChapter;
}

export function useOfflineData() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getChapters = useCallback((): Chapter[] => {
    return getLocalChapters();
  }, []);

  const getQuestions = useCallback((chapterNumber: number): Question[] => {
    return getLocalQuestions(chapterNumber);
  }, []);

  const getAllQuestions = useCallback((): Question[] => {
    return getAllLocalQuestions();
  }, []);

  const getProgress = useCallback((): ChapterProgress => {
    return calculateChapterProgress();
  }, []);

  const saveAnswer = useCallback((questionId: string, selectedAnswer: string, isCorrect: boolean) => {
    const progress = getOfflineProgress();
    progress[questionId] = {
      selectedAnswer,
      isCorrect,
      answeredAt: new Date().toISOString(),
    };
    saveOfflineProgress(progress);
  }, []);

  const getAnswer = useCallback((questionId: string) => {
    const progress = getOfflineProgress();
    return progress[questionId] || null;
  }, []);

  const clearProgress = useCallback(() => {
    localStorage.removeItem(OFFLINE_PROGRESS_KEY);
  }, []);

  const clearChapterProgress = useCallback((chapterNumber: number) => {
    const progress = getOfflineProgress();
    const prefix = `local-q-${chapterNumber}-`;
    Object.keys(progress).forEach(key => {
      if (key.startsWith(prefix)) {
        delete progress[key];
      }
    });
    saveOfflineProgress(progress);
  }, []);

  return {
    isOnline,
    getChapters,
    getQuestions,
    getAllQuestions,
    getProgress,
    saveAnswer,
    getAnswer,
    clearProgress,
    clearChapterProgress,
  };
}

export { getLocalChapters, getLocalQuestions, getAllLocalQuestions, getOfflineProgress, saveOfflineProgress };
