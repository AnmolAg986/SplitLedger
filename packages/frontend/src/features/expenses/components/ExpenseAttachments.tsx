import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Upload, Loader2, Trash2, FileText, Image, Eye, X } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';
import { useAuthStore } from '../../../app/store/useAuthStore';

interface Attachment {
  id: string;
  expense_id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  user_name: string;
}

interface ExpenseAttachmentsProps {
  expenseId: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ExpenseAttachments: React.FC<ExpenseAttachmentsProps> = ({ expenseId }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = useAuthStore(state => state.user);

  const fetchAttachments = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/expenses/${expenseId}/attachments`);
      setAttachments(data);
    } catch (err) {
      console.error('Failed to fetch attachments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isExpanded) fetchAttachments();
  }, [isExpanded, expenseId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('receipt', file);

    setUploading(true);
    try {
      const { data } = await apiClient.post(`/expenses/${expenseId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachments(prev => [...prev, data]);
    } catch (err: any) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await apiClient.delete(`/expenses/${expenseId}/attachments/${attachmentId}`);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  return (
    <>
      {/* Lightbox */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <img
            src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${previewUrl}`}
            alt="Receipt"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <div className="mt-2 border-t border-white/5 pt-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-amber-400 transition-colors"
        >
          <Paperclip className="w-3.5 h-3.5" />
          {attachments.length > 0 && !isExpanded
            ? `${attachments.length} Receipt${attachments.length > 1 ? 's' : ''}`
            : isExpanded ? 'Hide Receipts' : 'Receipts'}
        </button>

        {isExpanded && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {loading ? (
              <div className="flex justify-center p-3">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {attachments.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 italic text-center py-1">No receipts attached yet.</p>
                ) : (
                  attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5 group">
                      <div className="text-amber-400">{getFileIcon(a.file_type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-zinc-300 truncate">{a.file_name}</p>
                        <p className="text-[9px] text-zinc-500">{formatSize(a.file_size)} • {a.user_name}</p>
                      </div>
                      <div className="flex gap-1 items-center shrink-0">
                        {isImage(a.file_type) && (
                          <button
                            onClick={() => setPreviewUrl(a.file_url)}
                            className="p-1 text-zinc-500 hover:text-blue-400 transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <a
                          href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${a.file_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-zinc-500 hover:text-amber-400 transition-colors"
                          title="Open"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </a>
                        {a.user_id === currentUser?.id && (
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-amber-400 border border-amber-400/20 bg-amber-400/5 hover:bg-amber-400/10 rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Upload className="w-3 h-3" />
              )}
              {uploading ? 'Uploading...' : 'Attach Receipt'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
