import { toast } from '../../../shared/store/useToastStore';
import React, { useState, useEffect } from 'react';
import { X, Search, Check, Plus } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';
import { CurrencySelector } from '../../../shared/components/CurrencySelector';
import { getCurrencyData } from '../../../shared/constants/currencies';
import { useAuthStore } from '../../../app/store/useAuthStore';

interface Split {
  userId: string;
  amount: number;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string;
  groupType?: string;
  groupMembers?: any[];
  expenseToEdit?: any;  // If provided, we are in edit mode
  onSuccess: () => void;
  defaultDueDay?: number;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ 
  isOpen, onClose, groupId, groupType, groupMembers = [], expenseToEdit, onSuccess, defaultDueDay 
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState('INR');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const currentUser = useAuthStore(state => state.user);
  const [category, setCategory] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [involvedIds, setInvolvedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [memberFilterSearch, setMemberFilterSearch] = useState('');
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);

  // Initialize paidBy and involvedIds when modal opens or members change
  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount.toString());
      setCurrency(expenseToEdit.currency);
      setCategory(expenseToEdit.category || '');
      setDueDate(expenseToEdit.due_date ? expenseToEdit.due_date.substring(0, 10) : '');
      setPaidBy(expenseToEdit.paid_by || getMemberId(groupMembers[0]));
      // Default all members as involved
      setInvolvedIds(groupMembers.map(m => getMemberId(m)));
    } else {
      setDescription('');
      setAmount('');
      setCategory('');
      setDueDate('');
      setPaidBy(getMemberId(groupMembers[0]));
      setInvolvedIds(groupMembers.map(m => getMemberId(m)));
      setExpenseDate(new Date().toISOString().split('T')[0]);

      // Default paidBy to current user if they are in the group, otherwise first member
      const userMember = groupMembers.find(m => getMemberId(m) === currentUser?.id);
      setPaidBy(userMember ? getMemberId(userMember) : getMemberId(groupMembers[0]));
      if (defaultDueDay) {
        const today = new Date();
        let targetMonth = today.getMonth();
        let targetYear = today.getFullYear();
        
        // If today's day is already past the due day, set for next month
        if (today.getDate() > defaultDueDay) {
          targetMonth += 1;
          if (targetMonth > 11) {
            targetMonth = 0;
            targetYear += 1;
          }
        }
        
        // Create the date (handle 31st on months with 30 days by using last day of month)
        const d = new Date(targetYear, targetMonth, defaultDueDay);
        // If d.getMonth() !== targetMonth, it overflowed (e.g. Feb 30 -> Mar 2), so fix it
        if (d.getMonth() !== (targetMonth % 12 + (targetMonth < 0 ? 12 : 0)) % 12) {
           d.setDate(0); // Last day of target month
        }
        setDueDate(d.toISOString().split('T')[0]);
      } else {
        setDueDate('');
      }
    }
  }, [expenseToEdit, isOpen, groupMembers.length]);

  const getMemberId = (m: any) => m?.user_id || m?.id || '';
  const getMemberName = (m: any) => m?.display_name || m?.name || (getMemberId(m) === 'me' ? 'You' : getMemberId(m));

  const categorySuggestions = React.useMemo(() => {
    if (!groupType || groupType === 'other') return [];
    if (groupType === 'rent') return ['House Rent', 'Water Rent', 'Electricity Rent', 'Maintenance'];
    if (groupType === 'trip') return ['Food', 'Travel', 'Accommodation', 'Activities'];
    return [];
  }, [groupType]);

  if (!isOpen) return null;

  const toggleInvolved = (memberId: string) => {
    if (involvedIds.includes(memberId)) {
      if (involvedIds.length <= 1) return; // Must keep at least 1
      setInvolvedIds(involvedIds.filter(id => id !== memberId));
    } else {
      setInvolvedIds([...involvedIds, memberId]);
    }
  };

  const selectAllMembers = () => {
    setInvolvedIds(groupMembers.map(m => getMemberId(m)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const splitAmount = parseFloat(amount) / involvedIds.length;
      const splits = involvedIds.map(uid => ({ userId: uid, amount: splitAmount }));

      const payload = {
        groupId,
        paidBy: paidBy || getMemberId(groupMembers[0]),
        amount: parseFloat(amount),
        currency,
        description,
        splitType: 'equal',
        category,
        dueDate: dueDate || undefined,
        splits,
        date: expenseDate
      };

      if (expenseToEdit) {
        await apiClient.put(`/expenses/${expenseToEdit.id}`, payload);
      } else {
        await apiClient.post('/expenses', payload);
        if (isRecurring) {
           await apiClient.post('/expenses/recurring', {
             groupId,
             template: { ...payload, splitType: 'equal' }, // Simplified for now
             frequency,
             is_active: true
           });
        }
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.info();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white mb-6 shrink-0">
          {expenseToEdit ? 'Edit Expense' : 'Add Expense'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
          <div>
            <label className="block text-xs text-zinc-400 mb-1 font-medium">Description</label>
            <input 
              required
              autoFocus
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="What was this expense for?"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-zinc-400 mb-1 font-medium">Amount</label>
              <input 
                required
                type="number" 
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)} onWheel={e => e.currentTarget.blur()}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors font-bold"
                placeholder="0.00"
              />
            </div>
            <div className="w-40">
               <label className="block text-xs text-zinc-400 mb-1 font-medium">Currency</label>
               <CurrencySelector value={currency} onChange={setCurrency} />
            </div>
          </div>

          {/* Who Paid */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1 font-medium">Paid By</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {groupMembers.map(m => (
                <option key={getMemberId(m)} value={getMemberId(m)}>
                  {getMemberName(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Split Among */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <label className="block text-xs text-zinc-400 font-medium">Split Among</label>
                <button 
                  type="button" 
                  onClick={() => setIsMemberSearchOpen(!isMemberSearchOpen)}
                  className={`p-1 rounded-md transition-colors ${isMemberSearchOpen ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={selectAllMembers}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                Select All
              </button>
            </div>

            {isMemberSearchOpen && (
              <div className="relative mb-3 animate-in slide-in-from-top-1 duration-200">
                <input 
                  autoFocus
                  type="text"
                  value={memberFilterSearch}
                  onChange={e => setMemberFilterSearch(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500/50"
                  placeholder="Filter members..."
                />
                {memberFilterSearch && (
                  <button 
                    onClick={() => setMemberFilterSearch('')}
                    className="absolute right-2 top-1.5 text-zinc-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {groupMembers
                .filter(m => getMemberName(m).toLowerCase().includes(memberFilterSearch.toLowerCase()))
                .map(m => {
                  const mid = getMemberId(m);
                  const isSelected = involvedIds.includes(mid);
                  return (
                    <button
                      type="button"
                      key={mid}
                      onClick={() => toggleInvolved(mid)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/30'
                      }`}
                    >
                      {getMemberName(m)}
                    </button>
                  );
                })}
            </div>
            {amount && involvedIds.length > 0 && (
              <p className="text-[11px] text-zinc-500 mt-2">
                Each person pays <span className="text-white font-bold">{currency} {(parseFloat(amount) / involvedIds.length).toFixed(2)}</span>
              </p>
            )}
          </div>

          <div>
             <label className="block text-xs text-zinc-400 mb-1 font-medium">Category</label>
             <input 
               type="text" 
               value={category}
               onChange={(e) => setCategory(e.target.value)}
               className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
               placeholder="e.g. Food"
             />
             {categorySuggestions.length > 0 && (
               <div className="flex flex-wrap gap-2 mt-2">
                 {categorySuggestions.map(s => (
                   <button 
                     key={s} 
                     type="button"
                     onClick={() => setCategory(s)}
                     className="text-[11px] font-medium px-2 py-1 bg-white/5 hover:bg-indigo-500/20 border border-white/5 rounded text-zinc-300 transition-colors"
                   >
                     {s}
                   </button>
                 ))}
               </div>
             )}
          </div>

          <div>
             <label className="block text-xs text-zinc-400 mb-1 font-medium">Date of Expense</label>
             <input 
               type="date" 
               required
               value={expenseDate}
               onChange={(e) => setExpenseDate(e.target.value)}
               className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
             />
          </div>

          <div>
             <label className="block text-xs text-zinc-400 mb-1 font-medium">Due Date (Optional)</label>
             <input 
               type="date" 
               value={dueDate}
               onChange={(e) => setDueDate(e.target.value)}
               className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
             />
          </div>

          {groupId && (
            <div className="pt-2 border-t border-white/5 space-y-4">
               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-white">Make Recurring</span>
                     <span className="text-[10px] text-zinc-500">Auto-post this expense periodically</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${isRecurring ? 'bg-indigo-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isRecurring ? 'left-6' : 'left-1'}`} />
                  </button>
               </div>

               {isRecurring && (
                 <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                    {['daily', 'weekly', 'monthly', 'yearly'].map(f => (
                      <button 
                        key={f} 
                        type="button"
                        onClick={() => setFrequency(f as any)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${frequency === f ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                      >
                        {f}
                      </button>
                    ))}
                 </div>
               )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            {loading ? 'Saving...' : (expenseToEdit ? 'Save Changes' : 'Add Expense')}
          </button>
        </form>
      </div>
    </div>
  );
};

