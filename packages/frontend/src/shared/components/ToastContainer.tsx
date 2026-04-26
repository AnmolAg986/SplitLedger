import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';
import type { ToastType } from '../store/useToastStore';

const TOAST_STYLES: Record<ToastType, { icon: any, color: string, border: string }> = {
  success: { 
    icon: CheckCircle2, 
    color: 'text-emerald-400 bg-emerald-500/10', 
    border: 'border-emerald-500/20' 
  },
  error: { 
    icon: AlertCircle, 
    color: 'text-rose-400 bg-rose-500/10', 
    border: 'border-rose-500/20' 
  },
  info: { 
    icon: Info, 
    color: 'text-indigo-400 bg-indigo-500/10', 
    border: 'border-indigo-500/20' 
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'text-amber-400 bg-amber-500/10', 
    border: 'border-amber-500/20' 
  },
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none min-w-[320px] max-w-[400px]">
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          const Icon = style.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border ${style.border} ${style.color} backdrop-blur-xl shadow-2xl`}
              layout
            >
              <div className="mt-0.5 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="mt-0.5 shrink-0 text-current opacity-40 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
