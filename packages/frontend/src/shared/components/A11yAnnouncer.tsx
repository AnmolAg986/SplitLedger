import React, { useEffect, useState } from 'react';
import { useToastStore } from '../store/useToastStore';
import { useNotificationStore } from '../store/useNotificationStore';

export const A11yAnnouncer: React.FC = () => {
  const [announcement, setAnnouncement] = useState('');
  const toasts = useToastStore(state => state.toasts);
  const notifications = useNotificationStore(state => state.notifications);

  // Announce new toasts
  useEffect(() => {
    if (toasts.length > 0) {
      const latestToast = toasts[toasts.length - 1];
      // eslint-disable-next-line
      setAnnouncement(`${latestToast.type === 'error' ? 'Error: ' : 'Success: '}${latestToast.message}`);
      
      // Clear announcement after screen reader reads it
      const timer = setTimeout(() => {
        // eslint-disable-next-line
        setAnnouncement('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // Announce new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      if (!latestNotification.isRead) {
        // eslint-disable-next-line
        setAnnouncement(`New notification: ${latestNotification.body}`);
        const timer = setTimeout(() => {
          // eslint-disable-next-line
          setAnnouncement('');
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [notifications]);

  return (
    <div 
      role="status" 
      aria-live="polite" 
      aria-atomic="true" 
      className="sr-only" // Tailwind utility for visually hidden
    >
      {announcement}
    </div>
  );
};
