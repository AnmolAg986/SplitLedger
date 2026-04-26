import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../shared/api/axios';
import { Loader2 } from 'lucide-react';
import { toast } from '../../../shared/store/useToastStore';

export const ExpenseRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await apiClient.get(`/expenses/${id}/context`);
        const { groupId, expenseId } = res.data;
        navigate(`/groups/${groupId}?expenseId=${expenseId}`, { replace: true });
      } catch (err: any) {
        console.error('Failed to fetch expense context:', err);
        setError(err.response?.data?.error || 'Expense not found or access denied');
        toast.error(err.response?.data?.error || 'Expense not found');
      }
    };

    if (id) {
      fetchContext();
    }
  }, [id, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center max-w-sm">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-zinc-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
    </div>
  );
};
