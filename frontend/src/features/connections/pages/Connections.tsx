import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserCheck, Layers } from 'lucide-react';
import { Friends } from '../../friends/pages/Friends';
import { Groups } from '../../groups/pages/Groups';

type TabType = 'friends' | 'groups';



export const Connections = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'friends';
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Sync tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam && ['all', 'friends', 'groups'].includes(tabParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };



  // If Friends or Groups tab is selected, render them directly
  if (activeTab === 'friends') {
    return (
      <div className="flex flex-col h-full">
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="flex-1 overflow-hidden">
          <Friends />
        </div>
      </div>
    );
  }

  if (activeTab === 'groups') {
    return (
      <div className="flex flex-col h-full">
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="flex-1 overflow-hidden">
          <Groups />
        </div>
      </div>
    );
  }

  // fallback if somehow activeTab is weird
  return (
    <div className="flex flex-col h-full">
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="flex-1 overflow-hidden">
        <Friends />
      </div>
    </div>
  );
};

// ─── Tab Bar Component ────────────────────────────────────────
const TabBar = ({ activeTab, onTabChange }: { activeTab: TabType; onTabChange: (tab: TabType) => void }) => {
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'friends', label: 'Friends', icon: UserCheck },
    { id: 'groups', label: 'Groups', icon: Layers },
  ];

  return (
    <div className="px-6 pt-5 pb-0 shrink-0 bg-transparent z-20 relative">
      <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
