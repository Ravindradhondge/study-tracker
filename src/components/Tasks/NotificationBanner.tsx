import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { requestNotificationPermission } from '../../hooks/useTaskReminders';

export default function NotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    // Check if user previously dismissed
    const wasDismissed = localStorage.getItem('notification-banner-dismissed');
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) {
      // Send a test notification
      try {
        new Notification('🔔 Notifications Enabled!', {
          body: 'You will now receive reminders when your scheduled tasks are due.',
          icon: '/icon-192x192.png',
        });
      } catch { /* ignore */ }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  // Don't show if: not supported, already granted, denied, or dismissed
  if (!('Notification' in window) || permission === 'granted' || dismissed) {
    return null;
  }

  if (permission === 'denied') {
    return (
      <div className="notification-banner denied">
        <BellOff size={18} />
        <span>Notifications blocked. Enable them in browser settings to get task reminders.</span>
        <button className="btn-icon" onClick={handleDismiss} title="Dismiss">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="notification-banner">
      <Bell size={18} />
      <span>Enable notifications to get reminders when your scheduled tasks are due!</span>
      <button className="btn-primary btn-sm" onClick={handleEnable}>
        Enable
      </button>
      <button className="btn-icon" onClick={handleDismiss} title="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
