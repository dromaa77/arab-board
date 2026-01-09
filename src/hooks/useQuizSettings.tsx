import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QuizSettings {
  resumeByDefault: boolean;
  setResumeByDefault: (value: boolean) => void;
}

// Store for quiz settings (persisted to localStorage)
export const useQuizSettings = create<QuizSettings>()(
  persist(
    (set) => ({
      resumeByDefault: true,
      setResumeByDefault: (value: boolean) => set({ resumeByDefault: value }),
    }),
    {
      name: 'quiz-settings',
    }
  )
);
