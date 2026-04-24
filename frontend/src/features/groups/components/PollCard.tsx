import { useState, useEffect } from 'react';
import { apiClient } from '../../../shared/api/axios';
import { CheckCircle, BarChart2, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';

interface PollOption {
  id: string;
  label: string;
}

export interface PollData {
  id: string;
  group_id: string;
  creator_id: string;
  creator_name: string;
  question: string;
  options: PollOption[];
  expires_at: string | null;
  created_at: string;
  vote_counts: Record<string, number>;
  my_vote: string | null;
  total_votes: number;
}

interface Props {
  poll: PollData;
  /** Called when vote counts change (e.g. after casting or via socket update) */
  onUpdate?: (updated: PollData) => void;
}

export const PollCard = ({ poll: initialPoll, onUpdate }: Props) => {
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [voting, setVoting] = useState(false);
  const [showResults, setShowResults] = useState(!!initialPoll.my_vote);

  const isExpired = poll.expires_at ? isPast(new Date(poll.expires_at)) : false;
  const canVote = !isExpired && !showResults;

  // Accept external updates (from socket)
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPoll(prev => ({
      ...prev,
      vote_counts: initialPoll.vote_counts,
      total_votes: initialPoll.total_votes,
      my_vote: initialPoll.my_vote,
    }));
  }, [initialPoll.vote_counts, initialPoll.total_votes, initialPoll.my_vote]);

  const handleVote = async (optionId: string) => {
    if (!canVote || voting) return;
    setVoting(true);
    try {
      const res = await apiClient.post(`/groups/${poll.group_id}/polls/${poll.id}/vote`, { optionId });
      const updated: PollData = res.data;
      setPoll(updated);
      setShowResults(true);
      onUpdate?.(updated);
    } catch (err) {
      console.error('[PollCard] vote error:', err);
    } finally {
      setVoting(false);
    }
  };

  const pct = (optionId: string) => {
    if (!poll.total_votes) return 0;
    return Math.round(((poll.vote_counts[optionId] ?? 0) / poll.total_votes) * 100);
  };

  const winnerPct = Math.max(...poll.options.map(o => pct(o.id)));

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Poll</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {poll.expires_at && (
              <span className={`text-[10px] font-medium flex items-center gap-1 ${isExpired ? 'text-zinc-600' : 'text-amber-400'}`}>
                <Clock className="w-3 h-3" />
                {isExpired ? 'Ended' : `Ends ${formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}`}
              </span>
            )}
            {showResults && !isExpired && (
              <button
                onClick={() => setShowResults(false)}
                className="text-[10px] text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
              >
                change
              </button>
            )}
          </div>
        </div>
        <p className="text-[15px] font-bold text-white leading-snug mb-1">{poll.question}</p>
        <p className="text-[11px] text-zinc-500 font-medium mb-3">
          {poll.creator_name} · {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}
        </p>
      </div>

      {/* Options */}
      <div className="px-4 pb-4 space-y-2">
        {poll.options.map(option => {
          const p = pct(option.id);
          const isWinner = showResults && p === winnerPct && p > 0;
          const isMyVote = poll.my_vote === option.id;

          if (showResults || isExpired) {
            return (
              <div key={option.id} className="relative overflow-hidden rounded-xl">
                {/* Progress bar background */}
                <div
                  className={`absolute inset-0 rounded-xl transition-all duration-700 ${
                    isMyVote
                      ? 'bg-indigo-500/25'
                      : isWinner
                      ? 'bg-emerald-500/15'
                      : 'bg-white/5'
                  }`}
                  style={{ width: `${p}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {isMyVote && <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    <span className={`text-[13px] font-medium ${isMyVote ? 'text-indigo-300' : isWinner ? 'text-emerald-300' : 'text-zinc-300'}`}>
                      {option.label}
                    </span>
                  </div>
                  <span className={`text-[12px] font-black tabular-nums ${isMyVote ? 'text-indigo-300' : isWinner ? 'text-emerald-300' : 'text-zinc-500'}`}>
                    {p}%
                  </span>
                </div>
              </div>
            );
          }

          // Voting view
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={voting}
              className="w-full text-left px-3 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/15 hover:border-indigo-400/40 transition-all text-[13px] font-medium text-zinc-300 hover:text-white flex items-center justify-between group disabled:opacity-50"
            >
              <span>{option.label}</span>
              {voting && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
            </button>
          );
        })}
      </div>

      {/* Results toggle footer */}
      {!showResults && !isExpired && (
        <button
          onClick={() => setShowResults(true)}
          className="w-full py-2 text-[11px] font-medium text-zinc-600 hover:text-zinc-400 transition-colors border-t border-white/5"
        >
          View results without voting
        </button>
      )}
    </div>
  );
};
