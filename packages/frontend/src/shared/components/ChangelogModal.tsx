import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import FocusLock from 'react-focus-lock';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, markdownContent }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <FocusLock returnFocus>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85vh] bg-[#121214] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">What's New</h2>
                    <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase mt-1">Release Notes</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="prose prose-invert max-w-none prose-h1:text-2xl prose-h2:text-xl prose-h2:text-indigo-400 prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:text-zinc-200 prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-strong:text-white prose-ul:list-disc prose-li:my-1 prose-p:text-zinc-300">
                  <ReactMarkdown>
                    {markdownContent}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  Awesome!
                </button>
              </div>
            </motion.div>
          </div>
        </FocusLock>
      )}
    </AnimatePresence>
  );
};
