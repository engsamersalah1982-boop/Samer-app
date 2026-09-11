import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  Wrench,
  DollarSign,
  Info,
  CheckCircle2,
  Loader2,
  Save,
} from 'lucide-react';
import { PurchaseRequest, Equipment, PurchasePriority } from '../../types';
import { procurementService } from '../../services/procurementService';
import { db } from '../../services/db';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { DuplicateWarningModal } from './DuplicateWarningModal';

const FALLBACK_CATEGORIES = [
  'قطع غيار ميكانيكية',
  'قطع غيار كهربائية',
  'زيوت وفلاتر ومستهلكات تشغيل',
  'أجهزة دقيقة ومستشعرات وتغذية',
  'عدد وأدوات ورشة',
  'معدات سلامة وصحة مهنية (PPE)',
  'مواد فنية ومستهلكات عامة',
];

interface PurchaseRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingRequest?: PurchaseRequest | null;
}

export const PurchaseRequestFormModal: React.FC<PurchaseRequestFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingRequest,
}) => {
  const { isArabic } = useLanguage();
  const { currentUser, isTechnicianOrEmployee } = useAuth();

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);

  // Form State
  const [itemDescription, setItemDescription] = useState('');
  const [category, setCategory] = useState<string>(FALLBACK_CATEGORIES[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('عدد');
  const [estimatedUnitPrice, setEstimatedUnitPrice] = useState<number>(0);
  const [currency, setCurrency] = useState('JOD');
  const [priority, setPriority] = useState<PurchasePriority>('medium');
  const [requiredDate, setRequiredDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [justification, setJustification] = useState('');
  const [suggestedSupplier, setSuggestedSupplier] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [relatedEquipmentId, setRelatedEquipmentId] = useState('');
  const [relatedTaskId, setRelatedTaskId] = useState('');
  const [notes, setNotes] = useState('');

  // Duplicate Warning State
  const [similarItems, setSimilarItems] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto calculate total
  const estimatedTotal = (Number(quantity) || 0) * (Number(estimatedUnitPrice) || 0);

  useEffect(() => {
    if (isOpen) {
      // Load equipments
      try {
        const allEq = db.getEquipment();
        setEquipments(allEq || []);
      } catch (e) {
        console.error('Error fetching equipment', e);
      }

      // Load categories
      try {
        const cats = procurementService.getCategories();
        const catNames = cats.map((c) => c.nameAr).filter(Boolean);
        const combined = Array.from(new Set([...catNames, ...FALLBACK_CATEGORIES]));
        if (existingRequest?.category && !combined.includes(existingRequest.category)) {
          combined.unshift(existingRequest.category);
        }
        setCategories(combined);
      } catch (e) {
        console.warn('Error loading categories:', e);
      }

      if (existingRequest) {
        setItemDescription(existingRequest.itemDescription || '');
        setCategory(existingRequest.category || FALLBACK_CATEGORIES[0]);
        setQuantity(existingRequest.quantity || 1);
        setUnit(existingRequest.unit || 'عدد');
        setEstimatedUnitPrice(existingRequest.estimatedUnitPrice || 0);
        setCurrency(existingRequest.currency || 'JOD');
        setPriority(existingRequest.priority || 'medium');
        setRequiredDate(existingRequest.requiredDate || new Date().toISOString().split('T')[0]);
        setJustification(existingRequest.justification || '');
        setSuggestedSupplier(existingRequest.suggestedSupplier || '');
        setSupplierContact(existingRequest.supplierContact || '');
        setRelatedEquipmentId(existingRequest.relatedEquipmentId || '');
        setRelatedTaskId(existingRequest.relatedTaskId || '');
        setNotes(existingRequest.notes || '');
      } else {
        // Reset defaults
        setItemDescription('');
        setCategory(FALLBACK_CATEGORIES[0]);
        setQuantity(1);
        setUnit('عدد');
        setEstimatedUnitPrice(0);
        setCurrency('JOD');
        setPriority('medium');
        setRequiredDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
        setJustification('');
        setSuggestedSupplier('');
        setSupplierContact('');
        setRelatedEquipmentId('');
        setRelatedTaskId('');
        setNotes('');
      }
      setErrorMsg('');
      setSimilarItems([]);
      setShowDuplicateModal(false);
    }
  }, [isOpen, existingRequest]);

  // Real-time live check when typing item description
  useEffect(() => {
    let active = true;
    if (itemDescription.trim().length >= 3 && !existingRequest) {
      procurementService
        .checkSimilarRequests({
          itemDescription,
          category,
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
  }, [itemDescription, category, relatedEquipmentId, existingRequest]);

  if (!isOpen) return null;

  const handleSubmitAttempt = async (e?: React.FormEvent, asDraft = false) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!itemDescription.trim()) {
      setErrorMsg(isArabic ? 'يرجى كتابة وصف المادة أو الخدمة' : 'Please enter item description');
      return;
    }
    if (!justification.trim() && !asDraft) {
      setErrorMsg(isArabic ? 'يرجى كتابة مبررات وأسباب الطلب' : 'Please provide request justification');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg(isArabic ? 'الكمية يجب أن تكون أكبر من صفر' : 'Quantity must be greater than 0');
      return;
    }

    // Check for duplicates if creating new and submitting for approval
    if (!existingRequest && !asDraft) {
      try {
        setIsSubmitting(true);
        const check = await procurementService.checkSimilarRequests({
          itemDescription,
          category,
          equipmentId: relatedEquipmentId,
        });
        if (check.hasSimilar) {
          setSimilarItems(check.matches.map((m) => m.request));
          setShowDuplicateModal(true);
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.warn('Duplicate check skipped on error:', err);
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
        await procurementService.updatePurchaseRequest(
          existingRequest.id,
          {
            itemDescription: itemDescription.trim(),
            category,
            quantity: Number(quantity),
            unit,
            estimatedUnitPrice: Number(estimatedUnitPrice),
            estimatedTotal,
            currency,
            priority,
            requiredDate,
            justification: justification.trim(),
            suggestedSupplier: suggestedSupplier.trim() || undefined,
            supplierContact: supplierContact.trim() || undefined,
            relatedEquipmentId: relatedEquipmentId || undefined,
            relatedEquipmentName: selectedEquipment ? selectedEquipment.nameAr || selectedEquipment.name : undefined,
            relatedTaskId: relatedTaskId || undefined,
            notes: notes.trim() || undefined,
          },
          actor
        );
      } else {
        await procurementService.createPurchaseRequest(
          {
            department: actor.department || 'العمليات والصيانة',
            section: 'محطة الغاز الحيوي - الغباوي',
            itemDescription: itemDescription.trim(),
            category,
            quantity: Number(quantity),
            unit,
            estimatedUnitPrice: Number(estimatedUnitPrice),
            estimatedTotal,
            currency,
            priority,
            requiredDate,
            justification: justification.trim(),
            suggestedSupplier: suggestedSupplier.trim() || undefined,
            supplierContact: supplierContact.trim() || undefined,
            relatedEquipmentId: relatedEquipmentId || undefined,
            relatedEquipmentName: selectedEquipment ? selectedEquipment.nameAr || selectedEquipment.name : undefined,
            relatedTaskId: relatedTaskId || undefined,
            notes: notes.trim() || undefined,
            duplicateWarningAcknowledged: similarItems.length > 0,
            duplicateWarningDetails: similarItems.length > 0 ? `Acknowledged ${similarItems.length} similar item(s)` : undefined,
          },
          actor,
          asDraft
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error saving purchase request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
          {/* Modal Header */}
          <div className="p-4 sm:p-5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {existingRequest
                    ? isArabic ? `تعديل طلب الشراء (${existingRequest.requestNumber})` : `Edit Purchase Request (${existingRequest.requestNumber})`
                    : isArabic ? 'إنشاء طلب شراء داخلي جديد' : 'New Internal Purchase Requisition'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isArabic
                    ? 'محطة مكب الغباوي الهندسي - شركة الغاز الحيوي الأردنية'
                    : 'Jordan Biogas Company - Al-Ghabawi Landfill Plant'}
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
          <form onSubmit={handleSubmitAttempt} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {errorMsg && (
              <div className="p-3 bg-rose-950/70 border border-rose-600/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Live Duplicate Warning Banner */}
            {similarItems.length > 0 && !existingRequest && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-amber-300">
                    {isArabic
                      ? `تم العثور على (${similarItems.length}) طلبات سابقة مشابهة لهذه المادة:`
                      : `Found (${similarItems.length}) similar previous requests:`}
                  </div>
                  <ul className="text-xs text-amber-200/90 mt-1 space-y-1">
                    {similarItems.slice(0, 2).map((item) => (
                      <li key={item.id} className="flex items-center gap-1.5">
                        <span className="font-mono text-emerald-400 font-bold">[{item.requestNumber}]</span>
                        <span>{item.itemDescription || item.purpose}</span>
                        <span className="text-slate-400 text-[10px]">
                          ({new Date(item.requestDate).toLocaleDateString(isArabic ? 'ar-JO' : 'en-GB')})
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="text-[11px] text-amber-300/80 mt-1.5 font-medium">
                    {isArabic
                      ? 'يمكنك مراجعتها لتجنب تكرار الطلب أو الاستمرار إذا كانت الكمية إضافية.'
                      : 'You can review them or continue if this is a separate requirement.'}
                  </div>
                </div>
              </div>
            )}

            {/* Item Description */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isArabic ? 'اسم المادة / القطعة / الخدمة المطلوبة *' : 'Item / Service Description *'}
              </label>
              <input
                type="text"
                required
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder={
                  isArabic
                    ? 'مثال: فلاتر زيت لمحرك الغاز Jenbacher 320، حساس ضغط الغاز...'
                    : 'e.g., Oil filters for Jenbacher 320, pressure sensor...'
                }
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Category & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isArabic ? 'التصنيف الفني' : 'Technical Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isArabic ? 'درجة الأولوية' : 'Priority'}
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PurchasePriority)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="low">{isArabic ? 'عادية (Routine)' : 'Normal / Low'}</option>
                  <option value="medium">{isArabic ? 'متوسطة (Medium)' : 'Medium'}</option>
                  <option value="high">{isArabic ? 'عالية (High)' : 'High'}</option>
                  <option value="urgent">{isArabic ? 'طارئة جداً (Urgent / Emergency)' : 'Urgent'}</option>
                </select>
              </div>
            </div>

            {/* Quantity, Unit, Price, Total Grid */}
            <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>{isArabic ? 'الكميات والتقدير المالي' : 'Quantities & Estimated Cost'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {isArabic ? 'الكمية *' : 'Quantity *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {isArabic ? 'الوحدة' : 'Unit'}
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:border-emerald-500"
                  >
                    <option value="عدد">عدد (Pcs)</option>
                    <option value="لتر">لتر (Liters)</option>
                    <option value="برميل">برميل (Drum)</option>
                    <option value="طقم">طقم (Set)</option>
                    <option value="متر">متر (Meters)</option>
                    <option value="كغم">كغم (Kg)</option>
                    <option value="صندوق">صندوق (Box)</option>
                    <option value="ساعة عمل">ساعة عمل (Hours)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {isArabic ? 'سعر الوحدة التقديري' : 'Est. Unit Price'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={estimatedUnitPrice}
                    onChange={(e) => setEstimatedUnitPrice(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    {isArabic ? 'الإجمالي التقديري' : 'Total Est.'}
                  </label>
                  <div className="bg-emerald-950/70 border border-emerald-700/60 rounded-lg px-2.5 py-2 text-sm font-bold text-emerald-400 text-center">
                    {estimatedTotal.toLocaleString()} {currency}
                  </div>
                </div>
              </div>
            </div>

            {/* Related Equipment and Required Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isArabic ? 'المعدة أو الأصل المرتبط (اختياري)' : 'Related Equipment (Optional)'}</span>
                </label>
                <select
                  value={relatedEquipmentId}
                  onChange={(e) => setRelatedEquipmentId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">{isArabic ? '-- بدون ربط بمعدة محددة (عام) --' : '-- General Plant Equipment --'}</option>
                  {equipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.tagNumber ? `[${eq.tagNumber}] ` : ''}
                      {eq.nameAr || eq.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isArabic ? 'تاريخ الحاجة المطلوب *' : 'Required Date *'}</span>
                </label>
                <input
                  type="date"
                  required
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Justification */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isArabic ? 'مبررات الشراء والجدوى التشغيلية *' : 'Justification & Purpose *'}
              </label>
              <textarea
                required
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={
                  isArabic
                    ? 'بيان سبب الحاجة للمادة، مثل: استبدال تالف أثناء الصيانة الوقائية، نفاد المخزون، متطلب أمان...'
                    : 'Explain reason for requirement...'
                }
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Suggested Supplier (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isArabic ? 'المورد المقترح (إن وجد)' : 'Suggested Supplier (Optional)'}
                </label>
                <input
                  type="text"
                  value={suggestedSupplier}
                  onChange={(e) => setSuggestedSupplier(e.target.value)}
                  placeholder={isArabic ? 'اسم الشركة أو الوكيل المقترح' : 'Supplier name / contact'}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isArabic ? 'هاتف أو بريد المورد المقترح' : 'Supplier Contact Details'}
                </label>
                <input
                  type="text"
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  placeholder={isArabic ? 'رقم الهاتف أو البريد الإلكتروني' : 'Phone / Email'}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isArabic ? 'ملاحظات ومواصفات إضافية' : 'Additional Notes / Specifications'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isArabic ? 'أي أرقام قطع Part Numbers أو أبعاد أو شروط استلام...' : 'Part numbers, specs...'}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Modal Actions */}
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
                className="px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-lg shadow-emerald-900/40 flex items-center gap-2"
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
                    : isArabic ? 'تقديم للاعتماد' : 'Submit Requisition'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Duplicate Warning Popup Modal */}
      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onConfirm={() => executeSave(false)}
        similarRequests={similarItems}
        itemTitle={itemDescription}
      />
    </>
  );
};
