import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info'
}) => {
  if (!isOpen) return null;

  const themes = {
    danger: { 
      icon: AlertTriangle, 
      color: 'text-rose-500', 
      bg: 'bg-rose-500/10', 
      border: 'border-rose-500/20', 
      btn: 'bg-rose-500 hover:bg-rose-400' 
    },
    warning: { 
      icon: AlertCircle, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10', 
      border: 'border-amber-500/20', 
      btn: 'bg-amber-500 hover:bg-amber-400 text-black' 
    },
    info: { 
      icon: Info, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-500/10', 
      border: 'border-indigo-500/20', 
      btn: 'bg-indigo-500 hover:bg-indigo-400' 
    },
  };

  const theme = themes[type];
  const Icon = theme.icon;

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
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
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-zinc-900 border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl ${theme.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-6 h-6 ${theme.color}`} />
            </div>
            <div>
              <h3 className="text-white font-bold leading-tight">{title}</h3>
              <p className="text-zinc-500 text-xs mt-1">Please confirm this action</p>
            </div>
          </div>
          
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            {message}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${theme.btn}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
