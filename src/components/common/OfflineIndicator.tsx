import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncNotice, setShowSyncNotice] = useState(false);
  const { isArabic, t } = useLanguage();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowSyncNotice(true);
      setTimeout(() => setShowSyncNotice(false), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showSyncNotice) return null;

  return (
    <div
      className={`px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors shadow-inner ${
        isOnline
          ? 'bg-emerald-900/90 text-emerald-200 border-b border-emerald-700'
          : 'bg-amber-950/95 text-amber-200 border-b border-amber-800'
      }`}
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        )}
        <span>
          {isOnline
            ? isArabic
              ? 'تمت استعادة الاتصال بالشبكة — كافة البيانات المحلية محفوظة ومزامنة'
              : 'Connection restored — local data is synchronized'
            : isArabic
            ? 'أنت تعمل حالياً في وضع دون اتصال (Offline Mode) — سيتم حفظ التعديلات محلياً وتحديثها تلقائياً'
            : 'You are in Offline Mode — work orders and tasks are saved locally'}
        </span>
      </div>
    </div>
  );
};
