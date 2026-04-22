import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Loader2, Trash2 } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';
import { useAuthStore } from '../../../app/store/useAuthStore';
import { useSocket } from '../../../shared/hooks/useSocket';

interface Comment {
  id: string;
  expense_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
  avatar_url: string | null;
}

interface ExpenseCommentsProps {
  expenseId: string;
}

export const ExpenseComments: React.FC<ExpenseCommentsProps> = ({ expenseId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentUser = useAuthStore(state => state.user);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const { on } = useSocket();

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/expenses/${expenseId}/comments`);
      setComments(data);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchComments();
    }
  }, [isExpanded, expenseId]);

  useEffect(() => {
    if (!isExpanded) return;

    const unsub = on('expense_comment', (payload: any) => {
      if (payload.expenseId === expenseId) {
        setComments(prev => {
          if (prev.find(c => c.id === payload.comment.id)) return prev;
          return [...prev, payload.comment];
        });
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, [isExpanded, expenseId, on]);

  useEffect(() => {
    if (isExpanded) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, isExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await apiClient.post(`/expenses/${expenseId}/comments`, { content: newComment });
      setComments(prev => [...prev, data]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await apiClient.delete(`/expenses/${expenseId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-indigo-400 transition-colors"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        {isExpanded ? 'Hide Notes' : 'Notes & Thread'}
      </button>

      {isExpanded && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2 mb-3">
              {comments.length === 0 ? (
                <p className="text-[11px] text-zinc-500 italic text-center py-2">No notes yet. Add one below.</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                      {c.avatar_url ? (
                        <img src={`http://localhost:3000${c.avatar_url}`} alt={c.user_name} className="w-full h-full object-cover" />
                      ) : (
                        c.user_name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 bg-white/5 border border-white/5 rounded-lg rounded-tl-none p-2 relative group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-zinc-300">
                          {c.user_id === currentUser?.id ? 'You' : c.user_name}
                        </span>
                        <span className="text-[9px] text-zinc-500">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 whitespace-pre-wrap">{c.content}</p>

                      {c.user_id === currentUser?.id && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="absolute -right-2 -top-2 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a note or comment..."
              className="flex-1 bg-black/30 border border-white/10 rounded-full pl-4 pr-10 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="absolute right-1 w-7 h-7 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 -ml-0.5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
