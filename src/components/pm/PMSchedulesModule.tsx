import React, { useState } from 'react';
import {
  CalendarClock,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Edit3,
  Trash2,
  X,
  FileText,
  Lock,
  ListPlus,
  Save,
  Check,
} from 'lucide-react';
import { db } from '../../services/db';
import { PMSchedule } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';

interface PMSchedulesModuleProps {
  onGenerateWorkOrder?: (equipmentId: string) => void;
  onNavigateToWorkOrder?: (woId: string) => void;
}

export const PMSchedulesModule: React.FC<PMSchedulesModuleProps> = ({
  onGenerateWorkOrder,
  onNavigateToWorkOrder,
}) => {
  const { isArabic, t } = useLanguage();
  const { currentUser, canManageWorkOrders, isAdmin, isMaintenanceManager } = useAuth();
  const canEditPM = Boolean(isAdmin || isMaintenanceManager);

  const [schedules, setSchedules] = useState<PMSchedule[]>(() => db.getPMSchedules());
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Edit PM State
  const [editingPM, setEditingPM] = useState<PMSchedule | null>(null);
  const [editTitleAr, setEditTitleAr] = useState('');
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editEquipmentId, setEditEquipmentId] = useState('');
  const [editFrequency, setEditFrequency] = useState<PMSchedule['frequency']>('operating_hours');
  const [editHoursInterval, setEditHoursInterval] = useState<number>(1000);
  const [editNextDueDate, setEditNextDueDate] = useState('');
  const [editSteps, setEditSteps] = useState<string[]>([]);
  const [newStepText, setNewStepText] = useState('');

  // Create PM State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitleAr, setCreateTitleAr] = useState('');
  const [createTitleEn, setCreateTitleEn] = useState('');
  const [createEquipmentId, setCreateEquipmentId] = useState('eq-1');
  const [createFrequency, setCreateFrequency] = useState<PMSchedule['frequency']>('operating_hours');
  const [createHoursInterval, setCreateHoursInterval] = useState<number>(1000);
  const [createNextDueDate, setCreateNextDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [createSteps, setCreateSteps] = useState<string[]>([
    'فحص التوصيلات والمحابس وعزل مصادر الطاقة',
    'استبدال الفلاتر وفحص مستويات الزيت وسوائل التبريد',
  ]);
  const [createStepInput, setCreateStepInput] = useState('');

  // Delete confirmation
  const [deleteTargetPM, setDeleteTargetPM] = useState<PMSchedule | null>(null);

  const allEquipment = db.getEquipment();

  const refreshSchedules = () => {
    setSchedules(db.getPMSchedules());
  };

  const handleGenerate = (pmId: string, equipmentId: string) => {
    const createdWO = db.generateWorkOrderFromPM(
      pmId,
      currentUser?.id || 'usr-1',
      currentUser?.nameAr || 'Manager'
    );

    if (createdWO) {
      setSuccessNotice(
        isArabic
          ? `تم بنجاح توليد أمر الصيانة الوقائية ${createdWO.workOrderNumber}`
          : `Work order ${createdWO.workOrderNumber} generated successfully!`
      );
      refreshSchedules();

      setTimeout(() => {
        setSuccessNotice(null);
        if (onNavigateToWorkOrder) {
          onNavigateToWorkOrder(createdWO.id);
        } else if (onGenerateWorkOrder) {
          onGenerateWorkOrder(equipmentId);
        }
      }, 1500);
    }
  };

  const openEditModal = (pm: PMSchedule) => {
    setEditingPM(pm);
    setEditTitleAr(pm.titleAr);
    setEditTitleEn(pm.titleEn);
    setEditEquipmentId(pm.equipmentId);
    setEditFrequency(pm.frequency);
    setEditHoursInterval(pm.operatingHoursInterval || 1000);
    setEditNextDueDate(pm.nextDueDate);
    setEditSteps([...pm.steps]);
    setNewStepText('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPM || !editTitleAr.trim()) return;

    const filteredSteps = editSteps.filter((s) => s.trim().length > 0);
    if (newStepText.trim()) {
      filteredSteps.push(newStepText.trim());
    }

    db.updatePMSchedule(
      editingPM.id,
      {
        titleAr: editTitleAr.trim(),
        titleEn: editTitleEn.trim() || editTitleAr.trim(),
        equipmentId: editEquipmentId,
        frequency: editFrequency,
        operatingHoursInterval: editFrequency === 'operating_hours' ? Number(editHoursInterval) : undefined,
        nextDueDate: editNextDueDate,
        steps: filteredSteps,
      },
      currentUser?.id || 'usr-1',
      currentUser?.nameAr || 'Admin'
    );

    refreshSchedules();
    setEditingPM(null);
    setSuccessNotice(
      isArabic
        ? `تم تحديث خطة وتعليمات الصيانة الوقائية بنجاح (${editTitleAr})`
        : `PM schedule and service instructions updated successfully`
    );
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleCreatePM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitleAr.trim()) return;

    const filteredSteps = createSteps.filter((s) => s.trim().length > 0);
    if (createStepInput.trim()) {
      filteredSteps.push(createStepInput.trim());
    }

    db.createPMSchedule(
      {
        titleAr: createTitleAr.trim(),
        titleEn: createTitleEn.trim() || createTitleAr.trim(),
        equipmentId: createEquipmentId,
        frequency: createFrequency,
        operatingHoursInterval: createFrequency === 'operating_hours' ? Number(createHoursInterval) : undefined,
        nextDueDate: createNextDueDate,
        steps: filteredSteps.length > 0 ? filteredSteps : ['الفحص الميداني والمعايرة الفنية الشاملة'],
        autoGenerateWorkOrder: true,
      },
      currentUser?.id || 'usr-1',
      currentUser?.nameAr || 'Admin'
    );

    refreshSchedules();
    setShowCreateModal(false);
    setCreateTitleAr('');
    setCreateTitleEn('');
    setCreateStepInput('');
    setSuccessNotice(
      isArabic
        ? 'تمت إضافة خطة الصيانة الوقائية الجديدة وتوثيق تعليماتها بنجاح'
        : 'New PM schedule and instructions created successfully'
    );
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetPM) return;
    db.deletePMSchedule(
      deleteTargetPM.id,
      currentUser?.id || 'usr-1',
      currentUser?.nameAr || 'Admin'
    );
    refreshSchedules();
    setSuccessNotice(
      isArabic
        ? `تم حذف خطة الصيانة الوقائية (${deleteTargetPM.titleAr}) بنجاح`
        : `PM schedule deleted successfully`
    );
    setDeleteTargetPM(null);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const getFrequencyLabel = (freq: PMSchedule['frequency']) => {
    switch (freq) {
      case 'daily':
        return t('pmFreqDaily');
      case 'weekly':
        return t('pmFreqWeekly');
      case 'monthly':
        return t('pmFreqMonthly');
      case 'operating_hours':
        return t('pmFreqHours');
      default:
        return freq;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-950 text-teal-400 border border-teal-500/30">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">{t('navPM')}</h2>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'جداول وتعليمات الصيانة الوقائية الدورية لمولدات MWM ومحطة الغاز الحيوي'
                : 'Automated recurring preventive maintenance routines & MWM service standards'}
            </p>
          </div>
        </div>

        {canEditPM && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? 'إضافة خطة صيانة وقائية' : 'New PM Routine'}</span>
          </button>
        )}
      </div>

      {/* Security notice for technicians */}
      {!canEditPM && (
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            {isArabic
              ? 'تعليمات وخطوات الصيانة الوقائية معتمدة ومحررة مركزياً من قبل إدارة المحطة لضمان الجودة التشغيلية والسلامة.'
              : 'PM instructions and service standards are centrally defined and approved by plant management.'}
          </span>
        </div>
      )}

      {/* Success Notification Alert */}
      {successNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Schedules List */}
      <div className="space-y-4">
        {schedules.map((pm) => {
          const equip = allEquipment.find((e) => e.id === pm.equipmentId);

          return (
            <div
              key={pm.id}
              className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 transition space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-teal-400 bg-teal-950 px-2.5 py-0.5 rounded-lg border border-teal-500/30">
                      {equip?.code || 'ASSET'}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                      {getFrequencyLabel(pm.frequency)}
                    </span>
                    {pm.operatingHoursInterval && (
                      <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-600/40">
                        كل {pm.operatingHoursInterval} ساعة تشغيل
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {isArabic ? pm.titleAr : pm.titleEn}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isArabic ? equip?.nameAr : equip?.nameEn} • {equip?.location}
                  </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Admin Edit Instructions Button */}
                  {canEditPM && (
                    <button
                      onClick={() => openEditModal(pm)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-teal-500/40 text-xs font-bold transition flex items-center gap-1.5"
                      title={isArabic ? 'تعديل الخطة والتعليمات' : 'Edit Plan & Instructions'}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                      <span>{isArabic ? 'تعديل التعليمات' : 'Edit Instructions'}</span>
                    </button>
                  )}

                  {/* Admin Delete Schedule Button */}
                  {canEditPM && (
                    <button
                      onClick={() => setDeleteTargetPM(pm)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-600/40 transition"
                      title={isArabic ? 'حذف الخطة' : 'Delete Routine'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Generate Work Order Action */}
                  {canManageWorkOrders && (
                    <button
                      onClick={() => handleGenerate(pm.id, pm.equipmentId)}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{t('generateWorkOrder')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Maintenance Instructions & Steps */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'تعليمات وإجراءات الفحص المعتمدة:' : 'Approved Standard Service Steps:'}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {pm.steps.length} {isArabic ? 'خطوات' : 'steps'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pm.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-teal-950 text-teal-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-teal-500/30 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isArabic ? 'آخر تنفيذ:' : 'Last Triggered:'}</span>
                  <span className="font-mono text-slate-300">
                    {pm.lastTriggeredDate || '—'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isArabic ? 'الموعد القادم:' : 'Next Due Date:'}</span>
                  <span className="font-mono font-bold text-teal-400">
                    {pm.nextDueDate}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit PM Instructions & Schedule Modal */}
      {editingPM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-black text-white">
                  {isArabic ? 'تحرير خطة وتعليمات الصيانة الوقائية' : 'Edit PM Schedule & Instructions'}
                </h3>
              </div>
              <button
                onClick={() => setEditingPM(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'عنوان خطة الصيانة الوقائية (بالعربية) *' : 'PM Schedule Title (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitleAr}
                    onChange={(e) => setEditTitleAr(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'المعدة المستهدفة *' : 'Target Asset *'}
                  </label>
                  <select
                    value={editEquipmentId}
                    onChange={(e) => setEditEquipmentId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    {allEquipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.code} - {isArabic ? eq.nameAr : eq.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'دورية التكرار *' : 'Frequency *'}
                  </label>
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value as PMSchedule['frequency'])}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="operating_hours">{t('pmFreqHours')}</option>
                    <option value="daily">{t('pmFreqDaily')}</option>
                    <option value="weekly">{t('pmFreqWeekly')}</option>
                    <option value="monthly">{t('pmFreqMonthly')}</option>
                  </select>
                </div>

                {editFrequency === 'operating_hours' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      {isArabic ? 'ساعات التشغيل الفاصلة *' : 'Operating Hours Interval *'}
                    </label>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      value={editHoursInterval}
                      onChange={(e) => setEditHoursInterval(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'تاريخ الاستحقاق القادم *' : 'Next Due Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={editNextDueDate}
                    onChange={(e) => setEditNextDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Editable Instructions / Steps */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-teal-400 block">
                    {isArabic ? 'تعليمات وخطوات الفحص المعتمدة (قابلة للتعديل والمسح):' : 'Inspection Steps & Instructions (Editable):'}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {editSteps.length} {isArabic ? 'خطوة' : 'steps'}
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {editSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-teal-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-slate-700">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const updated = [...editSteps];
                          updated[idx] = e.target.value;
                          setEditSteps(updated);
                        }}
                        className="flex-1 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editSteps.filter((_, i) => i !== idx);
                          setEditSteps(updated);
                        }}
                        className="p-2 rounded-xl bg-slate-800/80 text-rose-400 hover:bg-rose-950 hover:text-rose-300 border border-slate-700 transition"
                        title={isArabic ? 'مسح هذه الخطوة' : 'Delete step'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new instruction input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    placeholder={isArabic ? 'إضافة خطوة أو تعليمة صيانة جديدة...' : 'Add new step or instruction...'}
                    className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newStepText.trim()) {
                        setEditSteps([...editSteps, newStepText.trim()]);
                        setNewStepText('');
                      }
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-teal-950 text-teal-300 border border-slate-700 hover:border-teal-500/40 text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isArabic ? 'إضافة خطوة' : 'Add'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPM(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isArabic ? 'حفظ التعديلات والتعليمات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create PM Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-black text-white">
                  {isArabic ? 'إنشاء خطة صيانة وقائية جديدة' : 'Create New PM Routine'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePM} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'عنوان خطة الصيانة الوقائية (بالعربية) *' : 'Title (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isArabic ? 'مثال: صيانة دورية كل 500 ساعة - استبدال فلاتر الزيت' : 'e.g. 500h Engine Service'}
                    value={createTitleAr}
                    onChange={(e) => setCreateTitleAr(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'المعدة المستهدفة *' : 'Target Asset *'}
                  </label>
                  <select
                    value={createEquipmentId}
                    onChange={(e) => setCreateEquipmentId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    {allEquipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.code} - {isArabic ? eq.nameAr : eq.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'دورية التكرار *' : 'Frequency *'}
                  </label>
                  <select
                    value={createFrequency}
                    onChange={(e) => setCreateFrequency(e.target.value as PMSchedule['frequency'])}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="operating_hours">{t('pmFreqHours')}</option>
                    <option value="daily">{t('pmFreqDaily')}</option>
                    <option value="weekly">{t('pmFreqWeekly')}</option>
                    <option value="monthly">{t('pmFreqMonthly')}</option>
                  </select>
                </div>

                {createFrequency === 'operating_hours' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      {isArabic ? 'ساعات التشغيل الفاصلة *' : 'Operating Hours Interval *'}
                    </label>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      value={createHoursInterval}
                      onChange={(e) => setCreateHoursInterval(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'تاريخ أول استحقاق *' : 'First Due Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={createNextDueDate}
                    onChange={(e) => setCreateNextDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Instructions / Steps */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-teal-400 block">
                  {isArabic ? 'تعليمات وإجراءات الفحص المعتمدة:' : 'Approved Standard Inspection Steps:'}
                </label>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {createSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-teal-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-slate-700">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const updated = [...createSteps];
                          updated[idx] = e.target.value;
                          setCreateSteps(updated);
                        }}
                        className="flex-1 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = createSteps.filter((_, i) => i !== idx);
                          setCreateSteps(updated);
                        }}
                        className="p-2 rounded-xl bg-slate-800/80 text-rose-400 hover:bg-rose-950 hover:text-rose-300 border border-slate-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={createStepInput}
                    onChange={(e) => setCreateStepInput(e.target.value)}
                    placeholder={isArabic ? 'إضافة خطوة أو تعليمة جديدة...' : 'Add step...'}
                    className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (createStepInput.trim()) {
                        setCreateSteps([...createSteps, createStepInput.trim()]);
                        setCreateStepInput('');
                      }
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-teal-950 text-teal-300 border border-slate-700 hover:border-teal-500/40 text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isArabic ? 'إضافة خطوة' : 'Add'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isArabic ? 'إنشاء الخطة والتعليمات' : 'Create Routine'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetPM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-black text-white">
                {isArabic ? 'تأكيد مسح خطة الصيانة الوقائية' : 'Confirm PM Schedule Deletion'}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isArabic
                ? `هل أنت متأكد من رغبتك في حذف خطة الصيانة الوقائية (${deleteTargetPM.titleAr})؟ سيتم حذف جميع تعليماتها المعتمدة من السجلات بشكل دائم.`
                : `Are you sure you want to permanently delete the PM routine (${deleteTargetPM.titleEn || deleteTargetPM.titleAr}) and all its associated service instructions?`}
            </p>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTargetPM(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تأكيد الحذف نهائياً' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
