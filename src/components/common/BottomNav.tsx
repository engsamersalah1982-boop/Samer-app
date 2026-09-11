import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Wrench,
  QrCode,
  Menu,
  X,
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
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';

export type TabType =
  | 'dashboard'
  | 'tasks'
  | 'maintenance'
  | 'equipment'
  | 'pm'
  | 'requests'
  | 'procurement'
  | 'documents'
  | 'reports'
  | 'audit'
  | 'users'
  | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenQRScanner: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenQRScanner,
}) => {
  const { isArabic, t } = useLanguage();
  const { isTechnicianOrEmployee, canManageUsers } = useAuth();
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  const handleSelectTab = (tab: TabType) => {
    onSelectTab(tab);
    setShowMoreDrawer(false);
  };

  return (
    <>
      {/* More Modules Overlay Drawer on Mobile */}
      {showMoreDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-fade-in">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                {isArabic ? 'كافة أقسام المنظومة' : 'All Operations Modules'}
              </h3>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => handleSelectTab('equipment')}
                className={`p-3 rounded-2xl border text-start flex flex-col gap-2 transition ${
                  activeTab === 'equipment'
                    ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <Cpu className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold">{t('navEquipment')}</span>
              </button>

              <button
                onClick={() => handleSelectTab('pm')}
                className={`p-3 rounded-2xl border text-start flex flex-col gap-2 transition ${
                  activeTab === 'pm'
                    ? 'bg-teal-950 border-teal-500/50 text-teal-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <CalendarClock className="w-5 h-5 text-teal-400" />
                <span className="text-xs font-bold">{t('navPM')}</span>
              </button>

              <button
                onClick={() => handleSelectTab('requests')}
                className={`p-3 rounded-2xl border text-start flex flex-col gap-2 transition ${
                  activeTab === 'requests'
                    ? 'bg-purple-950 border-purple-500/50 text-purple-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <FileClock className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-bold">{t('navRequests')}</span>
              </button>

              <button
                onClick={() => handleSelectTab('procurement')}
                className={`p-3 rounded-2xl border text-start flex flex-col gap-2 transition ${
                  activeTab === 'procurement'
                    ? 'bg-amber-950 border-amber-500/50 text-amber-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold">{t('navProcurement')}</span>
              </button>

              <button
                onClick={() => handleSelectTab('documents')}
                className={`p-3 rounded-2xl border text-start flex flex-col gap-2 transition ${
                  activeTab === 'documents'
                    ? 'bg-blue-950 border-blue-500/50 text-blue-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <Files className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold">{t('navDocuments')}</span>
              </button>

              <button
                onClick={() => handleSelectTab('reports')}
                className={`p-3 rounded-2xl border text-start flex flex-col gap-2 transition ${
                  activeTab === 'reports'
                    ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold">{t('navReports')}</span>
              </button>

              <button
                onClick={() => handleSelectTab('audit')}
                className={`p-3 rounded-2xl border text-start flex flex-col gap-2 transition ${
                  activeTab === 'audit'
                    ? 'bg-purple-950 border-purple-500/50 text-purple-300'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <History className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-bold">{t('navAudit')}</span>
              </button>

              {canManageUsers && (
                <button
                  onClick={() => handleSelectTab('users')}
                  className={`p-3 rounded-2xl border text-start flex flex-col gap-2 transition ${
                    activeTab === 'users'
                      ? 'bg-amber-950 border-amber-500/50 text-amber-300'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                  }`}
                >
                  <Users className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold">{t('navUsers')}</span>
                </button>
              )}

              <button
                onClick={() => handleSelectTab('settings')}
                className={`p-3 rounded-2xl border text-start flex flex-col gap-2 transition ${
                  activeTab === 'settings'
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <Settings className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold">{t('navSettings')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Nav for Mobile / Tablet */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 text-slate-400 lg:hidden px-2 py-1 shadow-2xl">
        <div className="grid grid-cols-5 items-center justify-around max-w-lg mx-auto">
          {/* Dashboard */}
          <button
            onClick={() => handleSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 transition ${
              activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] truncate">{t('navDashboard')}</span>
          </button>

          {/* Tasks */}
          <button
            onClick={() => handleSelectTab('tasks')}
            className={`flex flex-col items-center justify-center py-1.5 transition ${
              activeTab === 'tasks' ? 'text-emerald-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] truncate">{t('navTasks')}</span>
          </button>

          {/* Elevated Center QR Scanner Button */}
          <div className="flex justify-center -mt-5">
            <button
              onClick={onOpenQRScanner}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/80 border-2 border-slate-950 active:scale-95 transition"
              title={t('navScanQR')}
            >
              <QrCode className="w-6 h-6" />
            </button>
          </div>

          {/* Maintenance */}
          <button
            onClick={() => handleSelectTab('maintenance')}
            className={`flex flex-col items-center justify-center py-1.5 transition ${
              activeTab === 'maintenance' ? 'text-emerald-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Wrench className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] truncate">{t('navMaintenance')}</span>
          </button>

          {/* More Menu */}
          <button
            onClick={() => setShowMoreDrawer(true)}
            className={`flex flex-col items-center justify-center py-1.5 transition ${
              showMoreDrawer ||
              ['equipment', 'pm', 'requests', 'documents', 'reports', 'audit', 'settings'].includes(
                activeTab
              )
                ? 'text-emerald-400 font-bold'
                : 'hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] truncate">{isArabic ? 'المزيد' : 'More'}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
