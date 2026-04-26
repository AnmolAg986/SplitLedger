import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { templateApi } from '../../../shared/api/templateApi';
import { toast } from '../../../shared/store/useToastStore';

interface GroupTemplatesProps {
  groupId: string;
  onUseTemplate: (template: any) => void;
}

export const GroupTemplates: React.FC<GroupTemplatesProps> = ({ groupId, onUseTemplate }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      const data = await templateApi.getTemplates(groupId);
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (groupId) fetchTemplates();
  }, [groupId]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await templateApi.deleteTemplate(id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  if (loading) return <div className="text-zinc-500 text-xs">Loading templates...</div>;

  if (templates.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1 flex items-center gap-2">
        <Bookmark className="w-4 h-4 text-indigo-400" /> Saved Templates
      </h3>
      <p className="text-[11px] text-zinc-500 mb-4">Quickly add recurring expenses</p>
      
      <div className="flex flex-col gap-2">
        {templates.map(t => (
          <div 
            key={t.id} 
            onClick={() => onUseTemplate(t)}
            className="p-3 rounded-lg border border-indigo-500/10 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer transition-colors group relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{t.name}</span>
              <span className="text-xs font-bold text-indigo-400">₹{t.amount}</span>
            </div>
            {t.description && <p className="text-xs text-zinc-500 mt-1">{t.description}</p>}
            
            <button
              onClick={(e) => handleDelete(t.id, e)}
              className="absolute -right-2 -top-2 p-1.5 bg-rose-500/10 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/20"
              title="Delete Template"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
