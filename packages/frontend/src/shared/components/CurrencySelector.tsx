import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { CURRENCIES, getCurrencyData } from '../constants/currencies';

interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = getCurrencyData(value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-black/50 border border-white/10 rounded-xl pl-3 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold transition-all hover:bg-white/5 active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <img 
            src={`https://flagcdn.com/w20/${selected.flag}.png`} 
            className="w-4 h-3 object-contain rounded-sm" 
            alt={selected.code} 
          />
          <span>{selected.code}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5 last:mb-0 ${
                  value === c.code 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-4 overflow-hidden rounded-[2px] border border-white/5 shrink-0 flex items-center justify-center bg-black/20">
                    <img 
                      src={`https://flagcdn.com/w20/${c.flag}.png`} 
                      className="w-full h-full object-cover" 
                      alt="" 
                    />
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="font-bold">{c.code}</span>
                    <span className={`text-[10px] font-medium mt-0.5 ${value === c.code ? 'text-indigo-100' : 'text-zinc-500'}`}>
                      {c.name}
                    </span>
                  </div>
                </div>
                {value === c.code && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
