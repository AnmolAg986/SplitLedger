import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Keyboard, X } from 'lucide-react';

const shortcuts = [
  { key: 'Ctrl + K', action: 'Command palette' },
  { key: 'Ctrl + N', action: 'New expense (Global)' },
  { key: 'Ctrl + S', action: 'Settle up (in Friend Detail)' },
  { key: 'Esc', action: 'Close modals/menus' },
  { key: 'J / K', action: 'Navigate expenses up/down' },
  { key: 'R', action: 'Reply to selected message' },
  { key: 'E', action: 'Edit selected message' },
  { key: '?', action: 'Show this cheat sheet' },
];

export const ShortcutOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);

  useHotkeys('?', (e) => {
    // Only open if not typing in an input
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }
    e.preventDefault();
    setIsOpen(true);
  }, { enableOnFormTags: false });

  useHotkeys('esc', () => setIsOpen(false), { enabled: isOpen });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-[#050505]/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={() => setIsOpen(false)}
      ></div>
      
      <div className="relative w-full max-w-md mx-4 bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-[14px] text-zinc-400 font-medium">{s.action}</span>
              <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-[11px] font-mono text-white font-bold tracking-widest shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className="text-[11px] text-zinc-500 font-medium">Use shortcuts to navigate SplitLedger like a pro.</p>
        </div>
      </div>
    </div>
  );
};
