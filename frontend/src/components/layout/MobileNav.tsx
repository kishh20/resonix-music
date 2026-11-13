import React from 'react';
import { Home, Flame, Search, Compass, Library } from 'lucide-react';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'new-releases', label: 'Drops', icon: Flame },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'library', label: 'Library', icon: Library },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-aurora-card/95 backdrop-blur-xl border-t border-white/10 px-2 flex items-center justify-around select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center w-16 h-full py-1 transition-colors ${
              isActive ? 'text-aurora-accent font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-aurora-accent stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-1">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
