import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Wrench,
  Cpu,
  CalendarClock,
  FileClock,
  Files,
  BarChart3,
  History,
  Settings,
  Users,
  ShoppingBag,
} from 'lucide-react';
import { TabType } from './BottomNav';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';

interface SubNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const SubNav: React.FC<SubNavProps> = ({ activeTab, onSelectTab }) => {
  const { t } = useLanguage();
  const { canManageUsers } = useAuth();

  const allTabs: { id: TabType; labelKey: string; icon: React.FC<{ className?: string }>; adminOnly?: boolean }[] = [
    { id: 'dashboard', labelKey: 'navDashboard', icon: LayoutDashboard },
    { id: 'tasks', labelKey: 'navTasks', icon: CheckSquare },
    { id: 'maintenance', labelKey: 'navMaintenance', icon: Wrench },
    { id: 'equipment', labelKey: 'navEquipment', icon: Cpu },
    { id: 'pm', labelKey: 'navPM', icon: CalendarClock },
    { id: 'requests', labelKey: 'navRequests', icon: FileClock },
    { id: 'procurement', labelKey: 'navProcurement', icon: ShoppingBag },
    { id: 'documents', labelKey: 'navDocuments', icon: Files },
    { id: 'reports', labelKey: 'navReports', icon: BarChart3 },
    { id: 'audit', labelKey: 'navAudit', icon: History },
    { id: 'users', labelKey: 'navUsers', icon: Users, adminOnly: true },
    { id: 'settings', labelKey: 'navSettings', icon: Settings },
  ];

  const tabs = allTabs.filter((tab) => !tab.adminOnly || canManageUsers);

  return (
    <div className="hidden lg:block bg-slate-900/60 border-b border-slate-800/80 sticky top-16 z-30 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{t(tab.labelKey as never)}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
