import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { useSocket } from '../../../shared/hooks/useSocket';
import { ArrowLeft, Send, Receipt, Wallet, Banknote } from 'lucide-react';

export const FriendDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { emit, on } = useSocket();
  const [detail, setDetail] = useState<any>(null);
  const [chat, setChat] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      // Fetch detail & chat history
      Promise.all([
        apiClient.get(`/friends/${id}`),
        apiClient.get(`/chat/${id}`)
      ]).then(([detailRes, chatRes]) => {
        setDetail(detailRes.data);
        setChat(chatRes.data);
      }).catch(console.error);

      // Join chat room
      emit('join_conversation', id);
    }
    return () => {
      if (id) emit('leave_conversation', id);
    };
  }, [id, emit]);

  useEffect(() => {
    const unsub = on('new_message', (msg) => {
      setChat(prev => [...prev, msg]);
      emit('mark_read', id);
    });
    return unsub;
  }, [on, emit, id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    try {
      await apiClient.post(`/chat/${id}`, { content: msgInput });
      setMsgInput('');
    } catch (err) {
      console.error(err);
    }
  };

  if (!detail) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-black/40 relative max-w-5xl mx-auto border-x border-white/5 shadow-2xl overflow-hidden backdrop-blur-md">
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
           <div className="w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
       </div>

       {/* HEADER */}
       <div className="p-4 border-b border-white/10 flex items-center justify-between z-10 bg-black/50 backdrop-blur-xl">
         <div className="flex items-center gap-4">
           <button onClick={() => navigate('/friends')} className="text-zinc-400 hover:text-white transition-colors">
             <ArrowLeft className="w-5 h-5" />
           </button>
           <h2 className="text-lg font-bold text-white">Friend Details</h2>
         </div>
         <div className="flex gap-3">
           <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2">
             <Receipt className="w-4 h-4" /> Add Expense
           </button>
           <button className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-sm font-bold transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2">
             <Banknote className="w-4 h-4" /> Settle Up
           </button>
         </div>
       </div>

       <div className="flex flex-1 overflow-hidden z-10">
         {/* LEFT: Balance & Expenses */}
         <div className="w-[400px] border-r border-white/5 flex flex-col bg-black/20">
           {/* Balance Card */}
           <div className="p-6 border-b border-white/5">
             <h3 className="text-[13px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Mutual Balance</h3>
             <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                <Wallet className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-white/5 pointer-events-none" />
                <div className="flex flex-col gap-1 relative z-10">
                  {detail.balance.netBalance === 0 ? (
                    <span className="text-2xl font-bold text-white">All settled up!</span>
                  ) : detail.balance.netBalance > 0 ? (
                    <>
                      <span className="text-sm font-medium text-emerald-400/80">Owes you</span>
                      <span className="text-3xl font-black text-emerald-400 tracking-tight">₹{detail.balance.netBalance}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-rose-400/80">You owe</span>
                      <span className="text-3xl font-black text-rose-400 tracking-tight">₹{Math.abs(detail.balance.netBalance)}</span>
                    </>
                  )}
                </div>
             </div>
           </div>

           {/* Expenses Feed */}
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
             <h3 className="text-[13px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Shared History</h3>
             <div className="flex flex-col gap-3">
               {detail.expenses.length === 0 ? (
                 <p className="text-sm text-zinc-600">No shared expenses found.</p>
               ) : (
                 detail.expenses.map((e: any) => (
                   <div key={e.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                     <div className="flex justify-between items-start mb-2">
                       <h4 className="text-[15px] font-medium text-white">{e.description}</h4>
                       <span className="text-[14px] font-bold text-white">₹{e.amount}</span>
                     </div>
                     <div className="flex justify-between items-center text-[12px] text-zinc-500">
                       <span>{new Date(e.created_at).toLocaleDateString()}</span>
                       <span>Paid by {e.paid_by_name}</span>
                     </div>
                   </div>
                 ))
               )}
             </div>
           </div>
         </div>

         {/* RIGHT: Real-Time Chat */}
         <div className="flex-1 flex flex-col bg-transparent">
           <div className="p-4 border-b border-white/5 text-[13px] font-semibold text-zinc-500 uppercase tracking-widest shadow-sm z-10">
             Direct Messages
           </div>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
             {chat.length === 0 ? (
               <div className="h-full flex flex-col justify-center items-center text-zinc-500">
                 <span className="text-2xl mb-3">💬</span>
                 <p className="text-sm font-medium">Say hello!</p>
               </div>
             ) : (
               chat.map((msg: any) => {
                 const isMe = msg.sender_id !== id;
                 return (
                   <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                     <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-[14px] ${isMe ? 'bg-amber-500 text-black rounded-br-sm font-medium shadow-md shadow-amber-500/10' : 'bg-white/10 text-white rounded-bl-sm border border-white/10'}`}>
                       {msg.content}
                     </div>
                     <span className="text-[10px] text-zinc-600 mt-1 font-medium">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   </div>
                 );
               })
             )}
             <div ref={chatEndRef} />
           </div>

           <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-sm z-10">
             <form onSubmit={handleSend} className="relative flex items-center">
               <input
                 type="text"
                 value={msgInput}
                 onChange={e => setMsgInput(e.target.value)}
                 className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-14 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors shadow-inner"
                 placeholder="Type a message..."
               />
               <button type="submit" disabled={!msgInput.trim()} className="absolute right-2 p-1.5 bg-amber-500 text-black rounded-full disabled:opacity-50 hover:bg-amber-400 transition-colors">
                 <Send className="w-4 h-4 ml-[2px]" />
               </button>
             </form>
           </div>
         </div>
       </div>
    </div>
  );
};
