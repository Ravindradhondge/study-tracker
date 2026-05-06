export type Priority = 'high' | 'medium' | 'low';
export type TaskType = string;

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  type: TaskType;
  tag?: string;
  date?: string;
  time?: string;
  duration?: number | null;
  priority?: Priority;
  notes?: string;
}

export interface Section {
  id: string;
  name: string;
  icon: string;
  tags: string[];
}

export interface DailyGoal {
  date: string;
  targetTasks: number;
  targetMinutes: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  name: string | null;
  phone: string | null;
}

export const DEFAULT_SECTIONS: Section[] = [
  { id: 'study', name: 'SSC Study', icon: '📚', tags: ['maths', 'reasoning', 'english', 'gs'] },
  { id: 'tech', name: 'Tech Stack', icon: '💻', tags: ['java', 'python', 'web', 'dsa'] },
  { id: 'health', name: 'Health', icon: '💪', tags: [] },
  { id: 'routine', name: 'Routine', icon: '⏱️', tags: [] }
];

export const AMBIENT_SOUNDS = [
  { id: 'rain', name: 'Heavy Rain', url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=heavy-rain-nature-sounds-8186.mp3' },
  { id: 'forest', name: 'Forest Birds', url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_3499563947.mp3?filename=forest-birds-11070.mp3' },
  { id: 'waves', name: 'Ocean Waves', url: 'https://cdn.pixabay.com/download/audio/2022/03/09/audio_c8c8a73467.mp3?filename=relaxing-mountains-rivers-18775.mp3' },
  { id: 'night', name: 'Night Crickets', url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_8ed59c3477.mp3?filename=night-crickets-11337.mp3' },
  { id: 'cafe', name: 'Cafe Ambience', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=restaurant-ambience-19382.mp3' }
];
