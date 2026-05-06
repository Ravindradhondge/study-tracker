import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Task } from '../types';

export function calculateStreak(tasks: Task[]): number {
  if (tasks.length === 0) return 0;

  const completedTasks = tasks.filter(t => t.completed && t.date);
  if (completedTasks.length === 0) return 0;

  const completedDates = [...new Set(completedTasks.map(t => t.date))].sort().reverse();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (completedDates[0] !== todayStr && completedDates[0] !== yesterdayStr) return 0;

  let streak = 1;
  const currentDate = new Date(
    completedDates[0] === todayStr ? today : yesterday
  );

  for (let i = 1; i < completedDates.length; i++) {
    currentDate.setDate(currentDate.getDate() - 1);
    const expectedStr = currentDate.toISOString().split('T')[0];
    if (completedDates[i] === expectedStr) {
      streak++;
    } else if (completedDates[i] !== completedDates[i - 1]) {
      break;
    }
  }

  return streak;
}

export function calculateWeeklyProgress(tasks: Task[]): { days: { date: string; completed: number; total: number }[] } {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayTasks = tasks.filter(t => t.date === dateStr);
    const completed = dayTasks.filter(t => t.completed).length;
    days.push({ date: dateStr, completed, total: dayTasks.length });
  }

  return { days };
}

export async function fetchTasksForUser(dbInstance: typeof db, uid: string): Promise<Task[]> {
  const q = query(collection(dbInstance, "users", uid, "tasks"));
  const snapshot = await getDocs(q);
  const fetchedTasks: Task[] = [];
  snapshot.forEach(doc => {
    fetchedTasks.push({ id: doc.id, ...doc.data() } as Task);
  });
  return fetchedTasks;
}
