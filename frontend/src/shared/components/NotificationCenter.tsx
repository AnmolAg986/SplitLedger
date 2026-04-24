import React, { useEffect, useRef, useState } from 'react';
import { EmptyState } from './EmptyState';
import { useNotificationStore } from '../store/useNotificationStore';
import { apiClient } from '../api/axios';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Trash2, X, AlertCircle, Receipt, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NotificationCenter() {
  const { 
    isOpen, setIsOpen, notifications, unreadCount, hasMore, 
    setNotifications, appendNotifications, 
    markAsRead, markAllAsRead, deleteNotification 
  } = useNotificationStore();
  
  const navigate = useNavigate();
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadNotifications = async (offset: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const limit = 50;
      const res = await apiClient.get(`/notifications?limit=${limit}&offset=${offset}`);
      if (offset === 0) {
        const countRes = await apiClient.get('/notifications/unread-count');
        setNotifications(res.data, countRes.data.count);
      } else {
        appendNotifications(res.data, res.data.length === limit);
      }
      pageRef.current = offset;
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      loadNotifications(0);
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      try {
        await apiClient.patch(`/notifications/${notif.id}/read`);
        markAsRead(notif.id);
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }

    setIsOpen(false);

    if (notif.entityType === 'group' && notif.entityId) {
      navigate(`/groups/${notif.entityId}`);
    } else if (notif.entityType === 'friend' && notif.entityId) {
      navigate(`/friends/${notif.entityId}`);
    } else if (notif.entityType === 'expense' && notif.entityId) {
      // Could navigate to specific group or dashboard depending on context
      navigate('/dashboard'); 
    } else if (notif.entityType === 'settlement') {
      navigate('/dashboard');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/notifications/${id}`);
      deleteNotification(id);
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'expense_added':
      case 'expense_updated':
        return <Receipt size={18} className="text-blue-400" />;
      case 'settled':
        return <Check size={18} className="text-green-400" />;
      case 'friend_request':
      case 'friend_request_accepted':
        return <Users size={18} className="text-purple-400" />;
      case 'nudge':
      case 'reminder':
        return <AlertCircle size={18} className="text-amber-400" />;
      default:
        return <Bell size={18} className="text-zinc-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-cyan-500/20 text-cyan-400 text-xs font-medium px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Mark all read
              </button>
            )}
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {notifications.length === 0 ? (
            <EmptyState
              variant="notifications"
              headline="All caught up!"
              subtext="You have no notifications right now. We'll let you know when something needs your attention."
              compact
            />
          ) : (
            <div className="space-y-1">
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`relative flex gap-4 p-4 rounded-xl cursor-pointer group transition-all duration-200 ${
                    notif.isRead 
                      ? 'hover:bg-zinc-900/50' 
                      : 'bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/50'
                  }`}
                >
                  {!notif.isRead && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-500 rounded-r-full" />
                  )}
                  
                  <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    notif.isRead ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-800 shadow-inner'
                  }`}>
                    {getIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${notif.isRead ? 'text-zinc-300' : 'text-white'}`}>
                      {notif.title}
                    </p>
                    <p className={`text-sm mt-0.5 line-clamp-2 ${notif.isRead ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {notif.body}
                    </p>
                    <p className="text-xs text-zinc-600 mt-2 font-medium">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  <button 
                    onClick={(e) => handleDelete(e, notif.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-400 transition-all absolute right-2 top-2 rounded-lg hover:bg-zinc-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              {hasMore && (
                <button 
                  onClick={() => loadNotifications(pageRef.current + 50)}
                  className="w-full py-4 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  {isLoadingMore ? 'Loading...' : 'Load older notifications'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
