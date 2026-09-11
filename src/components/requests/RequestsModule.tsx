import React, { useState } from 'react';
import {
  FileClock,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Check,
  X,
  FileText,
  UserCheck,
  Printer,
  Edit3,
  Sliders,
  Shield,
  Lock,
} from 'lucide-react';
import { db } from '../../services/db';
import { printRequestSlip } from '../../utils/printUtils';
import { LeaveRequest, PermissionRequest, LeaveType, Employee } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';

interface RequestsModuleProps {
  initialType?: string;
}

export const RequestsModule: React.FC<RequestsModuleProps> = ({ initialType }) => {
  const { isArabic, t } = useLanguage();
  const { currentUser, canApproveRequests, isAdmin } = useAuth();

  // Admin permission to manually edit leave & permission balances
  const canEditBalances =
    isAdmin ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'leaves' | 'permissions'>(
    initialType === 'permission' ? 'permissions' : 'leaves'
  );
  const [showNewLeaveModal, setShowNewLeaveModal] = useState(initialType === 'leave');
  const [showNewPermModal, setShowNewPermModal] = useState(initialType === 'permission');
  const [rejectModalTarget, setRejectModalTarget] = useState<{
    id: string;
    type: 'leave' | 'perm';
  } | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Admin balance edit modal state
  const [showBalanceEditModal, setShowBalanceEditModal] = useState(false);
  const [adminSelectedEmpId, setAdminSelectedEmpId] = useState<string>('');
  const [editAnnualBalance, setEditAnnualBalance] = useState<number>(21);
  const [editSickBalance, setEditSickBalance] = useState<number>(14);
  const [editPermBalance, setEditPermBalance] = useState<number>(4);
  const [editBalanceReason, setEditBalanceReason] = useState<string>('');
  const [isSavingBalances, setIsSavingBalances] = useState(false);

  // New Leave state
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [leaveStartDate, setLeaveStartDate] = useState('2026-09-15');
  const [leaveEndDate, setLeaveEndDate] = useState('2026-09-17');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveReplacementId, setLeaveReplacementId] = useState('emp-5');

  // New Permission state
  const [permDate, setPermDate] = useState('2026-09-08');
  const [permStartTime, setPermStartTime] = useState('12:00');
  const [permEndTime, setPermEndTime] = useState('14:00');
  const [permReasonType, setPermReasonType] = useState<'personal' | 'official'>('personal');
  const [permReason, setPermReason] = useState('');

  // Status Filter
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => db.getLeaveRequests());
  const [permissions, setPermissions] = useState<PermissionRequest[]>(() => db.getPermissionRequests());
  const [employees, setEmployees] = useState<Employee[]>(() => db.getEmployees());

  const refreshRequests = () => {
    setLeaves(db.getLeaveRequests());
    setPermissions(db.getPermissionRequests());
    setEmployees(db.getEmployees());
  };

  // Current logged in user's employee record
  const currentEmp =
    employees.find((e) => e.userId === currentUser?.id || e.id === currentUser?.employeeId) ||
    employees[0];

  // The employee currently shown in the balances widget (Admin can pick any employee)
  const displayedEmp =
    canEditBalances && adminSelectedEmpId
      ? employees.find((e) => e.id === adminSelectedEmpId) || currentEmp
      : currentEmp;

  const openBalanceEditModalForEmp = (targetEmp: Employee) => {
    setAdminSelectedEmpId(targetEmp.id);
    setEditAnnualBalance(targetEmp.annualLeaveBalance);
    setEditSickBalance(targetEmp.sickLeaveBalance);
    setEditPermBalance(targetEmp.permissionHoursBalance);
    setEditBalanceReason('');
    setShowBalanceEditModal(true);
  };

  const handleSaveEmployeeBalances = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditBalances || !displayedEmp || !currentUser) return;
    setIsSavingBalances(true);
    try {
      db.updateEmployeeBalances(
        displayedEmp.id,
        {
          annualLeaveBalance: Number(editAnnualBalance),
          sickLeaveBalance: Number(editSickBalance),
          permissionHoursBalance: Number(editPermBalance),
        },
        currentUser.id,
        currentUser.nameAr,
        editBalanceReason
      );
      refreshRequests();
      setShowBalanceEditModal(false);
      setActionAlert({
        type: 'success',
        message: isArabic
          ? `تم تعديل رصيد الإجازات والمغادرات للموظف (${displayedEmp.nameAr}) بنجاح وتوثيق التعديل.`
          : `Balances updated successfully for (${displayedEmp.nameEn}).`,
      });
      setTimeout(() => setActionAlert(null), 5000);
    } catch (err: any) {
      console.error(err);
      setActionAlert({
        type: 'error',
        message: err?.message || 'تعذر تعديل الرصيد',
      });
    } finally {
      setIsSavingBalances(false);
    }
  };

  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !leaveReason.trim()) return;

    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    db.createLeaveRequest(
      {
        employeeId: currentEmp.id,
        leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        daysCount: days,
        reason: leaveReason.trim(),
        replacementEmployeeId: leaveReplacementId,
        status: 'pending',
      },
      currentUser.id,
      currentUser.nameAr
    );

    refreshRequests();
    setShowNewLeaveModal(false);
    setLeaveReason('');
    setActionAlert({
      type: 'success',
      message: isArabic
        ? 'تم تقديم طلب الإجازة بنجاح وإرسال إشعار فوري لمدير النظام'
        : 'Leave request submitted and admin notified',
    });
    setTimeout(() => setActionAlert(null), 4000);
  };

  const handleCreatePermission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !permReason.trim()) return;

    const [sh, sm] = permStartTime.split(':').map(Number);
    const [eh, em] = permEndTime.split(':').map(Number);
    const durationHours = Math.max(0.5, Math.round(((eh * 60 + em - (sh * 60 + sm)) / 60) * 10) / 10);

    db.createPermissionRequest(
      {
        employeeId: currentEmp.id,
        date: permDate,
        startTime: permStartTime,
        endTime: permEndTime,
        durationHours,
        reasonType: permReasonType,
        reason: permReason.trim(),
        status: 'pending',
      },
      currentUser.id,
      currentUser.nameAr
    );

    refreshRequests();
    setShowNewPermModal(false);
    setPermReason('');
    setActionAlert({
      type: 'success',
      message: isArabic
        ? 'تم تقديم طلب المغادرة بنجاح وإرسال إشعار فوري لمدير النظام'
        : 'Exit permission submitted and admin notified',
    });
    setTimeout(() => setActionAlert(null), 4000);
  };

  const handleApproveLeave = (leaveId: string) => {
    if (!currentUser) return;
    const req = leaves.find((l) => l.id === leaveId);
    if (req && currentEmp && req.employeeId === currentEmp.id) {
      alert(isArabic ? 'لا يمكنك قبول إجازتك بنفسك. يجب أن تعتمد من قبل الإدارة.' : 'You cannot approve your own leave.');
      return;
    }
    db.reviewLeaveRequest(leaveId, 'approved', undefined, currentUser.id, currentUser.nameAr);
    refreshRequests();
    setActionAlert({
      type: 'success',
      message: isArabic
        ? 'تمت الموافقة على الإجازة بنجاح، وخصم الرصيد، وإرسال إشعار للموظف المعني وللأدمن'
        : 'Leave approved, balance adjusted, and notifications dispatched to employee and admin',
    });
    setTimeout(() => setActionAlert(null), 4500);
  };

  const handleApprovePermission = (permId: string) => {
    if (!currentUser) return;
    const req = permissions.find((p) => p.id === permId);
    if (req && currentEmp && req.employeeId === currentEmp.id) {
      alert(isArabic ? 'لا يمكنك قبول إذن مغادرتك بنفسك. يجب أن يعتمد من قبل الإدارة.' : 'You cannot approve your own permission.');
      return;
    }
    db.reviewPermissionRequest(permId, 'approved', undefined, currentUser.id, currentUser.nameAr);
    refreshRequests();
    setActionAlert({
      type: 'success',
      message: isArabic
        ? 'تمت الموافقة على المغادرة وإرسال إشعار للموظف المعني وللأدمن'
        : 'Exit permission approved and notifications dispatched',
    });
    setTimeout(() => setActionAlert(null), 4500);
  };

  const handleConfirmReject = () => {
    if (!rejectModalTarget || !currentUser) return;
    if (rejectModalTarget.type === 'leave') {
      const req = leaves.find((l) => l.id === rejectModalTarget.id);
      if (req && currentEmp && req.employeeId === currentEmp.id) {
        alert(isArabic ? 'لا يمكنك رفض إجازتك بنفسك.' : 'You cannot reject your own leave.');
        setRejectModalTarget(null);
        return;
      }
      db.reviewLeaveRequest(
        rejectModalTarget.id,
        'rejected',
        rejectionReasonInput.trim(),
        currentUser.id,
        currentUser.nameAr
      );
      setActionAlert({
        type: 'error',
        message: isArabic
          ? 'تم رفض طلب الإجازة وتوثيق السبب وإشعار الموظف والأدمن'
          : 'Leave request rejected and notifications dispatched',
      });
    } else {
      const req = permissions.find((p) => p.id === rejectModalTarget.id);
      if (req && currentEmp && req.employeeId === currentEmp.id) {
        alert(isArabic ? 'لا يمكنك رفض طلب مغادرتك بنفسك.' : 'You cannot reject your own permission.');
        setRejectModalTarget(null);
        return;
      }
      db.reviewPermissionRequest(
        rejectModalTarget.id,
        'rejected',
        rejectionReasonInput.trim(),
        currentUser.id,
        currentUser.nameAr
      );
      setActionAlert({
        type: 'error',
        message: isArabic
          ? 'تم رفض طلب المغادرة وتوثيق السبب وإشعار الموظف والأدمن'
          : 'Permission rejected and notifications dispatched',
      });
    }
    refreshRequests();
    setRejectModalTarget(null);
    setRejectionReasonInput('');
    setTimeout(() => setActionAlert(null), 4500);
  };

  return (
    <div className="space-y-5 pb-14 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-500/30">
            <FileClock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t('navRequests')}</h2>
            <p className="text-xs text-slate-400">
              {isArabic ? 'إدارة الإجازات السنوية والمرضية وأذونات المغادرة الميدانية' : 'Leave and exit permission request center'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewLeaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? 'طلب إجازة' : 'Request Leave'}</span>
          </button>
          <button
            onClick={() => setShowNewPermModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? 'طلب مغادرة' : 'Request Exit'}</span>
          </button>
        </div>
      </div>

      {/* Employee Balances Section */}
      <div className="space-y-3">
        {/* Role-based Indicator & Admin Employee Selector */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              canEditBalances
                ? 'bg-amber-950 text-amber-400 border-amber-500/30'
                : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
            }`}>
              {canEditBalances ? <Sliders className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {canEditBalances
                    ? (isArabic ? 'إدارة وتعديل أرصدة إجازات ومغادرات الموظفين' : 'Staff Leave & Permission Balance Manager')
                    : (isArabic ? 'رصيد إجازاتك ومغادراتك السنوي (للقراءة فقط - Read Only)' : 'Your Annual Leave & Permission Balance (Read-Only)')}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  canEditBalances
                    ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {canEditBalances
                    ? (isArabic ? 'صلاحية تعديل (أدمن)' : 'Admin Editable')
                    : (isArabic ? 'للقراءة فقط' : 'Read Only')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {canEditBalances
                  ? (isArabic
                    ? 'يمكن للأدمن تعديل رصيد أي موظف في شركة الغاز الحيوي الأردنية وتوثيق سبب التعديل.'
                    : 'Admins can manually adjust employee leave balances with automatic audit logging.')
                  : (isArabic
                    ? 'يتم خصم رصيد الإجازات والمغادرات تلقائياً عند موافقة الإدارة، ويُعاد الرصيد تلقائياً في حال الرفض.'
                    : 'Balances are deducted upon management approval, and restored if rejected.')}
              </p>
            </div>
          </div>

          {canEditBalances ? (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                value={adminSelectedEmpId || currentEmp.id}
                onChange={(e) => setAdminSelectedEmpId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nameAr} ({emp.jobTitleAr})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => openBalanceEditModalForEmp(displayedEmp)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition active:scale-95 whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تعديل رصيد الموظف' : 'Edit Balances'}</span>
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 font-mono">
              {isArabic ? `الموظف: ${displayedEmp.nameAr}` : `Employee: ${displayedEmp.nameEn}`}
            </div>
          )}
        </div>

        {/* The 3 Balance Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between group hover:border-emerald-500/40 transition">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 block">{t('remainingAnnual')}</span>
                {!canEditBalances && <Lock className="w-3 h-3 text-slate-500" />}
              </div>
              <span className="text-2xl font-extrabold text-emerald-400 mt-0.5 block">
                {displayedEmp.annualLeaveBalance}{' '}
                <span className="text-xs text-slate-400 font-normal">/ 21 {t('days')}</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isArabic ? 'رصيد سنوي مدفوع الأجر' : 'Paid annual balance'}
              </span>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Calendar className="w-8 h-8 text-emerald-500/30" />
              {canEditBalances && (
                <button
                  type="button"
                  onClick={() => openBalanceEditModalForEmp(displayedEmp)}
                  className="opacity-80 hover:opacity-100 text-[11px] text-amber-400 flex items-center gap-1 font-semibold"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isArabic ? 'تعديل' : 'Edit'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between group hover:border-blue-500/40 transition">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 block">{t('remainingSick')}</span>
                {!canEditBalances && <Lock className="w-3 h-3 text-slate-500" />}
              </div>
              <span className="text-2xl font-extrabold text-blue-400 mt-0.5 block">
                {displayedEmp.sickLeaveBalance}{' '}
                <span className="text-xs text-slate-400 font-normal">/ 14 {t('days')}</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isArabic ? 'بتقارير طبية معتمدة' : 'With medical slip'}
              </span>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Calendar className="w-8 h-8 text-blue-500/30" />
              {canEditBalances && (
                <button
                  type="button"
                  onClick={() => openBalanceEditModalForEmp(displayedEmp)}
                  className="opacity-80 hover:opacity-100 text-[11px] text-amber-400 flex items-center gap-1 font-semibold"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isArabic ? 'تعديل' : 'Edit'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between group hover:border-purple-500/40 transition">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 block">{t('remainingPermission')}</span>
                {!canEditBalances && <Lock className="w-3 h-3 text-slate-500" />}
              </div>
              <span className="text-2xl font-extrabold text-purple-400 mt-0.5 block">
                {displayedEmp.permissionHoursBalance}{' '}
                <span className="text-xs text-slate-400 font-normal">/ 4 {t('hours')}</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isArabic ? 'رصيد مغادرات شهري' : 'Monthly exit quota'}
              </span>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Clock className="w-8 h-8 text-purple-500/30" />
              {canEditBalances && (
                <button
                  type="button"
                  onClick={() => openBalanceEditModalForEmp(displayedEmp)}
                  className="opacity-80 hover:opacity-100 text-[11px] text-amber-400 flex items-center gap-1 font-semibold"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isArabic ? 'تعديل' : 'Edit'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub tabs & Status Filter */}
      {actionAlert && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in ${
            actionAlert.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          {actionAlert.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{actionAlert.message}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'leaves'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t('tabLeaves')}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
              {leaves.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'permissions'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{t('tabPermissions')}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
              {permissions.length}
            </span>
          </button>
        </div>

        {/* Filter Status Selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-400 text-[11px] me-1">
            {isArabic ? 'الحالة:' : 'Status:'}
          </span>
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                filterStatus === st
                  ? 'bg-slate-700 text-white border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {st === 'all'
                ? isArabic ? 'الكل' : 'All'
                : st === 'pending'
                ? isArabic ? 'معلقة' : 'Pending'
                : st === 'approved'
                ? isArabic ? 'مقبولة' : 'Approved'
                : isArabic ? 'مرفوضة' : 'Rejected'}
            </button>
          ))}
        </div>
      </div>

      {/* Leaves List */}
      {activeTab === 'leaves' && (
        <div className="space-y-3">
          {leaves
            .filter((l) => filterStatus === 'all' || l.status === filterStatus)
            .map((leave) => {
            const emp = employees.find((e) => e.id === leave.employeeId);
            const rep = employees.find((e) => e.id === leave.replacementEmployeeId);
            const isMyLeave = Boolean(
              (currentEmp && leave.employeeId === currentEmp.id) ||
              (currentUser && emp?.userId === currentUser.id)
            );

            return (
              <div
                key={leave.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                      {emp?.nameAr?.charAt(0) || 'م'}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {emp ? (isArabic ? emp.nameAr : emp.nameEn) : 'Employee'}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {emp?.jobTitleAr} • {t(`leaveType${leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}` as never)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold border self-start sm:self-center ${
                      leave.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : leave.status === 'rejected'
                        ? 'bg-rose-950 text-rose-300 border-rose-600/40'
                        : 'bg-amber-950 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {t(
                      leave.status === 'approved'
                        ? 'reqApproved'
                        : leave.status === 'rejected'
                        ? 'reqRejected'
                        : 'reqPending'
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('startDate')}</span>
                    <span className="font-mono text-slate-200">{leave.startDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('endDate')}</span>
                    <span className="font-mono text-slate-200">{leave.endDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('daysCount')}</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {leave.daysCount} {t('days')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('replacementEmployee')}</span>
                    <span className="text-slate-300 truncate block">
                      {rep ? (isArabic ? rep.nameAr : rep.nameEn) : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg">
                  <span className="font-semibold text-slate-400">{t('reason')}: </span>
                  {leave.reason}
                </p>

                {/* Visible status feedback for employees */}
                {leave.status === 'approved' && (
                  <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isArabic
                        ? `تم اعتماد الإجازة والموافقة عليها ${leave.approvedByName ? `بواسطة: ${leave.approvedByName}` : 'من قبل الإدارة'}`
                        : `Leave approved ${leave.approvedByName ? `by: ${leave.approvedByName}` : 'by Management'}`}
                    </span>
                  </div>
                )}

                {leave.status === 'rejected' && (
                  <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 px-3 py-2 rounded-xl">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      {isArabic
                        ? `تم رفض طلب الإجازة ${leave.approvedByName ? `بواسطة: ${leave.approvedByName}` : 'من قبل الإدارة'}${leave.rejectionReason ? ` — سبب الرفض: ${leave.rejectionReason}` : ''}`
                        : `Leave rejected ${leave.approvedByName ? `by: ${leave.approvedByName}` : 'by Management'}${leave.rejectionReason ? ` — Reason: ${leave.rejectionReason}` : ''}`}
                    </span>
                  </div>
                )}

                {/* If it is the employee's own request: they cannot approve or reject their own leave */}
                {leave.status === 'pending' && isMyLeave && (
                  <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-500/30 px-3 py-2 rounded-xl">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isArabic
                        ? 'طلبك قيد المراجعة والدراسة من قبل الإدارة. لا يملك الموظف صلاحية قبول أو رفض إجازته بنفسه.'
                        : 'Your request is pending administrative review. Employees cannot approve or reject their own requests.'}
                    </span>
                  </div>
                )}

                {/* Actions & Print Slip Bar */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (emp) printRequestSlip(leave, emp, 'leave');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95"
                    title={isArabic ? 'طباعة قسيمة الإجازة الرسمية' : 'Print Leave Slip'}
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isArabic ? 'طباعة القسيمة' : 'Print Slip'}</span>
                  </button>

                  {/* Only authorized reviewers can approve/reject other employees' requests */}
                  {leave.status === 'pending' && !isMyLeave && canApproveRequests && (
                    <div className="flex items-center gap-2 ms-auto">
                      <button
                        onClick={() => setRejectModalTarget({ id: leave.id, type: 'leave' })}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 hover:border-rose-600/40 text-xs font-semibold transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t('reject')}</span>
                      </button>
                      <button
                        onClick={() => handleApproveLeave(leave.id)}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('approve')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permissions List */}
      {activeTab === 'permissions' && (
        <div className="space-y-3">
          {permissions
            .filter((p) => filterStatus === 'all' || p.status === filterStatus)
            .map((perm) => {
            const emp = employees.find((e) => e.id === perm.employeeId);
            const isMyPerm = Boolean(
              (currentEmp && perm.employeeId === currentEmp.id) ||
              (currentUser && emp?.userId === currentUser.id)
            );

            return (
              <div
                key={perm.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-purple-400">
                      {emp?.nameAr?.charAt(0) || 'م'}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {emp ? (isArabic ? emp.nameAr : emp.nameEn) : 'Employee'}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {emp?.jobTitleAr} •{' '}
                        {perm.reasonType === 'official'
                          ? t('permReasonOfficial')
                          : t('permReasonPersonal')}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold border self-start sm:self-center ${
                      perm.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : perm.status === 'rejected'
                        ? 'bg-rose-950 text-rose-300 border-rose-600/40'
                        : 'bg-amber-950 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {t(
                      perm.status === 'approved'
                        ? 'reqApproved'
                        : perm.status === 'rejected'
                        ? 'reqRejected'
                        : 'reqPending'
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('permDate')}</span>
                    <span className="font-mono text-slate-200">{perm.date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('permStartTime')}</span>
                    <span className="font-mono text-slate-200">{perm.startTime}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('permEndTime')}</span>
                    <span className="font-mono text-slate-200">{perm.endTime}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('permHours')}</span>
                    <span className="font-mono text-purple-400 font-bold">
                      {perm.durationHours} {t('hours')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg">
                  <span className="font-semibold text-slate-400">{t('reason')}: </span>
                  {perm.reason}
                </p>

                {/* Visible status feedback for employees */}
                {perm.status === 'approved' && (
                  <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isArabic
                        ? `تمت الموافقة على المغادرة واعتمادها ${perm.approvedByName ? `بواسطة: ${perm.approvedByName}` : 'من قبل الإدارة'}`
                        : `Permission approved ${perm.approvedByName ? `by: ${perm.approvedByName}` : 'by Management'}`}
                    </span>
                  </div>
                )}

                {perm.status === 'rejected' && (
                  <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 px-3 py-2 rounded-xl">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      {isArabic
                        ? `تم رفض طلب المغادرة ${perm.approvedByName ? `بواسطة: ${perm.approvedByName}` : 'من قبل الإدارة'}${perm.rejectionReason ? ` — سبب الرفض: ${perm.rejectionReason}` : ''}`
                        : `Permission rejected ${perm.approvedByName ? `by: ${perm.approvedByName}` : 'by Management'}${perm.rejectionReason ? ` — Reason: ${perm.rejectionReason}` : ''}`}
                    </span>
                  </div>
                )}

                {/* If it is the employee's own request: they cannot approve or reject their own permission */}
                {perm.status === 'pending' && isMyPerm && (
                  <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/30 border border-amber-500/30 px-3 py-2 rounded-xl">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isArabic
                        ? 'طلبك قيد المراجعة والدراسة من قبل الإدارة. لا يملك الموظف صلاحية قبول أو رفض مغادرته بنفسه.'
                        : 'Your request is pending administrative review. Employees cannot approve or reject their own requests.'}
                    </span>
                  </div>
                )}

                {/* Actions & Print Slip Bar */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (emp) printRequestSlip(perm, emp, 'permission');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95"
                    title={isArabic ? 'طباعة تصريح المغادرة لبوابة المحطة' : 'Print Exit Slip'}
                  >
                    <Printer className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isArabic ? 'طباعة تصريح البوابة' : 'Print Exit Slip'}</span>
                  </button>

                  {/* Only authorized reviewers can approve/reject other employees' requests */}
                  {perm.status === 'pending' && !isMyPerm && canApproveRequests && (
                    <div className="flex items-center gap-2 ms-auto">
                      <button
                        onClick={() => setRejectModalTarget({ id: perm.id, type: 'perm' })}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 hover:border-rose-600/40 text-xs font-semibold transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t('reject')}</span>
                      </button>
                      <button
                        onClick={() => handleApprovePermission(perm.id)}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('approve')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Leave Modal */}
      {showNewLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {isArabic ? 'تقديم طلب إجازة جديد' : 'Submit Leave Request'}
                </h3>
              </div>
              <button
                onClick={() => setShowNewLeaveModal(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('leaveType')} *
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="annual">{t('leaveTypeAnnual')}</option>
                  <option value="sick">{t('leaveTypeSick')}</option>
                  <option value="emergency">{t('leaveTypeEmergency')}</option>
                  <option value="unpaid">{t('leaveTypeUnpaid')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('startDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('endDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('replacementEmployee')}
                </label>
                <select
                  value={leaveReplacementId}
                  onChange={(e) => setLeaveReplacementId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {employees
                    .filter((e) => e.id !== currentEmp.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {isArabic ? emp.nameAr : emp.nameEn} ({emp.jobTitleAr})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('reason')} *
                </label>
                <textarea
                  required
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder={isArabic ? 'أدخل أسباب طلب الإجازة...' : 'Provide reason for leave...'}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewLeaveModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                >
                  {isArabic ? 'إرسال الطلب للاعتماد' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Permission Modal */}
      {showNewPermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  {isArabic ? 'تقديم إذن مغادرة ميداني' : 'Submit Exit Permission'}
                </h3>
              </div>
              <button
                onClick={() => setShowNewPermModal(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePermission} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('permDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={permDate}
                    onChange={(e) => setPermDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('permStartTime')} *
                  </label>
                  <input
                    type="time"
                    required
                    value={permStartTime}
                    onChange={(e) => setPermStartTime(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('permEndTime')} *
                  </label>
                  <input
                    type="time"
                    required
                    value={permEndTime}
                    onChange={(e) => setPermEndTime(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'نوع المغادرة' : 'Permission Nature'} *
                </label>
                <select
                  value={permReasonType}
                  onChange={(e) => setPermReasonType(e.target.value as 'personal' | 'official')}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="personal">{t('permReasonPersonal')}</option>
                  <option value="official">{t('permReasonOfficial')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('reason')} *
                </label>
                <textarea
                  required
                  rows={2}
                  value={permReason}
                  onChange={(e) => setPermReason(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'مهمة رسمية لجلب عينات الغاز من المختبر، مراجعة دائرة حكومية...'
                      : 'State official errand details or personal reason...'
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPermModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm"
                >
                  {isArabic ? 'إرسال طلب المغادرة' : 'Submit Permission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  {isArabic ? 'رفض الطلب مع ذكر الأسباب' : 'Reject Request with Reason'}
                </h3>
              </div>
              <button
                onClick={() => setRejectModalTarget(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {t('rejectionReason')} *
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder={
                  isArabic
                    ? 'مثال: وجود أعمال صيانة طارئة في نفس التوقيت تستوجب تواجد الكادر...'
                    : 'State business justification for refusal...'
                }
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setRejectModalTarget(null)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                {t('cancel')}
              </button>
              <button
                disabled={!rejectionReasonInput.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isArabic ? 'تأكيد الرفض' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Employee Balance Edit Modal */}
      {showBalanceEditModal && canEditBalances && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/30 p-5 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Sliders className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">
                  {isArabic ? 'تعديل وتحديد رصيد الإجازات والمغادرات (صلاحية أدمن)' : 'Administrative Balance Adjustment'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBalanceEditModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeBalances} className="space-y-4">
              {/* Target Employee Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'الموظف المستهدف للتعديل *' : 'Target Employee *'}
                </label>
                <select
                  value={displayedEmp.id}
                  onChange={(e) => {
                    const found = employees.find((emp) => emp.id === e.target.value);
                    if (found) {
                      setAdminSelectedEmpId(found.id);
                      setEditAnnualBalance(found.annualLeaveBalance);
                      setEditSickBalance(found.sickLeaveBalance);
                      setEditPermBalance(found.permissionHoursBalance);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nameAr} - {emp.jobTitleAr} ({emp.departmentAr})
                    </option>
                  ))}
                </select>
              </div>

              {/* Balances inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <label className="text-[11px] font-semibold text-emerald-400 block mb-1">
                    {isArabic ? 'الإجازات السنوية (أيام)' : 'Annual Leave (Days)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    required
                    value={editAnnualBalance}
                    onChange={(e) => setEditAnnualBalance(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-base font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">الافتراضي السنوي: 21</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <label className="text-[11px] font-semibold text-blue-400 block mb-1">
                    {isArabic ? 'الإجازات المرضية (أيام)' : 'Sick Leave (Days)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    required
                    value={editSickBalance}
                    onChange={(e) => setEditSickBalance(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-base font-bold text-blue-300 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">الافتراضي السنوي: 14</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <label className="text-[11px] font-semibold text-purple-400 block mb-1">
                    {isArabic ? 'ساعات المغادرات (ساعات)' : 'Exit Hours'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    required
                    value={editPermBalance}
                    onChange={(e) => setEditPermBalance(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-base font-bold text-purple-300 focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">الافتراضي الشهري: 4</span>
                </div>
              </div>

              {/* Justification note */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'مبرر التعديل الإداري (اختياري)' : 'Adjustment Justification (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={editBalanceReason}
                  onChange={(e) => setEditBalanceReason(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'مثال: تسوية رصيد مرحل من عام 2025، أو مكافأة دوام إضافي، أو تعديل بعد التثبيت...'
                      : 'E.g. Carried-over balance or official administrative compensation...'
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {isArabic
                    ? 'سيتم اعتماد هذا الرصيد كمرجع رسمي للموظف، وسيتمكن الموظف من رؤية رصيده فوراً بشكل (Read-Only) مع خصم أي إجازة يتم اعتمادها لاحقاً تلقائياً.'
                    : 'This balance will be immediately applied as official record and shown read-only to the employee.'}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBalanceEditModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingBalances}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingBalances ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ وتثبيت الأرصدة' : 'Save Balances')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
