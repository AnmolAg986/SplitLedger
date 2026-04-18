import React, { useState, useEffect } from 'react';
import { X, Users, Calculator, Loader2 } from 'lucide-react';
import { apiClient } from '../api/axios';

interface CreateExpenseModalProps {
  onClose: () => void;
  onSuccess: () => void;
  groupId?: string; // If null, it's a global expense
  availableUsers: { id: string; display_name: string }[];
  currentUserId: string;
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({ onClose, onSuccess, groupId, availableUsers, currentUserId }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percentage'>('equal');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([currentUserId]);
  
  // Custom split values map (userId -> amount/percentage)
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle equal split auto-calculation natively
  const computeSplits = () => {
    const totalAmount = Number(amount) || 0;
    if (splitType === 'equal') {
      const splitAmount = parseFloat((totalAmount / selectedUsers.length).toFixed(2));
      return selectedUsers.map(userId => ({ userId, amount: splitAmount }));
    }
    
    if (splitType === 'exact') {
      return selectedUsers.map(userId => ({
        userId,
        amount: Number(customSplits[userId] || 0)
      }));
    }

    if (splitType === 'percentage') {
      return selectedUsers.map(userId => {
        const pct = Number(customSplits[userId] || 0);
        return {
          userId,
          amount: parseFloat(((totalAmount * pct) / 100).toFixed(2))
        };
      });
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const splits = computeSplits();

    const sum = splits.reduce((acc, split) => acc + split.amount, 0);
    const totalAmount = Number(amount) || 0;

    // Because of floating points, allow a tiny margin of 0.05
    if (Math.abs(sum - totalAmount) > 0.05) {
      if (splitType === 'percentage') {
        const totalPct = selectedUsers.reduce((acc, u) => acc + Number(customSplits[u] || 0), 0);
        if (Math.abs(totalPct - 100) > 0.01) return setError(`Percentages must equal 100%. Total is ${totalPct}%`);
      } else {
         return setError(`Split total (${sum}) does not equal the expense amount (${totalAmount})`);
      }
    }

    setLoading(true);
    try {
      await apiClient.post('/expenses', {
        groupId: groupId || null,
        paidBy: currentUserId,
        description,
        amount: totalAmount,
        currency: 'INR',
        splitType,
        splits
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      if (selectedUsers.length === 1) return; // Must have at least 1 person
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            Add Expense
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg shrink-0">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto custom-scrollbar flex-1 pr-2">
          
          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</label>
            <input 
              type="text" required value={description} onChange={e => setDescription(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="Dinner, Uber, etc."
            />
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-zinc-500">₹</span>
              <input 
                type="number" step="0.01" required min="1" value={amount} onChange={e => setAmount(Number(e.target.value) || '')}
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/5 shrink-0">
             <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Involving Who?</label>
             <div className="flex flex-wrap gap-2">
               {availableUsers.map(u => {
                 const isSelected = selectedUsers.includes(u.id);
                 return (
                   <button 
                     type="button" key={u.id} onClick={() => toggleUser(u.id)}
                     className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/30'}`}
                   >
                     {u.id === currentUserId ? 'You' : u.display_name}
                   </button>
                 );
               })}
             </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/5 shrink-0">
             <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Split Strategy</label>
             <div className="flex bg-black/50 border border-white/10 rounded-xl p-1 relative">
                <button type="button" className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${splitType === 'equal' ? 'bg-white/10 text-white' : 'text-zinc-500'}`} onClick={() => setSplitType('equal')}>Equally</button>
                <button type="button" className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${splitType === 'exact' ? 'bg-white/10 text-white' : 'text-zinc-500'}`} onClick={() => setSplitType('exact')}>Exact Amts</button>
                <button type="button" className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${splitType === 'percentage' ? 'bg-white/10 text-white' : 'text-zinc-500'}`} onClick={() => setSplitType('percentage')}>Percentages</button>
             </div>
          </div>

          {splitType !== 'equal' && (
            <div className="flex flex-col gap-3 py-2 shrink-0">
              {selectedUsers.map(uid => {
                const user = availableUsers.find(u => u.id === uid);
                return (
                  <div key={uid} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300 font-medium">{user?.id === currentUserId ? 'You' : user?.display_name}</span>
                    <div className="relative w-32">
                      {splitType === 'exact' && <span className="absolute left-3 top-2 text-zinc-500 text-sm">₹</span>}
                      {splitType === 'percentage' && <span className="absolute right-3 top-2 text-zinc-500 text-sm">%</span>}
                      <input 
                        type="number" step="0.01" required
                        value={customSplits[uid] || ''}
                        onChange={(e) => setCustomSplits({...customSplits, [uid]: e.target.value})}
                        className={`w-full bg-black/30 border border-white/10 rounded-lg py-2 text-sm text-white focus:outline-none focus:border-indigo-500 text-right ${splitType === 'exact' ? 'pl-7 pr-3' : 'pr-7 pl-3'}`}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          <div className="pt-4 mt-2 border-t border-white/5 shrink-0">
             <button type="submit" disabled={loading || !amount || selectedUsers.length === 0} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
               {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save Expense
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};
