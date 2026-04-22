import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';
import { toast } from '../../../shared/store/useToastStore';

interface Budget {
  id: string;
  category: string | null;
  amount: string;
  period: string;
  spent: number;
  progress: number;
}

export const BudgetWidgets: React.FC<{ refreshTrigger: number }> = ({ refreshTrigger }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [category, setCategory] = useState('');

  const fetchBudgets = async () => {
    try {
      const res = await apiClient.get('/budgets/personal');
      setBudgets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [refreshTrigger]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    try {
      await apiClient.post('/budgets', {
        amount: parseFloat(amount),
        period,
        category: category || null,
        startsAt: new Date().toISOString().split('T')[0]
      });
      toast.success('Budget created!');
      setModalOpen(false);
      setAmount('');
      setCategory('');
      fetchBudgets();
    } catch (err) {
      toast.error('Failed to create budget');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/budgets/${id}`);
      toast.success('Budget removed');
      fetchBudgets();
    } catch (err) {
      toast.error('Failed to remove budget');
    }
  };

  if (loading) return null;

  return (
    <div className="w-full mt-8">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-pink-400" />
          <h2 className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest">Budgets</h2>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="text-[11px] font-bold text-pink-400 uppercase tracking-widest hover:text-pink-300 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> New Budget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.length === 0 ? (
          <div className="col-span-full p-6 border border-white/5 rounded-2xl bg-white/[0.02] text-center">
            <p className="text-zinc-500 text-sm mb-2">No active budgets.</p>
            <button onClick={() => setModalOpen(true)} className="text-pink-400 font-bold text-xs uppercase hover:underline">Create your first budget</button>
          </div>
        ) : (
          budgets.map(b => (
            <div key={b.id} className="p-5 border border-white/5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors relative group">
              <button 
                onClick={() => handleDelete(b.id)}
                className="absolute top-4 right-4 text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <h3 className="text-white font-bold text-sm">{b.category || 'Total'} Budget</h3>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">{b.period}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-black text-lg">₹{b.spent.toLocaleString()}</p>
                  <p className="text-zinc-500 text-[10px] font-bold tracking-wider">of ₹{parseFloat(b.amount).toLocaleString()}</p>
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${b.progress >= 100 ? 'bg-rose-500' : b.progress >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${b.progress}%` }}
                />
              </div>
              {b.progress >= 100 && <p className="text-[10px] text-rose-400 font-bold mt-2">Budget exceeded!</p>}
              {b.progress >= 80 && b.progress < 100 && <p className="text-[10px] text-amber-400 font-bold mt-2">Nearing limit!</p>}
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#18181b] rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Create Budget</h3>
              <p className="text-xs text-zinc-400">Set a spending limit</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Amount (₹)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                  placeholder="0.00"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Period</label>
                <select 
                  value={period} 
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-pink-500 transition-colors appearance-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Category (Optional)</label>
                <input 
                  type="text" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                  placeholder="e.g. Food, Rent"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-pink-500 hover:bg-pink-400 shadow-lg shadow-pink-500/20 transition-all">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
