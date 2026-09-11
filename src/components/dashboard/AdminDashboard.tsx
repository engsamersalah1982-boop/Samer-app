import React, { useState } from 'react';
import {
  Flame,
  CheckSquare,
  Wrench,
  Cpu,
  FileClock,
  AlertTriangle,
  TrendingUp,
  Activity,
  Zap,
  Gauge,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Building,
  MapPin,
  Leaf,
} from 'lucide-react';
import { db } from '../../services/db';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { PlantProfile } from '../../types';
import { PlantProfileModal } from '../common/PlantProfileModal';

interface AdminDashboardProps {
  onNavigateToTasks: () => void;
  onNavigateToMaintenance: () => void;
  onNavigateToRequests: () => void;
  onNavigateToEquipment: () => void;
  onNavigateToReports: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToTasks,
  onNavigateToMaintenance,
  onNavigateToRequests,
  onNavigateToEquipment,
  onNavigateToReports,
}) => {
  const { isArabic, t } = useLanguage();
  const { isAdmin, isSuperAdmin, currentUser } = useAuth();
  const canEditTexts = isAdmin || isSuperAdmin || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const [plantProfile, setPlantProfile] = useState<PlantProfile>(() => db.getPlantProfile());
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const tasks = db.getTasks();
  const workOrders = db.getWorkOrders();
  const equipment = db.getEquipment();
  const leaves = db.getLeaveRequests();
  const permissions = db.getPermissionRequests();

  const openWorkOrders = workOrders.filter((w) => w.status !== 'closed');
  const criticalWorkOrders = workOrders.filter(
    (w) => w.status !== 'closed' && (w.priority === 'urgent' || w.priority === 'high')
  );
  const pendingLeaves = leaves.filter((l) => l.status === 'pending');
  const pendingPermissions = permissions.filter((p) => p.status === 'pending');
  const totalPendingApprovals = pendingLeaves.length + pendingPermissions.length;
  const runningEquipment = equipment.filter((e) => e.status === 'running');

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Real-time SCADA / Biogas Telemetry Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                  {isArabic ? 'بث قياسات المحطة المباشر (SCADA Telemetry)' : 'LIVE BIOGAS SCADA TELEMETRY'}
                </span>
              </div>

              {canEditTexts && (
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(true)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-600/70 hover:bg-emerald-500 text-white text-[11px] font-bold border border-emerald-400/40 flex items-center gap-1.5 transition shadow-sm active:scale-95"
                  title={isArabic ? 'تحرير النصوص والبيانات التعريفية للمحطة' : 'Edit Plant Descriptive Texts'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'تحرير النصوص التعريفية' : 'Edit Plant Texts'}</span>
                </button>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white">
              {isArabic ? plantProfile.facilityNameAr : plantProfile.facilityNameEn}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {isArabic ? plantProfile.subTitleAr : plantProfile.subTitleEn}
            </p>
          </div>

          {/* Quick telemetry pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 block font-medium">
                {isArabic ? 'تركيز الميثان CH4' : 'Methane CH4'}
              </span>
              <span className="text-base font-extrabold text-emerald-400 font-mono">
                52.4 %
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 block font-medium">
                {isArabic ? 'كبريتيد الهيدروجين H2S' : 'Scrubber H2S'}
              </span>
              <span className="text-base font-extrabold text-amber-300 font-mono">
                145 ppm
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 block font-medium">
                {isArabic ? 'تدفق الغاز الحيوي' : 'Biogas Flow'}
              </span>
              <span className="text-base font-extrabold text-teal-300 font-mono">
                1,840 m³/h
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 block font-medium">
                {isArabic ? 'القدرة الكهربائية' : 'Power Output'}
              </span>
              <span className="text-base font-extrabold text-yellow-300 font-mono">
                4.68 MWe
              </span>
            </div>
          </div>
        </div>

        {/* Background glow */}
        <div className="absolute top-0 end-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Open Work Orders */}
        <div
          onClick={onNavigateToMaintenance}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-amber-300 transition">
              {t('kpiOpenWorkOrders')}
            </span>
            <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-500/30">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {openWorkOrders.length}
              </span>
              {criticalWorkOrders.length > 0 && (
                <span className="text-[11px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-600/40">
                  {criticalWorkOrders.length} {isArabic ? 'طارئ' : 'urgent'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isArabic ? 'انقر لعرض ومتابعة سير الصيانة' : 'Tap to manage work orders'}
            </p>
          </div>
        </div>

        {/* Tasks in progress */}
        <div
          onClick={onNavigateToTasks}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-300 transition">
              {t('kpiTotalTasks')}
            </span>
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {tasks.length}
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">
                {tasks.filter((t) => t.status === 'in_progress').length} {isArabic ? 'جارية' : 'active'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {tasks.filter((t) => t.status === 'completed').length} {isArabic ? 'مكتملة بنجاح' : 'completed'}
            </p>
          </div>
        </div>

        {/* Plant Equipment */}
        <div
          onClick={onNavigateToEquipment}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/50 transition cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-teal-300 transition">
              {t('kpiEquipmentRunning')}
            </span>
            <div className="p-2 rounded-xl bg-teal-950/80 text-teal-400 border border-teal-500/30">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {runningEquipment.length}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                / {equipment.length} {isArabic ? 'أصول' : 'assets'}
              </span>
            </div>
            <p className="text-[11px] text-teal-400/90 mt-1 font-semibold">
              {Math.round((runningEquipment.length / equipment.length) * 100)}% {t('plantReadiness')}
            </p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={onNavigateToRequests}
          className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-purple-300 transition">
              {t('kpiPendingApprovals')}
            </span>
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-500/30">
              <FileClock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {totalPendingApprovals}
              </span>
              <span className="text-[11px] text-purple-300 font-semibold">
                {pendingLeaves.length} {isArabic ? 'إجازة' : 'leaves'} + {pendingPermissions.length} {isArabic ? 'إذن' : 'permits'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isArabic ? 'موافقة واعتماد الإدارة' : 'Manager sign-off required'}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column operational section: Active Maintenance & Urgent Daily Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Work Orders Snapshot */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">{t('navMaintenance')}</h3>
            </div>
            <button
              onClick={onNavigateToMaintenance}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              <span>{isArabic ? 'عرض الأوامر' : 'View all'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isArabic ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="space-y-2.5">
            {openWorkOrders.slice(0, 3).map((wo) => (
              <div
                key={wo.id}
                onClick={onNavigateToMaintenance}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {wo.workOrderNumber}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {wo.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium truncate mt-1">
                    {wo.problemDescription}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                    wo.priority === 'urgent'
                      ? 'bg-rose-950 text-rose-300 border border-rose-600/40'
                      : 'bg-amber-950 text-amber-300 border border-amber-600/40'
                  }`}
                >
                  {wo.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Field Tasks Snapshot */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">{t('navTasks')}</h3>
            </div>
            <button
              onClick={onNavigateToTasks}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
            >
              <span>{isArabic ? 'عرض كافة المهام' : 'View all'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isArabic ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="space-y-2.5">
            {tasks.slice(0, 3).map((tsk) => (
              <div
                key={tsk.id}
                onClick={onNavigateToTasks}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {tsk.taskCode}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isArabic ? tsk.assignedToName : tsk.assignedToName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium truncate mt-1">
                    {isArabic ? tsk.titleAr : tsk.titleEn}
                  </p>
                </div>

                <div className="text-end shrink-0">
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {tsk.dueDate}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {tsk.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plant Descriptive & Technical Overview Section */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {isArabic ? 'التعريف بمنظومة المحطة ومهمتها البيئية' : 'Plant System Overview & Environmental Mission'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isArabic
                  ? 'ملخص تشغيل خلايا مكب الغباوي ومولدات MWM لإنتاج الطاقة النظيفة'
                  : 'Al-Ghabawi landfill cells & MWM power generation summary'}
              </p>
            </div>
          </div>

          {canEditTexts && (
            <button
              type="button"
              onClick={() => setShowEditProfileModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تعديل نصوص التعريف' : 'Edit Description'}</span>
            </button>
          )}
        </div>

        {/* Description Body */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          {isArabic ? plantProfile.plantDescriptionAr : plantProfile.plantDescriptionEn}
        </p>

        {/* Environmental Impact Note */}
        {(plantProfile.environmentalImpactAr || plantProfile.environmentalImpactEn) && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
            <Leaf className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-300 block">
                {isArabic ? 'الأثر البيئي وخفض انبعاثات الكربون:' : 'Environmental & Carbon Reduction Impact:'}
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {isArabic ? plantProfile.environmentalImpactAr : plantProfile.environmentalImpactEn}
              </p>
            </div>
          </div>
        )}

        {/* Specs Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>{isArabic ? 'الشركة المشغلة' : 'Operating Co.'}</span>
            </div>
            <span className="font-bold text-white text-xs block truncate">
              {isArabic ? plantProfile.companyNameAr : plantProfile.companyNameEn}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isArabic ? 'الموقع' : 'Location'}</span>
            </div>
            <span className="font-bold text-emerald-400 text-xs block truncate">
              {isArabic ? plantProfile.locationAr : plantProfile.locationEn}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isArabic ? 'القدرة التوليدية' : 'Installed Capacity'}</span>
            </div>
            <span className="font-mono font-bold text-amber-300 text-xs block truncate">
              {isArabic ? plantProfile.installedCapacityAr : plantProfile.installedCapacityEn}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>{isArabic ? 'شبكة الربط' : 'Grid Interconnection'}</span>
            </div>
            <span className="font-bold text-slate-200 text-xs block truncate">
              {isArabic ? plantProfile.gridConnectionAr : plantProfile.gridConnectionEn}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Plant Profile Modal */}
      {showEditProfileModal && (
        <PlantProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onSaved={(updated) => setPlantProfile(updated)}
        />
      )}
    </div>
  );
};
