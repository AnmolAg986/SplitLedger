
import React, { useState, useEffect } from 'react';
import { X, Search, Bookmark } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';
import { templateApi } from '../../../shared/api/templateApi';
import { CurrencySelector } from '../../../shared/components/CurrencySelector';
import { useAuthStore } from '../../../app/store/useAuthStore';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string;
  groupType?: string;
  groupMembers?: any[];
  expenseToEdit?: any;  // If provided, we are in edit mode
  onSuccess: () => void;
  defaultDueDay?: number;
  onOptimisticSubmit?: (expense: any, tempId: string) => void;
  onRevert?: (tempId: string) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ 
  isOpen, onClose, groupId, groupType, groupMembers = [], expenseToEdit, onSuccess, defaultDueDay, onOptimisticSubmit, onRevert
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
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percentage' | 'shares'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const getMemberId = (m: any) => m?.user_id || m?.id || '';
  const getMemberName = (m: any) => m?.display_name || m?.name || (getMemberId(m) === 'me' ? 'You' : getMemberId(m));

  useEffect(() => {
    if (expenseToEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount.toString());
      setCurrency(expenseToEdit.currency);
      setCategory(expenseToEdit.category || '');
      setDueDate(expenseToEdit.due_date ? expenseToEdit.due_date.substring(0, 10) : '');
      setPaidBy(expenseToEdit.paid_by || getMemberId(groupMembers[0]));
      setTags(expenseToEdit.tags || []);
      // Default all members as involved
      setInvolvedIds(groupMembers.map(m => getMemberId(m)));
    } else {
      setDescription('');
      setAmount('');
      setCategory('');
      setTags([]);
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

  useEffect(() => {
    if (isOpen) {
      templateApi.getTemplates(groupId).then(setTemplates).catch(console.error);
    }
  }, [isOpen, groupId]);

  const applyTemplate = (t: any) => {
    setDescription(t.description || '');
    setAmount(t.amount.toString());
    setCategory(t.category || '');
    setSplitType(t.split_mode as any);
    if (t.participants && Array.isArray(t.participants)) {
      const ids = t.participants.map((p: any) => p.userId);
      setInvolvedIds(ids);
      const custom: Record<string, string> = {};
      t.participants.forEach((p: any) => {
        if (t.split_mode === 'exact' || t.split_mode === 'percentage') {
          custom[p.userId] = p.amount.toString();
        } else if (t.split_mode === 'shares') {
          custom[p.userId] = (p.shares || 1).toString();
        }
      });
      setCustomSplits(custom);
    }
    setShowTemplates(false);
  };

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

  const computeSplits = () => {
    const totalAmount = Number(amount) || 0;
    if (splitType === 'equal') {
      const splitAmount = parseFloat((totalAmount / involvedIds.length).toFixed(2));
      return involvedIds.map(userId => ({ userId, amount: splitAmount }));
    }
    if (splitType === 'exact') {
      return involvedIds.map(userId => ({
        userId,
        amount: Number(customSplits[userId] || 0)
      }));
    }
    if (splitType === 'percentage') {
      return involvedIds.map(userId => {
        const pct = Number(customSplits[userId] || 0);
        return {
          userId,
          amount: parseFloat(((totalAmount * pct) / 100).toFixed(2))
        };
      });
    }
    if (splitType === 'shares') {
      const totalShares = involvedIds.reduce((sum, u) => sum + Number(customSplits[u] || 1), 0);
      return involvedIds.map(userId => {
        const shares = Number(customSplits[userId] || 1);
        const amt = totalShares > 0 ? (totalAmount * shares) / totalShares : 0;
        return {
          userId,
          amount: parseFloat(amt.toFixed(2)),
          shares
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

    if (Math.abs(sum - totalAmount) > 0.05) {
      if (splitType === 'percentage') {
        const totalPct = involvedIds.reduce((acc, u) => acc + Number(customSplits[u] || 0), 0);
        if (Math.abs(totalPct - 100) > 0.01) return setError(`Percentages must equal 100%. Total is ${totalPct}%`);
      } else {
         return setError(`Split total (${sum}) does not equal the expense amount (${totalAmount})`);
      }
    }

    const tempId = `temp_${Date.now()}`;
    const totalAmountNum = totalAmount;

    setLoading(true);

    if (!expenseToEdit && onOptimisticSubmit) {
      const tempExpense = {
        id: tempId,
        description,
        amount: totalAmountNum,
        currency,
        category: category || 'other',
        date: expenseDate,
        due_date: dueDate || null,
        tags,
        paid_by_id: paidBy || getMemberId(groupMembers[0]),
        paid_by_name: groupMembers.find(m => getMemberId(m) === (paidBy || getMemberId(groupMembers[0])))?.display_name || 'You',
        is_settled: false,
        created_at: new Date().toISOString()
      };
      onOptimisticSubmit(tempExpense, tempId);
    }

    try {
      const payload = {
        groupId,
        paidBy: paidBy || getMemberId(groupMembers[0]),
        amount: totalAmount,
        currency,
        description,
        splitType,
        category,
        dueDate: dueDate || undefined,
        splits,
        date: expenseDate,
        tags
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
        if (saveAsTemplate && templateName) {
          try {
            await templateApi.createTemplate({
              groupId,
              name: templateName,
              description,
              amount: totalAmount,
              splitMode: splitType,
              category,
              participants: splits
            });
          } catch (err) {
            console.error('Failed to save template', err);
          }
        }
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (!expenseToEdit && onRevert) onRevert(tempId);
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[env(safe-area-inset-bottom)] sm:pb-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white mb-6 shrink-0">
          {expenseToEdit ? 'Edit Expense' : 'Add Expense'}
        </h2>

        {templates.length > 0 && !expenseToEdit && (
          <div className="mb-4 shrink-0">
            <button type="button" onClick={() => setShowTemplates(!showTemplates)} className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              <Bookmark className="w-3 h-3" />
              {showTemplates ? 'Hide Templates' : 'Use a Template'}
            </button>
            {showTemplates && (
              <div className="mt-2 flex flex-wrap gap-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg shrink-0">{error}</div>}

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
            
            {involvedIds.length > 0 && (
              <div className="flex flex-col gap-2 mt-4 border-t border-white/5 pt-3">
                 <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Split Strategy</label>
                 <div className="flex bg-black/50 border border-white/10 rounded-xl p-1 relative">
                    <button type="button" className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${splitType === 'equal' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setSplitType('equal')}>Equally</button>
                    <button type="button" className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${splitType === 'exact' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setSplitType('exact')}>Custom</button>
                    <button type="button" className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${splitType === 'percentage' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setSplitType('percentage')}>Percentage</button>
                    <button type="button" className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${splitType === 'shares' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setSplitType('shares')}>Shares</button>
                 </div>
              </div>
            )}

            {splitType !== 'equal' && involvedIds.length > 0 && (
              <div className="flex flex-col gap-3 py-2 mt-2 shrink-0">
                {involvedIds.map(uid => {
                  const m = groupMembers.find(m => getMemberId(m) === uid);
                  return (
                    <div key={uid} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300 font-medium">{getMemberName(m)}</span>
                      <div className="relative w-32">
                        {splitType === 'exact' && <span className="absolute left-1.5 top-2.5 text-zinc-500 text-[10px] font-bold">{currency}</span>}
                        {splitType === 'percentage' && <span className="absolute right-3 top-2 text-zinc-500 text-sm">%</span>}
                        {splitType === 'shares' && <span className="absolute right-3 top-2 text-zinc-500 text-sm">shares</span>}
                        <input 
                          type="number" step="0.01" required
                          value={customSplits[uid] || ''} onWheel={e => e.currentTarget.blur()}
                          onChange={(e) => setCustomSplits({...customSplits, [uid]: e.target.value})}
                          className={`w-full bg-black/30 border border-white/10 rounded-lg py-2 text-sm text-white focus:outline-none focus:border-indigo-500 text-right ${splitType === 'exact' ? 'pl-9 pr-3' : splitType === 'shares' ? 'pr-14 pl-3' : 'pr-7 pl-3'}`}
                          placeholder={splitType === 'shares' ? '1' : '0'}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {amount && involvedIds.length > 0 && splitType === 'equal' && (
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
             <label className="block text-xs text-zinc-400 mb-1 font-medium">Tags (Optional)</label>
             <div className="flex flex-wrap gap-2 mb-2">
               {tags.map((tag, idx) => (
                 <span key={idx} className="px-2 py-1 bg-indigo-500/10 text-indigo-300 text-xs rounded-md flex items-center gap-1 border border-indigo-500/20 font-medium">
                   {tag}
                   <button type="button" onClick={() => setTags(tags.filter((_, i) => i !== idx))} className="text-indigo-400 hover:text-indigo-200">
                     <X className="w-3 h-3" />
                   </button>
                 </span>
               ))}
             </div>
             <input 
               type="text" 
               value={tagInput}
               onChange={(e) => setTagInput(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && tagInput.trim()) {
                   e.preventDefault();
                   if (!tags.includes(tagInput.trim().toLowerCase())) {
                     setTags([...tags, tagInput.trim().toLowerCase()]);
                   }
                   setTagInput('');
                 }
               }}
               className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
               placeholder="Press Enter to add tags (e.g. food, trip2024)"
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

          {!expenseToEdit && (
            <div className="pt-4 border-t border-white/5 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-black/50 text-indigo-500 focus:ring-indigo-500/50"
                />
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">Save as Template</span>
              </label>
              {saveAsTemplate && (
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template Name (e.g., Monthly Internet)"
                  className="mt-2 w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  required={saveAsTemplate}
                />
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

