import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Tag } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  paid_by_name: string;
  created_at: string;
  is_settled: boolean;
  is_locked?: boolean;
  subcategory?: string;
  category?: string;
  tags?: string[];
}

interface Props {
  expenses: Expense[];
  /** Render function for a single expense row */
  renderExpense: (expense: Expense) => React.ReactNode;
}

/** Groups expenses by subcategory and renders collapsible sections with subtotals. */
export const SubcategoryExpenseList = ({ expenses, renderExpense }: Props) => {
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const key = e.subcategory?.trim() || '(No subcategory)';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    // Sort: named subcategories first, then the default bucket
    return [...map.entries()].sort(([a], [b]) => {
      if (a === '(No subcategory)') return 1;
      if (b === '(No subcategory)') return -1;
      return a.localeCompare(b);
    });
  }, [expenses]);

  // Start all named subcategories open
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const subtotal = (exps: Expense[]) =>
    exps.reduce((sum, e) => sum + Number(e.amount), 0);

  if (grouped.length <= 1 && grouped[0]?.[0] === '(No subcategory)') {
    // No subcategories at all — render flat list
    return <div className="space-y-3">{expenses.map(e => renderExpense(e))}</div>;
  }

  return (
    <div className="space-y-4">
      {grouped.map(([subcategory, exps]) => {
        const isOpen = !collapsed[subcategory];
        const isDefault = subcategory === '(No subcategory)';
        const total = subtotal(exps);

        return (
          <div key={subcategory} className="rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02]">
            {/* Header */}
            <button
              onClick={() => toggle(subcategory)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDefault ? 'bg-zinc-800' : 'bg-indigo-500/20 group-hover:bg-indigo-500/30'}`}>
                  {isDefault
                    ? <Tag className="w-4 h-4 text-zinc-500" />
                    : <FolderOpen className="w-4 h-4 text-indigo-400" />
                  }
                </div>
                <div className="text-left">
                  <p className={`text-sm font-bold ${isDefault ? 'text-zinc-500' : 'text-white'}`}>
                    {isDefault ? 'Other' : subcategory}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-medium mt-0.5">
                    {exps.length} {exps.length === 1 ? 'expense' : 'expenses'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-black text-white">
                    ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-medium">subtotal</p>
                </div>
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-zinc-500 transition-transform" />
                  : <ChevronRight className="w-4 h-4 text-zinc-500 transition-transform" />
                }
              </div>
            </button>

            {/* Collapsible expense rows */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                {exps.map(e => renderExpense(e))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
