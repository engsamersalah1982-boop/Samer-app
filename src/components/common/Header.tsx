import React, { useState, useEffect } from 'react';
import {
  Flame,
  Globe,
  Bell,
  LogOut,
  QrCode,
  UserCheck,
  Smartphone,
  ChevronDown,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { db } from '../../services/db';
import { usePWAInstall } from './usePWAInstall';
import { firestoreSync } from '../../services/firestoreSync';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenQRScanner: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  onOpenQRScanner,
}) => {
  const { currentUser, logout } = useAuth();
  const { language, setLanguage, isArabic, t } = useLanguage();
  const { canInstall, triggerInstall } = usePWAInstall();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>(() => firestoreSync.getStatus());
  const [, setNotifTick] = useState(0);

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail?.status) setSyncStatus(e.detail.status);
    };
    const handleNotifUpdate = () => {
      setNotifTick((t) => t + 1);
    };
    window.addEventListener('jbc-sync-status', handleSync);
    window.addEventListener('jbc-notification-received', handleNotifUpdate);
    window.addEventListener('jbc-data-updated', handleNotifUpdate);
    return () => {
      window.removeEventListener('jbc-sync-status', handleSync);
      window.removeEventListener('jbc-notification-received', handleNotifUpdate);
      window.removeEventListener('jbc-data-updated', handleNotifUpdate);
    };
  }, []);

  const notifications = db.getNotifications();
  const unreadCount = notifications.filter(
    (n) => (n.userId === currentUser?.id || n.userId === 'all') && !n.read
  ).length;

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-950 text-purple-300 border-purple-500/40';
      case 'admin':
        return 'bg-blue-950 text-blue-300 border-blue-500/40';
      case 'maintenance_manager':
        return 'bg-amber-950 text-amber-300 border-amber-500/40';
      case 'technician':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-amber-300 shadow-lg shadow-emerald-950 shrink-0 border border-emerald-400/30">
            <Flame className="w-6 h-6 drop-shadow-sm" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                {t('appName')}
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                Al-Ghabawi
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              {t('companyName')}
            </p>
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* QR Scanner Quick Button */}
          <button
            onClick={onOpenQRScanner}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-400 border border-slate-700/80 transition active:scale-95"
            title={t('navScanQR')}
          >
            <QrCode className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Notifications Button with Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition active:scale-95"
            title={isArabic ? 'التنبيهات' : 'Notifications'}
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Real-time Cloud Sync Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
              syncStatus === 'synced'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                : syncStatus === 'connecting'
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-slate-800/80 text-slate-400 border-slate-700'
            }`}
            title={
              syncStatus === 'synced'
                ? (isArabic ? 'قاعدة البيانات السحابية Firebase متصلة ومتزامنة لحظياً' : 'Firebase Cloud Database connected & live synced')
                : syncStatus === 'connecting'
                ? (isArabic ? 'جاري الاتصال بقاعدة البيانات السحابية...' : 'Connecting to Cloud Database...')
                : (isArabic ? 'العمل عبر الذاكرة المحلية (Offline Fallback)' : 'Operating in offline local cache')
            }
          >
            {syncStatus === 'synced' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline-block text-[11px] font-bold">
                  {isArabic ? 'سحابي مباشر' : 'Cloud Live'}
                </span>
              </>
            ) : syncStatus === 'connecting' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline-block text-[11px]">
                  {isArabic ? 'مزامنة...' : 'Syncing...'}
                </span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden xl:inline-block text-[11px]">
                  {isArabic ? 'محلي' : 'Local'}
                </span>
              </>
            )}
          </div>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-bold transition active:scale-95"
            title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* PWA Install Button if available */}
          {canInstall && (
            <button
              onClick={triggerInstall}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تثبيت التطبيق' : 'Install App'}</span>
            </button>
          )}

          {/* Quick Direct Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-rose-950/70 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-700/50 transition active:scale-95 flex items-center gap-1.5"
            title={isArabic ? 'تسجيل الخروج' : 'Log Out'}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden xl:inline text-xs font-semibold">{t('logout')}</span>
          </button>

          {/* User Persona & Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                {currentUser?.nameAr?.charAt(0) || 'م'}
              </div>
              <div className="text-start hidden md:block">
                <span className="text-xs font-bold text-white block leading-tight truncate max-w-[110px]">
                  {isArabic ? currentUser?.nameAr : currentUser?.nameEn}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold inline-block ${getRoleBadgeColor(
                    currentUser?.role
                  )}`}
                >
                  {currentUser?.role.replace('_', ' ')}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* User Profile & Logout Menu */}
            {showUserMenu && (
              <div className="absolute end-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 p-3 shadow-2xl z-50 animate-fade-in text-xs space-y-3">
                <div className="pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {currentUser?.nameAr?.charAt(0) || 'م'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-100 block truncate text-xs">
                        {isArabic ? currentUser?.nameAr : currentUser?.nameEn}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono block truncate">
                        @{currentUser?.username || 'user'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">{isArabic ? 'المسمى الوظيفي:' : 'Job Title:'}</span>
                      <span className="text-slate-200 font-medium truncate max-w-[130px]">
                        {isArabic ? currentUser?.jobTitleAr : currentUser?.jobTitleEn}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">{isArabic ? 'القسم:' : 'Department:'}</span>
                      <span className="text-slate-200 font-medium">{currentUser?.department || 'Operations'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">{isArabic ? 'الدور / الصلاحية:' : 'Role:'}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getRoleBadgeColor(
                          currentUser?.role
                        )}`}
                      >
                        {currentUser?.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 flex items-center justify-center gap-2 font-bold transition active:scale-98"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>{isArabic ? 'تسجيل الخروج من النظام' : 'Sign Out & Lock Session'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
