import React from 'react';
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { db } from '../../services/db';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (actionUrl: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { isArabic, t } = useLanguage();
  const { currentUser } = useAuth();
  const [notificationsList, setNotificationsList] = React.useState(() =>
    db.getNotifications().filter((n) => n.userId === currentUser?.id || n.userId === 'all')
  );

  React.useEffect(() => {
    const refresh = () => {
      setNotificationsList(
        db.getNotifications().filter((n) => n.userId === currentUser?.id || n.userId === 'all')
      );
    };

    if (isOpen) {
      refresh();
      window.addEventListener('jbc-notification-received', refresh);
      window.addEventListener('jbc-data-updated', refresh);
    }

    return () => {
      window.removeEventListener('jbc-notification-received', refresh);
      window.removeEventListener('jbc-data-updated', refresh);
    };
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    if (currentUser) {
      db.markAllNotificationsAsRead(currentUser.id);
      setNotificationsList(
        db.getNotifications().filter((n) => n.userId === currentUser?.id || n.userId === 'all')
      );
    }
  };

  const handleItemClick = (notifId: string, actionUrl?: string) => {
    db.markNotificationAsRead(notifId);
    setNotificationsList(
      db.getNotifications().filter((n) => n.userId === currentUser?.id || n.userId === 'all')
    );
    if (actionUrl) {
      onNavigate(actionUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full sm:max-w-md h-full sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              {isArabic ? 'إشعارات وتنبيهات النظام' : 'System Notifications'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {notificationsList.some((n) => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1">
          {notificationsList.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">{isArabic ? 'لا توجد تنبيهات جديدة' : 'No new notifications'}</p>
            </div>
          ) : (
            notificationsList.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n.id, n.actionUrl)}
                className={`p-3 rounded-xl transition cursor-pointer flex gap-3 ${
                  n.read
                    ? 'bg-transparent hover:bg-slate-800/40 text-slate-400'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-s-2 border-emerald-500'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {n.type === 'alert' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {n.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
                  {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-white truncate">
                      {isArabic ? n.titleAr : n.titleEn}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                    {isArabic ? n.messageAr : n.messageEn}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
