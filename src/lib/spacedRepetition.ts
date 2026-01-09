// Spaced Repetition System using SM-2 algorithm variant
// Prioritizes questions you got wrong more frequently

interface RepetitionData {
  questionId: string;
  easeFactor: number; // 1.3 to 2.5, lower = harder
  interval: number; // days until next review
  repetitions: number; // consecutive correct answers
  nextReview: number; // timestamp
  lastResult: 'correct' | 'incorrect' | null;
}

const STORAGE_KEY = 'spaced-repetition-data';

// Get all repetition data from localStorage
export function getRepetitionData(): Record<string, RepetitionData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save repetition data
function saveRepetitionData(data: Record<string, RepetitionData>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Clear repetition data for specific question IDs (used when resetting chapter)
export function clearRepetitionForChapter(questionIds: string[]) {
  const data = getRepetitionData();
  questionIds.forEach(id => {
    delete data[id];
  });
  saveRepetitionData(data);
}

// Clear all repetition data (used when resetting all progress)
export function clearAllRepetitionData() {
  localStorage.removeItem(STORAGE_KEY);
}

// Initialize or get question data
export function getQuestionData(questionId: string): RepetitionData {
  const allData = getRepetitionData();
  
  if (allData[questionId]) {
    return allData[questionId];
  }
  
  // New question - start with default values
  return {
    questionId,
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: Date.now(),
    lastResult: null,
  };
}

// Update after answering
export function updateRepetition(questionId: string, isCorrect: boolean): RepetitionData {
  const allData = getRepetitionData();
  const data = getQuestionData(questionId);
  
  if (isCorrect) {
    // Correct answer - increase interval
    if (data.repetitions === 0) {
      data.interval = 1;
    } else if (data.repetitions === 1) {
      data.interval = 6;
    } else {
      data.interval = Math.round(data.interval * data.easeFactor);
    }
    data.repetitions += 1;
    data.easeFactor = Math.max(1.3, data.easeFactor + 0.1);
    data.lastResult = 'correct';
  } else {
    // Incorrect - reset and lower ease factor
    data.repetitions = 0;
    data.interval = 1;
    data.easeFactor = Math.max(1.3, data.easeFactor - 0.3);
    data.lastResult = 'incorrect';
  }
  
  // Set next review time
  data.nextReview = Date.now() + (data.interval * 24 * 60 * 60 * 1000);
  
  allData[questionId] = data;
  saveRepetitionData(allData);
  
  return data;
}

// Calculate priority score (lower = should review sooner)
export function getPriorityScore(questionId: string): number {
  const data = getQuestionData(questionId);
  
  // If never answered, high priority
  if (data.lastResult === null) return 50;
  
  // If incorrect, very high priority
  if (data.lastResult === 'incorrect') {
    return 100 - (data.easeFactor * 10);
  }
  
  // Calculate days overdue
  const now = Date.now();
  const daysOverdue = (now - data.nextReview) / (24 * 60 * 60 * 1000);
  
  // Overdue questions get higher priority
  if (daysOverdue > 0) {
    return 30 + Math.min(daysOverdue * 5, 50);
  }
  
  // Not yet due - lower priority based on ease factor
  return data.easeFactor * 5;
}

// Sort questions by priority (highest priority first)
export function sortByPriority<T extends { id: string }>(questions: T[]): T[] {
  return [...questions].sort((a, b) => {
    const priorityA = getPriorityScore(a.id);
    const priorityB = getPriorityScore(b.id);
    return priorityB - priorityA; // Higher priority first
  });
}

// Get questions that need review (due or overdue)
export function getQuestionsForReview<T extends { id: string }>(questions: T[]): T[] {
  const now = Date.now();
  
  return questions.filter(q => {
    const data = getQuestionData(q.id);
    
    // Include if never answered
    if (data.lastResult === null) return true;
    
    // Include if incorrect
    if (data.lastResult === 'incorrect') return true;
    
    // Include if due for review
    return data.nextReview <= now;
  });
}

// Get count of questions needing review
export function getReviewCount(questionIds: string[]): number {
  const now = Date.now();
  
  return questionIds.filter(id => {
    const data = getQuestionData(id);
    if (data.lastResult === null) return true;
    if (data.lastResult === 'incorrect') return true;
    return data.nextReview <= now;
  }).length;
}

// Get statistics
export function getRepetitionStats(questionIds: string[]) {
  const allData = getRepetitionData();
  
  let mastered = 0;
  let learning = 0;
  let needsReview = 0;
  let notStarted = 0;
  
  const now = Date.now();
  
  questionIds.forEach(id => {
    const data = allData[id];
    
    if (!data || data.lastResult === null) {
      notStarted++;
    } else if (data.lastResult === 'incorrect') {
      needsReview++;
    } else if (data.interval >= 21 && data.repetitions >= 3) {
      mastered++;
    } else if (data.nextReview <= now) {
      needsReview++;
    } else {
      learning++;
    }
  });
  
  return { mastered, learning, needsReview, notStarted };
}
