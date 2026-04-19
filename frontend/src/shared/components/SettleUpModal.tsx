import { useState, useEffect } from 'react';
import { apiClient } from '../api/axios';
import { X, CheckCircle2, Loader2, Banknote } from 'lucide-react';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface OweItem {
  user_id: string;
  display_name: string;
  amount: number;
}

export const SettleUpModal = ({ isOpen, onClose, onSuccess }: SettleUpModalProps) => {
  const [loading, setLoading] = useState(true);
  const [oweList, setOweList] = useState<OweItem[]>([]);
  const [settling, setSettling] = useState<string | null>(null);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/dashboard/summary');
      setOweList(data.insights?.topOwe || []);
    } catch (err) {
      console.error('Failed to fetch balances for settlement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const load = async () => { await fetchBalances(); };
      load();
    }
  }, [isOpen]);

  const handleSettle = async (friendId: string, amount: number) => {
    setSettling(friendId);
    try {
      await apiClient.post('/settlements', {
        toUser: friendId,
        amount: amount,
        currency: 'INR'
      });
      setOweList(prev => prev.filter(item => item.user_id !== friendId));
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Settlement failed:', err);
    } finally {
      setSettling(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-[#0c0c0e] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Settle Up</h2>
              <p className="text-zinc-500 text-xs mt-0.5">Record a payment to clear your debt</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="p-6 custom-scrollbar max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-zinc-500 text-sm font-medium">Calculating balances...</p>
            </div>
          ) : oweList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/5 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
              </div>
              <h3 className="text-white font-bold mb-1">All Clear!</h3>
              <p className="text-zinc-500 text-sm max-w-[200px]">You don't owe anyone anything right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">You owe these people</p>
              {oweList.map((person) => (
                <div key={person.user_id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                      {person.display_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{person.display_name}</div>
                      <div className="text-rose-400 text-sm font-black">₹{person.amount}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSettle(person.user_id, person.amount)}
                    disabled={settling === person.user_id}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50 flex items-center gap-2"
                  >
                    {settling === person.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Settle
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
