import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  DollarSign,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  Wrench,
  CheckCircle2,
  Loader2,
  Save,
} from 'lucide-react';
import { PettyCashRequest, Equipment } from '../../types';
import { procurementService } from '../../services/procurementService';
import { db } from '../../services/db';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { DuplicateWarningModal } from './DuplicateWarningModal';

interface PettyCashFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingRequest?: PettyCashRequest | null;
}

export const PettyCashFormModal: React.FC<PettyCashFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingRequest,
}) => {
  const { isArabic } = useLanguage();
  const { currentUser } = useAuth();

  const [equipments, setEquipments] = useState<Equipment[]>([]);

  // Form State
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState<number>(20);
  const [currency, setCurrency] = useState('JOD');
  const [expenseCategory, setExpenseCategory] = useState('صيانة طارئة ومستعجلة');
  const [relatedEquipmentId, setRelatedEquipmentId] = useState('');
  const [notes, setNotes] = useState('');

  // Duplicate Check
  const [similarItems, setSimilarItems] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const expenseCategories = [
    'صيانة طارئة ومستعجلة',
    'مستهلكات وعدد صغيرة',
    'ضيافة ومستلزمات مكتبية',
    'وقود وطوارئ نقل',
    'مواد نظافة وصحة مهنية',
    'رسوم وتراخيص رسمية',
    'مصاريف موقع وتشغيل أخرى',
  ];

  useEffect(() => {
    if (isOpen) {
      try {
        const allEq = db.getEquipment();
        setEquipments(allEq || []);
      } catch (e) {
        console.error('Error fetching equipment', e);
      }

      if (existingRequest) {
        setPurpose(existingRequest.purpose);
        setAmount(existingRequest.amount);
        setCurrency(existingRequest.currency || 'JOD');
        setExpenseCategory(existingRequest.expenseCategory);
        setRelatedEquipmentId(existingRequest.relatedEquipmentId || '');
        setNotes(existingRequest.notes || '');
      } else {
        setPurpose('');
        setAmount(20);
        setCurrency('JOD');
        setExpenseCategory('صيانة طارئة ومستعجلة');
        setRelatedEquipmentId('');
        setNotes('');
      }
      setErrorMsg('');
      setSimilarItems([]);
      setShowDuplicateModal(false);
    }
  }, [isOpen, existingRequest]);

  // Live duplicate checking
  useEffect(() => {
    let active = true;
    if (purpose.trim().length >= 3 && !existingRequest) {
      procurementService
        .checkSimilarRequests({
          itemDescription: purpose,
          equipmentId: relatedEquipmentId,
          excludeId: existingRequest?.id,
        })
        .then((check) => {
          if (active) {
            setSimilarItems(check.matches.map((m) => m.request));
          }
        })
        .catch(() => {
          if (active) setSimilarItems([]);
        });
    } else {
      setSimilarItems([]);
    }
    return () => {
      active = false;
    };
  }, [purpose, relatedEquipmentId, existingRequest]);

  if (!isOpen) return null;

  const handleSubmitAttempt = async (e?: React.FormEvent, asDraft = false) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!purpose.trim()) {
      setErrorMsg(isArabic ? 'يرجى كتابة الغاية من صرف النثريات' : 'Please specify expense purpose');
      return;
    }
    if (amount <= 0) {
      setErrorMsg(isArabic ? 'المبلغ يجب أن تكون أكبر من صفر' : 'Amount must be greater than 0');
      return;
    }

    if (!existingRequest && !asDraft) {
      try {
        setIsSubmitting(true);
        const check = await procurementService.checkSimilarRequests({
          itemDescription: purpose,
          equipmentId: relatedEquipmentId,
        });
        if (check.hasSimilar) {
          setSimilarItems(check.matches.map((m) => m.request));
          setShowDuplicateModal(true);
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.warn('Duplicate check skipped:', err);
      } finally {
        setIsSubmitting(false);
      }
    }

    executeSave(asDraft);
  };

  const executeSave = async (asDraft = false) => {
    try {
      setIsSubmitting(true);
      setShowDuplicateModal(false);

      const selectedEquipment = equipments.find((eq) => eq.id === relatedEquipmentId);
      const actor = currentUser || {
        id: 'emp-user',
        username: 'user',
        nameAr: 'موظف المحطة',
        nameEn: 'Plant Employee',
        email: 'employee@jordanbiogas.com',
        role: 'employee' as const,
        department: 'العمليات والصيانة',
        jobTitleAr: 'فني تشغيل وصيانة',
        jobTitleEn: 'O&M Technician',
      };

      if (existingRequest) {
        await procurementService.updatePettyCashRequest(
          existingRequest.id,
          {
            purpose: purpose.trim(),
            amount: Number(amount),
            currency,
            expenseCategory,
            relatedEquipmentId: relatedEquipmentId || undefined,
            relatedEquipmentName: selectedEquipment ? selectedEquipment.nameAr || selectedEquipment.name : undefined,
            notes: notes.trim() || undefined,
          },
          actor
        );
      } else {
        await procurementService.createPettyCashRequest(
          {
            department: actor.department || 'العمليات والصيانة',
            purpose: purpose.trim(),
            amount: Number(amount),
            currency,
            expenseCategory,
            relatedEquipmentId: relatedEquipmentId || undefined,
            relatedEquipmentName: selectedEquipment ? selectedEquipment.nameAr || selectedEquipment.name : undefined,
            notes: notes.trim() || undefined,
            duplicateWarningAcknowledged: similarItems.length > 0,
            duplicateWarningDetails: similarItems.length > 0 ? `Acknowledged ${similarItems.length} similar voucher(s)` : undefined,
          },
          actor,
          asDraft
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error saving petty cash request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/30">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {existingRequest
                    ? isArabic ? `تعديل سند النثريات (${existingRequest.requestNumber})` : `Edit Petty Cash (${existingRequest.requestNumber})`
                    : isArabic ? 'طلب صرف نثريات جديد' : 'New Petty Cash Voucher'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isArabic
                    ? 'صرف نقدي فوري بموجب فواتير - صندوق نثريات المحطة'
                    : 'Direct cash disbursement against receipts - Plant Petty Cash Fund'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmitAttempt} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {errorMsg && (
              <div className="p-3 bg-rose-950/70 border border-rose-600/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Duplicate Notice */}
            {similarItems.length > 0 && !existingRequest && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">
                    {isArabic ? 'تنبيه تشابه: ' : 'Similarity Alert: '}
                  </span>
                  {isArabic
                    ? `توجد ${similarItems.length} طلبات سابقة قد تكون لنفس الغاية.`
                    : `Found ${similarItems.length} previous requests with similar purpose.`}
                </div>
              </div>
            )}

            {/* Amount and Currency */}
            <div className="p-4 bg-sky-950/30 border border-sky-800/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-bold text-sky-300 mb-1">
                  {isArabic ? 'المبلغ المطلوب صرفه نقداً *' : 'Amount Required *'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-36 bg-slate-900 border border-sky-700/60 rounded-xl px-3 py-2 text-xl font-black text-sky-400 focus:outline-none focus:border-sky-400"
                  />
                  <span className="text-sm font-bold text-slate-300">
                    {currency} ({isArabic ? 'دينار أردني' : 'JOD'})
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 w-full sm:w-auto">
                {isArabic
                  ? 'يتم تقديم الفاتورة الضريبية لأمين الصندوق فور إتمام الشراء للتسوية.'
                  : 'Submit invoices upon purchase for fund reconciliation.'}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isArabic ? 'الغاية من الصرف والتفاصيل *' : 'Expense Purpose & Details *'}
              </label>
              <textarea
                required
                rows={2}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={
                  isArabic
                    ? 'مثال: شراء مفتاح براغي 17 ملم مستعجل لإصلاح مضخة الغاز، شراء عبوة مانع تسريب، شحن رصيد طارئ...'
                    : 'e.g., Purchase emergency pipe sealant, quick wrench replacement...'
                }
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isArabic ? 'تصنيف المصروف' : 'Expense Category'}
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Related Equipment (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <span>{isArabic ? 'المعدة أو الأصل المرتبط (اختياري)' : 'Related Equipment (Optional)'}</span>
              </label>
              <select
                value={relatedEquipmentId}
                onChange={(e) => setRelatedEquipmentId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">{isArabic ? '-- بدون ربط بمعدة (عام أو مكتبي) --' : '-- General Plant Expense --'}</option>
                {equipments.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.tagNumber ? `[${eq.tagNumber}] ` : ''}
                    {eq.nameAr || eq.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isArabic ? 'ملاحظات إضافية' : 'Additional Notes'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isArabic ? 'ملاحظات المحل، رقم السند السابق...' : 'Optional notes...'}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>

              {!existingRequest && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSubmitAttempt(e, true)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/60 rounded-xl transition border border-amber-500/40 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isArabic ? 'حفظ كمسودة' : 'Save as Draft'}</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-lg shadow-sky-900/40 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting
                    ? isArabic ? 'جاري المعالجة...' : 'Processing...'
                    : existingRequest
                    ? isArabic ? 'حفظ التعديلات' : 'Save Changes'
                    : isArabic ? 'تقديم للاعتماد' : 'Submit Petty Cash'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onConfirm={() => executeSave(false)}
        similarRequests={similarItems}
        itemTitle={purpose}
      />
    </>
  );
};
