import { useEffect, useRef, useCallback } from 'react';
import type { Task } from '../types';

/**
 * Hook that monitors tasks with scheduled times and alerts
 * the user when a task's time arrives.
 * Uses BOTH in-app alerts AND browser notifications for reliability.
 */
export function useTaskReminders(
  tasks: Task[],
  todayStr: string,
  setNotification: (n: { title: string; message: string } | null) => void
) {
  const notifiedRef = useRef<Set<string>>(new Set());

  const sendAlert = useCallback((task: Task) => {
    const timeStr = task.time ? formatTime12h(task.time) : '';
    const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'low' ? '🟢' : '🟡';

    // 1. ALWAYS show in-app notification modal (works 100%)
    setNotification({
      title: `⏰ Task Reminder — ${timeStr}`,
      message: `${priorityEmoji} "${task.title}" is scheduled now!${task.duration ? ` (${task.duration} mins)` : ''}\n\nTap to dismiss and start working!`
    });

    // 2. Play alert sound
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch { /* audio failed */ }

    // 3. ALSO try browser notification (bonus — works in background)
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = `⏰ Task Reminder - ${timeStr}`;
        const body = `${priorityEmoji} "${task.title}" is scheduled now!`;

        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: `task-${task.id}`,
              vibrate: [200, 100, 200, 100, 200],
              requireInteraction: true,
            } as any);
          }).catch(() => {});
        } else {
          new Notification(title, {
            body,
            icon: '/icon-192x192.png',
            tag: `task-${task.id}`,
          });
        }
      }
    } catch { /* browser notification failed, in-app already shown */ }
  }, [setNotification]);

  // Check tasks every 15 seconds
  useEffect(() => {
    const checkTasks = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      tasks.forEach(task => {
        // Only notify for today's incomplete tasks with a scheduled time
        if (task.completed || !task.time) return;

        // Check if it's today's task
        if (task.date && task.date !== todayStr) return;

        // Don't notify the same task twice
        if (notifiedRef.current.has(task.id)) return;

        const [taskHour, taskMinute] = task.time.split(':').map(Number);

        // Notify if current time >= task time (within a 5 minute window)
        const taskTotalMins = taskHour * 60 + taskMinute;
        const currentTotalMins = currentHour * 60 + currentMinute;
        const diff = currentTotalMins - taskTotalMins;

        if (diff >= 0 && diff <= 5) {
          sendAlert(task);
          notifiedRef.current.add(task.id);
        }
      });
    };

    // Run immediately and then every 15 seconds
    checkTasks();
    const interval = setInterval(checkTasks, 15000);

    return () => clearInterval(interval);
  }, [tasks, todayStr, sendAlert]);

  // Reset notified set at midnight
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      notifiedRef.current.clear();
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, [todayStr]);
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Request notification permission explicitly.
 * Call this from a user-initiated action (button click).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const perm = await Notification.requestPermission();
  return perm === 'granted';
}
