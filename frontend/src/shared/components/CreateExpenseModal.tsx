import React, { useState } from 'react';
import { X, Search, Calculator, Loader2, Plus } from 'lucide-react';
import { apiClient } from '../api/axios';
import { CurrencySelector } from './CurrencySelector';

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
  const [currency, setCurrency] = useState('INR');
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percentage'>('equal');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([currentUserId]);
  
  // Custom split values map (userId -> amount/percentage)
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [paidBy, setPaidBy] = useState(currentUserId || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [memberFilterSearch, setMemberFilterSearch] = useState('');
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);

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
        paidBy: paidBy,
        description,
        amount: totalAmount,
        currency,
        splitType,
        splits,
        date: date // Adding date to payload
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create expense');
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
              type="text" autoFocus required value={description} onChange={e => setDescription(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="What was this expense for?"
            />
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Amount</label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input 
                  type="number" step="0.01" required min="1" value={amount} onChange={e => setAmount(Number(e.target.value) || '')} onWheel={e => e.currentTarget.blur()}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold"
                  placeholder="0.00"
                />
              </div>
              <div className="w-40 relative">
                <CurrencySelector value={currency} onChange={setCurrency} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date of Expense</label>
            <input 
              type="date" 
              required
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Paid By */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/5 shrink-0">
             <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Paid By</label>
             <select
               value={paidBy}
               onChange={(e) => setPaidBy(e.target.value)}
               className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
             >
               {availableUsers
                 .filter(u => selectedUsers.includes(u.id) || u.id === currentUserId)
                 .map(u => (
                 <option key={u.id} value={u.id}>
                   {u.id === currentUserId ? 'You' : u.display_name}
                 </option>
               ))}
             </select>
          </div>

          <div className="flex flex-col gap-3 pt-2 border-t border-white/5 shrink-0">
             <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Involving Who?</label>
             
             <div className="flex flex-wrap gap-2 items-center">
               {/* Selected members chips */}
               {availableUsers
                 .filter(u => selectedUsers.includes(u.id))
                 .map(u => (
                   <button 
                     type="button" key={u.id} onClick={() => toggleUser(u.id)}
                     className="px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-500 border border-indigo-400 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
                   >
                     {u.id === currentUserId ? 'You' : u.display_name}
                     {u.id !== currentUserId && <X className="w-3 h-3" />}
                   </button>
                 ))}

               {/* Add Friend Trigger */}
               <div className="relative">
                 <button 
                   type="button"
                   onClick={() => setIsMemberSearchOpen(!isMemberSearchOpen)}
                   className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                     isMemberSearchOpen 
                       ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                       : 'border-dashed border-white/20 text-indigo-400 hover:border-indigo-500/50 hover:bg-white/5'
                   }`}
                 >
                   <Plus className="w-3 h-3" />
                   Add Friend
                 </button>

                 {/* Search Dropdown */}
                 {isMemberSearchOpen && (
                   <div className="absolute top-full left-0 mt-2 w-64 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                     <div className="p-2 border-b border-white/5">
                       <div className="relative">
                         <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" />
                         <input 
                           autoFocus
                           type="text"
                           value={memberFilterSearch}
                           onChange={e => setMemberFilterSearch(e.target.value)}
                           className="w-full bg-black/30 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                           placeholder="Search friends..."
                         />
                       </div>
                     </div>
                     <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                       {availableUsers
                         .filter(u => !selectedUsers.includes(u.id))
                         .filter(u => u.display_name.toLowerCase().includes(memberFilterSearch.toLowerCase()))
                         .map(u => (
                           <button
                             key={u.id}
                             type="button"
                             onClick={() => {
                               toggleUser(u.id);
                               setMemberFilterSearch('');
                             }}
                             className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium text-zinc-400 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-between group"
                           >
                             {u.display_name}
                             <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                           </button>
                         ))}
                       {availableUsers.filter(u => !selectedUsers.includes(u.id)).length === 0 && (
                         <div className="p-3 text-center text-zinc-600 text-[10px] italic">No more friends to add</div>
                       )}
                     </div>
                   </div>
                 )}
               </div>
             </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/5 shrink-0">
             <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Split Strategy</label>
             <div className="flex bg-black/50 border border-white/10 rounded-xl p-1 relative">
                <button type="button" className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${splitType === 'equal' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setSplitType('equal')}>Equally</button>
                <button type="button" className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${splitType === 'exact' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setSplitType('exact')}>Custom</button>
                <button type="button" className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${splitType === 'percentage' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setSplitType('percentage')}>Percentage</button>
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
                      {splitType === 'exact' && <span className="absolute left-1.5 top-2.5 text-zinc-500 text-[10px] font-bold">{currency}</span>}
                      {splitType === 'percentage' && <span className="absolute right-3 top-2 text-zinc-500 text-sm">%</span>}
                      <input 
                        type="number" step="0.01" required
                        value={customSplits[uid] || ''} onWheel={e => e.currentTarget.blur()}
                        onChange={(e) => setCustomSplits({...customSplits, [uid]: e.target.value})}
                        className={`w-full bg-black/30 border border-white/10 rounded-lg py-2 text-sm text-white focus:outline-none focus:border-indigo-500 text-right ${splitType === 'exact' ? 'pl-9 pr-3' : 'pr-7 pl-3'}`}
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
