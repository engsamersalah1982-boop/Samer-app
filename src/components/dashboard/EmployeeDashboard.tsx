import React from 'react';
import {
  CheckSquare,
  Wrench,
  QrCode,
  FileClock,
  Clock,
  Calendar,
  AlertCircle,
  Files,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { db } from '../../services/db';

interface EmployeeDashboardProps {
  onNavigateToTasks?: () => void;
  onNavigateToWorkOrders?: () => void;
  onNavigateToRequests?: () => void;
  onNavigateToDocuments?: () => void;
  onOpenNewLeaveModal?: () => void;
  onOpenNewPermissionModal?: () => void;
  onOpenQRScanner?: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onNavigateToTasks,
  onNavigateToWorkOrders,
  onNavigateToRequests,
  onNavigateToDocuments,
  onOpenNewLeaveModal,
  onOpenNewPermissionModal,
  onOpenQRScanner,
}) => {
  const { currentUser } = useAuth();
  const { isArabic, t } = useLanguage();

  const allTasks = db.getTasks();
  const allWorkOrders = db.getWorkOrders();
  const allEmployees = db.getEmployees();

  const myEmployee = allEmployees.find(
    (e) => e.userId === currentUser?.id || e.id === currentUser?.employeeId
  );

  // Filter for items assigned to this user
  const myTasks = allTasks.filter((t) => t.assignedToUserId === currentUser?.id);
  const myPendingTasks = myTasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

  const myWorkOrders = allWorkOrders.filter(
    (w) => w.assignedTechnicianId === currentUser?.id && w.status !== 'closed'
  );

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Welcome & Shift Card */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            {isArabic ? 'المناوبة الميدانية النشطة' : 'ACTIVE FIELD SHIFT'}
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
            {isArabic ? `أهلاً بك، ${currentUser?.nameAr}` : `Welcome, ${currentUser?.nameEn}`}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {isArabic ? currentUser?.jobTitleAr : currentUser?.jobTitleEn} • {currentUser?.department}
          </p>
        </div>

        {/* Quick QR button */}
        <button
          onClick={onOpenQRScanner}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition active:scale-95 shrink-0"
        >
          <QrCode className="w-4 h-4" />
          <span>{t('navScanQR')}</span>
        </button>
      </div>

      {/* Leave Balances Strip */}
      {myEmployee && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">
              {t('remainingAnnual')}
            </span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              {myEmployee.annualLeaveBalance} {t('days')}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">
              {t('remainingSick')}
            </span>
            <span className="text-lg font-black text-blue-400 font-mono">
              {myEmployee.sickLeaveBalance} {t('days')}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">
              {t('remainingPermission')}
            </span>
            <span className="text-lg font-black text-purple-400 font-mono">
              {myEmployee.permissionHoursBalance} {t('hours')}
            </span>
          </div>
        </div>
      )}

      {/* My Active Work Orders */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">
              {isArabic ? 'أوامر الصيانة المسندة لي' : 'My Assigned Work Orders'}
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30">
              {myWorkOrders.length}
            </span>
          </div>

          <button
            onClick={() => {
              if (onNavigateToWorkOrders) onNavigateToWorkOrders();
              else if (onNavigateToRequests) onNavigateToRequests();
            }}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
          >
            <span>{isArabic ? 'عرض الأوامر' : 'View all'}</span>
            <ArrowRight className={`w-3.5 h-3.5 ${isArabic ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {myWorkOrders.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            {isArabic ? 'لا توجد أوامر صيانة نشطة مسندة إليك حالياً' : 'No active work orders assigned to you.'}
          </p>
        ) : (
          <div className="space-y-2">
            {myWorkOrders.map((wo) => (
              <div
                key={wo.id}
                onClick={() => {
                  if (onNavigateToWorkOrders) onNavigateToWorkOrders();
                }}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {wo.workOrderNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {wo.equipmentCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium truncate mt-1">
                    {wo.problemDescription}
                  </p>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-950 text-amber-300 border border-amber-600/40 shrink-0">
                  {wo.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Assigned Tasks */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              {isArabic ? 'مهامي اليومية المطلوبة' : 'My Assigned Tasks'}
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              {myPendingTasks.length}
            </span>
          </div>

          <button
            onClick={onNavigateToTasks}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
          >
            <span>{isArabic ? 'عرض المهام' : 'View all'}</span>
            <ArrowRight className={`w-3.5 h-3.5 ${isArabic ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {myPendingTasks.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            {isArabic ? 'تم إنجاز كافة المهام الميدانية المسندة لك اليوم' : 'All your tasks are completed.'}
          </p>
        ) : (
          <div className="space-y-2">
            {myPendingTasks.map((t) => (
              <div
                key={t.id}
                onClick={onNavigateToTasks}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {t.taskCode}
                  </span>
                  <p className="text-xs text-slate-200 font-medium truncate mt-0.5">
                    {isArabic ? t.titleAr : t.titleEn}
                  </p>
                </div>

                <div className="text-end shrink-0">
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {t.dueDate}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            if (onOpenNewLeaveModal) onOpenNewLeaveModal();
            else if (onNavigateToRequests) onNavigateToRequests();
          }}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-start flex flex-col gap-2 transition"
        >
          <FileClock className="w-5 h-5 text-purple-400" />
          <div>
            <h4 className="text-xs font-bold text-white">
              {isArabic ? 'تقديم إجازة / مغادرة' : 'New Leave / Permit'}
            </h4>
            <p className="text-[10px] text-slate-400">
              {isArabic ? 'إرسال طلب رسمي للإدارة' : 'Submit request to manager'}
            </p>
          </div>
        </button>

        <button
          onClick={onNavigateToDocuments}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 text-start flex flex-col gap-2 transition"
        >
          <Files className="w-5 h-5 text-blue-400" />
          <div>
            <h4 className="text-xs font-bold text-white">
              {isArabic ? 'أدلة التشغيل والسلامة' : 'Technical Manuals & SOP'}
            </h4>
            <p className="text-[10px] text-slate-400">
              {isArabic ? 'تحميل المخططات وكتالوجات الصيانة' : 'Access manuals and wiring'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
