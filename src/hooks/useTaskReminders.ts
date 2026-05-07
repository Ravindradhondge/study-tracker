import { useEffect, useRef } from 'react';
import type { Task } from '../types';

/**
 * Hook that monitors tasks with scheduled times and sends
 * browser notifications when a task's time arrives.
 */
export function useTaskReminders(tasks: Task[], todayStr: string) {
  const notifiedRef = useRef<Set<string>>(new Set());
  const permissionRef = useRef<NotificationPermission>('default');

  // Request notification permission on mount
  useEffect(() => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        permissionRef.current = perm;
      });
    }
  }, []);

  // Check tasks every 30 seconds
  useEffect(() => {
    if (!('Notification' in window)) return;

    const checkTasks = () => {
      if (permissionRef.current !== 'granted') {
        // Try requesting again if default
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(p => { permissionRef.current = p; });
        }
        return;
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      tasks.forEach(task => {
        // Only notify for today's incomplete tasks with a scheduled time
        if (task.completed || !task.time || task.date !== todayStr) return;

        // Don't notify the same task twice
        if (notifiedRef.current.has(task.id)) return;

        const [taskHour, taskMinute] = task.time.split(':').map(Number);

        // Notify if current time >= task time (within a 5 minute window)
        const taskTotalMins = taskHour * 60 + taskMinute;
        const currentTotalMins = currentHour * 60 + currentMinute;
        const diff = currentTotalMins - taskTotalMins;

        if (diff >= 0 && diff <= 5) {
          // Send notification
          sendTaskNotification(task);
          notifiedRef.current.add(task.id);
        }
      });
    };

    // Run immediately and then every 30 seconds
    checkTasks();
    const interval = setInterval(checkTasks, 30000);

    return () => clearInterval(interval);
  }, [tasks, todayStr]);

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

function sendTaskNotification(task: Task) {
  const timeStr = task.time ? formatTime12h(task.time) : '';
  const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'low' ? '🟢' : '🟡';

  const title = `⏰ Task Reminder - ${timeStr}`;
  const body = `${priorityEmoji} "${task.title}" is scheduled now!${task.duration ? ` (${task.duration} mins)` : ''}`;

  try {
    // Try service worker notification first (works in background)
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `task-${task.id}`,
          vibrate: [200, 100, 200, 100, 200],
          requireInteraction: true,
          data: { taskId: task.id },
        });
      });
    } else {
      // Fallback to basic notification
      new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        tag: `task-${task.id}`,
      });
    }
  } catch {
    // Notification failed silently
  }
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
