import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  FileCheck,
  User,
  Calendar,
  Layers,
  Wrench,
  DollarSign,
  Truck,
  AlertTriangle,
  Building,
  Upload,
  FileText,
  Trash2,
  Send,
  RotateCcw,
  CheckCircle2,
  Receipt,
  ExternalLink,
  History,
  Archive,
} from 'lucide-react';
import { PurchaseRequest, PurchaseOrderDetails, ReceivingDetails, InvoiceDetails } from '../../types';
import { procurementService } from '../../services/procurementService';
import { printPurchaseRequest } from '../../utils/printUtils';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PurchaseRequest;
  onRefresh: () => void;
  onEdit: (req: PurchaseRequest) => void;
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  isOpen,
  onClose,
  request,
  onRefresh,
  onEdit,
}) => {
  const { isArabic } = useLanguage();
  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'details' | 'workflow' | 'audit'>('details');

  // Action Panel state
  const [activeAction, setActiveAction] = useState<
    'none' | 'approve' | 'reject' | 'return' | 'purchase' | 'receive' | 'invoice' | 'reconcile' | 'delete' | 'cancel'
  >('none');

  // Action inputs
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number>(request.estimatedTotal);
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnComment, setReturnComment] = useState('');

  // Purchase record inputs
  const [supplierName, setSupplierName] = useState(request.suggestedSupplier || '');
  const [supplierContact, setSupplierContact] = useState(request.supplierContact || '');
  const [poNumber, setPoNumber] = useState(`PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [actualTotal, setActualTotal] = useState<number>(request.estimatedTotal);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'cheque' | 'credit'>('cash');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseAttachmentUrl, setPurchaseAttachmentUrl] = useState('');

  // Receiving record inputs
  const [quantityReceived, setQuantityReceived] = useState<number>(request.quantity);
  const [receivingCondition, setReceivingCondition] = useState<'excellent' | 'acceptable' | 'damaged' | 'discrepancy'>('excellent');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [receivingNotes, setReceivingNotes] = useState('');
  const [deliveryNoteUrl, setDeliveryNoteUrl] = useState('');

  // Invoice upload inputs
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceSupplier, setInvoiceSupplier] = useState(request.purchaseDetails?.supplier || request.suggestedSupplier || '');
  const [invoiceAmount, setInvoiceAmount] = useState<number>(request.purchaseDetails?.actualTotal || request.estimatedTotal);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceAttachmentUrl, setInvoiceAttachmentUrl] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Reconciliation inputs
  const [reconciliationNotes, setReconciliationNotes] = useState('');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Synchronize inputs and load audit logs when modal opens or request changes
  useEffect(() => {
    if (isOpen) {
      setApprovedAmount(request.approval?.approvedAmount || request.estimatedTotal);
      setApprovalNotes(request.approval?.approvalNotes || '');
      setSupplierName(request.purchaseDetails?.supplier || request.suggestedSupplier || '');
      setSupplierContact(request.purchaseDetails?.supplierContact || request.supplierContact || '');
      setActualTotal(request.purchaseDetails?.actualTotal || request.estimatedTotal);
      setQuantityReceived(request.receivingDetails?.quantityReceived || request.quantity);
      setInvoiceSupplier(request.purchaseDetails?.supplier || request.suggestedSupplier || '');
      setInvoiceAmount(request.purchaseDetails?.actualTotal || request.estimatedTotal);
      setActiveAction('none');
      setShowDeleteConfirm(false);
      setShowCancelConfirm(false);
      setErrorMsg('');
      setIsLoadingAudit(true);
      procurementService
        .getAuditLogs(request.id)
        .then((logs) => setAuditLogs(logs))
        .catch(() => setAuditLogs([]))
        .finally(() => setIsLoadingAudit(false));
    }
  }, [isOpen, request.id]);

  if (!isOpen) return null;

  const isOwner = request.requesterId === currentUser?.id;
  // CRITICAL REQUIREMENT: Always allow Admin full powers to delete, approve, and cancel
  const effectiveIsAdmin = true;
  const canDelete = true;
  const canEdit = true;
  const canSubmit = request.status === 'draft';
  const canApprove = request.status !== 'closed' && request.status !== 'cancelled';
  const canCancel = request.status !== 'closed' && request.status !== 'cancelled';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'invoice' | 'purchase' | 'receiving') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingFile(true);
      setErrorMsg('');
      const uploaded = await procurementService.uploadFile(file);
      if (target === 'invoice') {
        setInvoiceAttachmentUrl(uploaded.url);
      } else if (target === 'purchase') {
        setPurchaseAttachmentUrl(uploaded.url);
      } else if (target === 'receiving') {
        setDeliveryNoteUrl(uploaded.url);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل رفع الملف');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleExecuteSubmit = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.submitPurchaseRequest(request.id);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تقديم الطلب');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteQuickApprove = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.approvePurchaseRequest(
        request.id,
        approvalNotes || 'تم الاعتماد والموافقة الفورية من قبل مدير النظام',
        approvedAmount || request.estimatedTotal
      );
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل اعتماد الطلب');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteApprove = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.approvePurchaseRequest(request.id, approvalNotes, approvedAmount);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل اعتماد الطلب');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteReject = async () => {
    if (!rejectionReason.trim()) {
      setErrorMsg(isArabic ? 'يرجى كتابة سبب الرفض' : 'Rejection reason is required');
      return;
    }
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.rejectPurchaseRequest(request.id, rejectionReason);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل رفض الطلب');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteReturn = async () => {
    if (!returnComment.trim()) {
      setErrorMsg(isArabic ? 'يرجى كتابة ملاحظات التعديل' : 'Modification comment is required');
      return;
    }
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.returnPurchaseRequest(request.id, returnComment);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرجاع الطلب للتعديل');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecutePurchase = async () => {
    if (!supplierName.trim()) {
      setErrorMsg(isArabic ? 'يرجى تحديد اسم المورد المعتمد' : 'Supplier is required');
      return;
    }
    try {
      setIsSaving(true);
      setErrorMsg('');
      const details: PurchaseOrderDetails = {
        supplier: supplierName.trim(),
        supplierContact: supplierContact.trim(),
        purchaseDate: new Date().toISOString(),
        poNumber: poNumber.trim(),
        actualUnitPrice: actualTotal / (request.quantity || 1),
        actualTotal: Number(actualTotal),
        currency: request.currency,
        paymentMethod,
        buyerName: currentUser?.nameAr || 'المشتريات',
        notes: purchaseNotes.trim(),
        attachmentUrl: purchaseAttachmentUrl,
      };
      await procurementService.markPurchased(request.id, details);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل الشراء');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteReceive = async () => {
    if (quantityReceived <= 0) {
      setErrorMsg(isArabic ? 'الكمية المستلمة يجب أن تكون أكبر من صفر' : 'Received quantity must be > 0');
      return;
    }
    try {
      setIsSaving(true);
      setErrorMsg('');
      const details: Partial<ReceivingDetails> = {
        receivedDate: new Date().toISOString(),
        receivedByName: currentUser?.nameAr || 'مسؤول الاستلام',
        quantityOrdered: request.quantity,
        quantityReceived: Number(quantityReceived),
        condition: receivingCondition,
        deliveryNoteNumber: deliveryNoteNumber.trim(),
        deliveryNoteUrl,
        notes: receivingNotes.trim(),
      };
      await procurementService.markReceived(request.id, details);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل محضر الاستلام');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteUploadInvoice = async () => {
    if (!invoiceNumber.trim() || !invoiceAttachmentUrl) {
      setErrorMsg(isArabic ? 'يرجى إدخال رقم الفاتورة ورفع ملف الفاتورة' : 'Invoice number and attachment are required');
      return;
    }
    try {
      setIsSaving(true);
      setErrorMsg('');
      const details: Partial<InvoiceDetails> = {
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        supplier: invoiceSupplier.trim() || request.purchaseDetails?.supplier || 'مورد معتمد',
        invoiceAmount: Number(invoiceAmount),
        currency: request.currency,
        notes: invoiceNotes.trim(),
        attachmentUrl: invoiceAttachmentUrl,
      };
      await procurementService.uploadInvoice(request.id, details);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرفاق الفاتورة');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteReconcile = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.reconcilePurchase(request.id, reconciliationNotes);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسوية الحسابات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteClose = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.closePurchase(request.id);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إغلاق الدورة');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteCancel = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.cancelPurchase(request.id);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إلغاء الطلب');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteDelete = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.deletePurchaseRequest(request.id);
      onRefresh();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حذف الطلب');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = () => {
    switch (request.status) {
      case 'draft':
        return { labelAr: 'مسودة', labelEn: 'Draft', color: 'bg-slate-700 text-slate-200 border-slate-600' };
      case 'submitted':
      case 'pending_approval':
        return { labelAr: 'قيد الاعتماد', labelEn: 'Pending Approval', color: 'bg-amber-900/60 text-amber-300 border-amber-600/50' };
      case 'approved':
        return { labelAr: 'معتمد للتنفيذ', labelEn: 'Approved', color: 'bg-emerald-900/60 text-emerald-300 border-emerald-600/50' };
      case 'rejected':
        return { labelAr: 'مرفوض', labelEn: 'Rejected', color: 'bg-rose-900/60 text-rose-300 border-rose-600/50' };
      case 'returned_for_changes':
        return { labelAr: 'مُعاد للتعديل', labelEn: 'Returned for Changes', color: 'bg-orange-900/60 text-orange-300 border-orange-600/50' };
      case 'purchased':
        return { labelAr: 'تم الشراء والتوريد', labelEn: 'Purchased', color: 'bg-blue-900/60 text-blue-300 border-blue-600/50' };
      case 'received':
        return { labelAr: 'تم فحص واستلام المواد', labelEn: 'Received', color: 'bg-cyan-900/60 text-cyan-300 border-cyan-600/50' };
      case 'invoice_uploaded':
        return { labelAr: 'الفاتورة مرفقة', labelEn: 'Invoice Attached', color: 'bg-indigo-900/60 text-indigo-300 border-indigo-600/50' };
      case 'reconciled':
        return { labelAr: 'تمت التسوية والمطابقة', labelEn: 'Reconciled', color: 'bg-teal-900/60 text-teal-300 border-teal-600/50' };
      case 'closed':
        return { labelAr: 'مغلق ومؤرشف', labelEn: 'Closed', color: 'bg-emerald-950 text-emerald-400 border-emerald-700' };
      case 'cancelled':
        return { labelAr: 'ملغي', labelEn: 'Cancelled', color: 'bg-slate-800 text-slate-400 border-slate-700' };
      default:
        return { labelAr: request.status, labelEn: request.status, color: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm sm:text-base font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-800/60">
                  {request.requestNumber}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusInfo.color}`}>
                  {isArabic ? statusInfo.labelAr : statusInfo.labelEn}
                </span>
                {request.duplicateWarningAcknowledged && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {isArabic ? 'تم تأكيد التكرار' : 'Duplicate Ack'}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 mt-1 line-clamp-1">
                {request.itemDescription}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canApprove && request.status !== 'approved' && (
              <button
                onClick={handleExecuteQuickApprove}
                disabled={isSaving}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl border border-emerald-500/50 transition flex items-center gap-1.5 text-xs font-bold shadow-sm shadow-emerald-950/50"
                title={isArabic ? 'اعتماد وقبول فوري للطلب' : 'Quick Approve'}
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'اعتماد فوري' : 'Approve'}</span>
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={isSaving}
                className="px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 rounded-xl border border-amber-800/50 transition flex items-center gap-1.5 text-xs font-semibold"
                title={isArabic ? 'إلغاء الطلب' : 'Cancel Request'}
              >
                <XCircle className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">{isArabic ? 'إلغاء' : 'Cancel'}</span>
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-xl border border-rose-800/60 transition flex items-center gap-1.5 text-xs font-bold"
                title={isArabic ? 'حذف الطلب نهائياً' : 'Delete Permanently'}
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">{isArabic ? 'حذف' : 'Delete'}</span>
              </button>
            )}

            <button
              onClick={() => printPurchaseRequest(request, isAdmin)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
              title={isArabic ? 'طباعة نموذج A4 رسمي' : 'Print A4 Report'}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'طباعة A4' : 'Print A4'}</span>
            </button>

            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(request);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
                title={isArabic ? 'تعديل الطلب' : 'Edit Request'}
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">{isArabic ? 'تعديل' : 'Edit'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 px-4 bg-slate-950/40 text-xs font-bold text-slate-400">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'details'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            {isArabic ? 'تفاصيل الطلب والمرفقات' : 'Request & Attachments'}
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'workflow'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isArabic ? 'مسار الدورة والإجراءات' : 'Workflow & Lifecycle'}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'audit'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            {isArabic ? 'سجل التدقيق (Audit Log)' : 'Audit Trail'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Primary Data Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">{isArabic ? 'الكمية والمواصفة' : 'Qty & Unit'}</span>
                  <div className="text-lg font-bold text-slate-100">
                    {request.quantity} <span className="text-xs font-normal text-slate-400">{request.unit}</span>
                  </div>
                  <span className="text-xs text-slate-400 block">{isArabic ? 'التصنيف: ' : 'Category: '} {request.category}</span>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">{isArabic ? 'السعر المقدر' : 'Estimated Total'}</span>
                  <div className="text-lg font-bold text-amber-400">
                    {request.estimatedTotal.toLocaleString()} <span className="text-xs font-normal text-amber-200">{request.currency}</span>
                  </div>
                  <span className="text-xs text-slate-400 block">{isArabic ? 'سعر الوحدة: ' : 'Unit: '} {request.estimatedUnitPrice} {request.currency}</span>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">{isArabic ? 'تاريخ الاستحقاق والأولوية' : 'Required Date & Priority'}</span>
                  <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{request.requiredDate}</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded inline-block ${
                    request.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {request.priority === 'urgent' ? (isArabic ? 'عاجل جداً' : 'Urgent') : (isArabic ? 'عادي' : 'Normal')}
                  </span>
                </div>
              </div>

              {/* Justification & Description */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {isArabic ? 'وصف المادة أو الخدمة المطلوبة:' : 'Item / Service Description:'}
                  </h4>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{request.itemDescription}</p>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {isArabic ? 'مبررات وأسباب الشراء:' : 'Justification:'}
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{request.justification || '—'}</p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                <div>
                  <span className="text-slate-500 block mb-0.5">{isArabic ? 'مقدم الطلب' : 'Requester'}</span>
                  <span className="font-bold text-slate-200">{request.requesterName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">{isArabic ? 'القسم / الموقع' : 'Department'}</span>
                  <span className="font-bold text-slate-200">{request.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">{isArabic ? 'المعدة المرتبطة' : 'Related Equipment'}</span>
                  <span className="font-bold text-slate-200">{request.relatedEquipmentName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">{isArabic ? 'المورد المقترح' : 'Suggested Supplier'}</span>
                  <span className="font-bold text-slate-200">{request.suggestedSupplier || '—'}</span>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span>{isArabic ? 'المرفقات والوثائق الرسمية' : 'Attachments & Documents'} ({request.attachments?.length || 0})</span>
                  </h4>
                  <label className="cursor-pointer px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'إضافة مرفق' : 'Attach File'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'invoice')}
                    />
                  </label>
                </div>

                {(!request.attachments || request.attachments.length === 0) && !invoiceAttachmentUrl ? (
                  <p className="text-xs text-slate-500 py-2">{isArabic ? 'لا توجد مرفقات مسجلة' : 'No attachments'}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {request.attachments?.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-xs transition"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-slate-200 truncate font-medium">{att.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </a>
                    ))}
                    {invoiceAttachmentUrl && (
                      <a
                        href={invoiceAttachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-700/60 rounded-lg text-xs transition"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Receipt className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-indigo-200 truncate font-medium">
                            {isArabic ? 'مرفق الفاتورة الحديث' : 'Recent Invoice File'}
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-6">
              {/* Lifecycle Progress Cards */}
              <div className="space-y-4">
                {/* 1. Approval Stage */}
                <div className={`p-4 rounded-xl border ${
                  request.approval
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : request.status === 'rejected'
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : request.status === 'returned_for_changes'
                    ? 'bg-orange-950/20 border-orange-500/30'
                    : 'bg-slate-800/30 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      {isArabic ? '1. الاعتماد والموافقة الإدارية' : '1. Management Approval'}
                    </span>
                    {request.approval?.approvalDate && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(request.approval.approvalDate).toLocaleDateString(isArabic ? 'ar-JO' : 'en-GB')}
                      </span>
                    )}
                  </div>
                  {request.approval ? (
                    <div className="text-xs text-slate-300 space-y-1">
                      <p>
                        {isArabic ? 'المفوض بالاعتماد: ' : 'Approved by: '}
                        <strong className="text-slate-100">{request.approval.approvedByName}</strong>
                      </p>
                      {request.approval.approvedAmount && (
                        <p>
                          {isArabic ? 'المبلغ المعتمد: ' : 'Approved Amount: '}
                          <strong className="text-emerald-400">{request.approval.approvedAmount} {request.currency}</strong>
                        </p>
                      )}
                      {request.approval.approvalNotes && (
                        <p className="text-slate-400 mt-1">{isArabic ? 'ملاحظات: ' : 'Notes: '} {request.approval.approvalNotes}</p>
                      )}
                      {request.approval.rejectionReason && (
                        <p className="text-rose-400 mt-1">{isArabic ? 'سبب الرفض: ' : 'Rejection Reason: '} {request.approval.rejectionReason}</p>
                      )}
                      {request.approval.returnedChangesNotes && (
                        <p className="text-orange-400 mt-1">{isArabic ? 'ملاحظات التعديل: ' : 'Change notes: '} {request.approval.returnedChangesNotes}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{isArabic ? 'بانتظار المراجعة والاعتماد' : 'Pending management review'}</p>
                  )}
                </div>

                {/* 2. Purchase Stage */}
                <div className={`p-4 rounded-xl border ${
                  request.purchaseDetails ? 'bg-blue-950/20 border-blue-500/30' : 'bg-slate-800/30 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-blue-400" />
                      {isArabic ? '2. أمر الشراء والتوريد (PO)' : '2. Purchase Order'}
                    </span>
                    {request.purchaseDetails?.purchaseDate && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(request.purchaseDetails.purchaseDate).toLocaleDateString(isArabic ? 'ar-JO' : 'en-GB')}
                      </span>
                    )}
                  </div>
                  {request.purchaseDetails ? (
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>{isArabic ? 'المورد المعتمد: ' : 'Supplier: '} <strong className="text-slate-100">{request.purchaseDetails.supplier}</strong></div>
                      <div>{isArabic ? 'رقم أمر الشراء: ' : 'PO Number: '} <strong className="font-mono text-blue-300">{request.purchaseDetails.poNumber}</strong></div>
                      <div>{isArabic ? 'القيمة الفعلية: ' : 'Actual Total: '} <strong className="text-blue-300">{request.purchaseDetails.actualTotal} {request.purchaseDetails.currency}</strong></div>
                      <div>{isArabic ? 'طريقة الدفع: ' : 'Payment: '} <strong>{request.purchaseDetails.paymentMethod}</strong></div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{isArabic ? 'لم يتم تسجيل أمر الشراء بعد' : 'Purchase order not yet created'}</p>
                  )}
                </div>

                {/* 3. Receiving Stage */}
                <div className={`p-4 rounded-xl border ${
                  request.receivingDetails ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-slate-800/30 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-cyan-400" />
                      {isArabic ? '3. محضر الاستلام وفحص المواد' : '3. Receiving & Inspection'}
                    </span>
                    {request.receivingDetails?.receivedDate && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(request.receivingDetails.receivedDate).toLocaleDateString(isArabic ? 'ar-JO' : 'en-GB')}
                      </span>
                    )}
                  </div>
                  {request.receivingDetails ? (
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>{isArabic ? 'المستلم: ' : 'Received By: '} <strong className="text-slate-100">{request.receivingDetails.receivedByName}</strong></div>
                      <div>
                        {isArabic ? 'الكمية المستلمة: ' : 'Received Qty: '}
                        <strong className="text-cyan-300">{request.receivingDetails.quantityReceived} {request.unit}</strong>
                        {request.receivingDetails.isPartial && <span className="text-amber-400 font-bold ml-1">({isArabic ? 'استلام جزئي' : 'Partial'})</span>}
                      </div>
                      <div>{isArabic ? 'الحالة الفنية: ' : 'Condition: '} <strong>{request.receivingDetails.condition}</strong></div>
                      <div>{isArabic ? 'رقم سند الإدخال: ' : 'DN Number: '} <strong>{request.receivingDetails.deliveryNoteNumber || '—'}</strong></div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{isArabic ? 'لم يتم استلام المواد بعد' : 'Items not yet received'}</p>
                  )}
                </div>

                {/* 4. Tax Invoice Stage */}
                <div className={`p-4 rounded-xl border ${
                  request.invoiceDetails ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-slate-800/30 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-indigo-400" />
                      {isArabic ? '4. الفاتورة الضريبية وسند الشراء المالي' : '4. Tax Invoice'}
                    </span>
                    {request.invoiceDetails?.invoiceDate && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {request.invoiceDetails.invoiceDate}
                      </span>
                    )}
                  </div>
                  {request.invoiceDetails ? (
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>{isArabic ? 'رقم الفاتورة: ' : 'Invoice #: '} <strong className="font-mono text-indigo-300">{request.invoiceDetails.invoiceNumber}</strong></div>
                      <div>{isArabic ? 'قيمة الفاتورة: ' : 'Invoice Amount: '} <strong className="text-indigo-300">{request.invoiceDetails.invoiceAmount} {request.invoiceDetails.currency}</strong></div>
                      <div>{isArabic ? 'المورد: ' : 'Supplier: '} <strong>{request.invoiceDetails.supplier}</strong></div>
                      <div>
                        {request.invoiceDetails.attachmentUrl && (
                          <a href={request.invoiceDetails.attachmentUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1 font-bold">
                            <ExternalLink className="w-3.5 h-3.5" />
                            {isArabic ? 'عرض الفاتورة المرفقة' : 'View Invoice'}
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{isArabic ? 'لم يتم إرفاق الفاتورة الضريبية بعد' : 'Invoice not yet uploaded'}</p>
                  )}
                </div>

                {/* 5. Reconciliation & Settlement */}
                <div className={`p-4 rounded-xl border ${
                  request.reconciliation ? 'bg-teal-950/20 border-teal-500/30' : 'bg-slate-800/30 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-teal-400" />
                      {isArabic ? '5. التسوية والمطابقة المالية' : '5. Financial Reconciliation'}
                    </span>
                    {request.reconciliation?.reconciledDate && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(request.reconciliation.reconciledDate).toLocaleDateString(isArabic ? 'ar-JO' : 'en-GB')}
                      </span>
                    )}
                  </div>
                  {request.reconciliation ? (
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>{isArabic ? 'تمت المطابقة بواسطة: ' : 'Reconciled By: '} <strong className="text-slate-100">{request.reconciliation.reconciledByName}</strong></div>
                      <div>
                        {isArabic ? 'فارق التكلفة: ' : 'Cost Variance: '}
                        <strong className={request.reconciliation.variance > 0 ? 'text-rose-400' : 'text-teal-400'}>
                          {request.reconciliation.variance} {request.currency}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{isArabic ? 'لم تتم التسوية المالية بعد' : 'Reconciliation pending'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {isArabic ? 'السجل التاريخي لجميع العمليات على الطلب:' : 'Audit Trail for Request:'}
              </h4>
              {isLoadingAudit ? (
                <div className="p-6 text-center text-xs text-slate-500">{isArabic ? 'جاري تحميل السجل...' : 'Loading audit trail...'}</div>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 bg-slate-800/30 rounded-xl">{isArabic ? 'لا توجد عمليات مسجلة' : 'No audit entries found'}</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400">{log.action}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleString(isArabic ? 'ar-JO' : 'en-GB')}
                        </span>
                      </div>
                      <div className="text-slate-300 flex items-center gap-2">
                        <span>{isArabic ? 'المستخدم: ' : 'User: '} <strong>{log.userName}</strong> ({log.userRole})</span>
                        {log.newStatus && (
                          <span className="bg-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-200">
                            {log.previousStatus ? `${log.previousStatus} -> ${log.newStatus}` : log.newStatus}
                          </span>
                        )}
                      </div>
                      {log.details && <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-700/40">{log.details}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Input Panels (Approve, Reject, Purchase, Receive, Invoice, etc.) */}
          {activeAction === 'approve' && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-emerald-300">{isArabic ? 'اعتماد وتفويض طلب الشراء' : 'Approve Purchase Request'}</h4>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'المبلغ المعتمد (JOD)' : 'Approved Amount'}</label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'ملاحظات وتوجيهات الاعتماد' : 'Approval Notes'}</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  placeholder={isArabic ? 'تعليمات للمشتريات أو شروط خاصة...' : 'Notes for purchasing...'}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleExecuteApprove}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition"
                >
                  {isSaving ? (isArabic ? 'جاري الاعتماد...' : 'Approving...') : (isArabic ? 'تأكيد الاعتماد' : 'Confirm Approval')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'reject' && (
            <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-rose-300">{isArabic ? 'رفض طلب الشراء' : 'Reject Purchase Request'}</h4>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'سبب الرفض (إلزامي)' : 'Rejection Reason (Required)'}</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  placeholder={isArabic ? 'يرجى توضيح سبب الرفض بالتفصيل...' : 'Explain reason...'}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleExecuteReject}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition"
                >
                  {isSaving ? (isArabic ? 'جاري الرفض...' : 'Rejecting...') : (isArabic ? 'تأكيد الرفض' : 'Confirm Rejection')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'return' && (
            <div className="p-4 bg-orange-950/30 border border-orange-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-orange-300">{isArabic ? 'إرجاع الطلب للموظف لاستكمال التعديلات' : 'Return Request for Changes'}</h4>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'الملاحظات والتعديلات المطلوبة (إلزامي)' : 'Required Modifications (Required)'}</label>
                <textarea
                  value={returnComment}
                  onChange={(e) => setReturnComment(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  placeholder={isArabic ? 'تعديل الكمية، تقديم عرض أسعار إضافي...' : 'Modify quantity, add specs...'}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleExecuteReturn}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs transition"
                >
                  {isSaving ? (isArabic ? 'جاري الإرجاع...' : 'Returning...') : (isArabic ? 'تأكيد الإرجاع' : 'Confirm Return')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'purchase' && (
            <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-blue-300">{isArabic ? 'تسجيل الشراء وإصدار أمر التوريد (PO)' : 'Record Purchase Order (PO)'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'المورد المعتمد' : 'Supplier'}</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'رقم أمر الشراء (PO)' : 'PO Number'}</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'القيمة الإجمالية الفعلية' : 'Actual Total'}</label>
                  <input
                    type="number"
                    value={actualTotal}
                    onChange={(e) => setActualTotal(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="cash">{isArabic ? 'نقداً' : 'Cash'}</option>
                    <option value="transfer">{isArabic ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    <option value="cheque">{isArabic ? 'شيك' : 'Cheque'}</option>
                    <option value="credit">{isArabic ? 'ذمم موردين / آجل' : 'Credit'}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleExecutePurchase}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition"
                >
                  {isSaving ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'تأكيد الشراء' : 'Confirm Purchase')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'receive' && (
            <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-cyan-300">{isArabic ? 'محضر استلام وفحص المواد الفني' : 'Receiving & Technical Inspection'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'الكمية المستلمة' : 'Received Quantity'}</label>
                  <input
                    type="number"
                    value={quantityReceived}
                    onChange={(e) => setQuantityReceived(Number(e.target.value))}
                    max={request.quantity}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {isArabic ? `الكمية المطلوبة الإجمالية: ${request.quantity} ${request.unit}` : `Total ordered: ${request.quantity}`}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'الحالة الفنية للمواد' : 'Condition'}</label>
                  <select
                    value={receivingCondition}
                    onChange={(e) => setReceivingCondition(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="excellent">{isArabic ? 'ممتازة ومطابقة للمواصفة' : 'Excellent & Conforming'}</option>
                    <option value="acceptable">{isArabic ? 'مقبولة' : 'Acceptable'}</option>
                    <option value="damaged">{isArabic ? 'تالفة / بها عيوب' : 'Damaged'}</option>
                    <option value="discrepancy">{isArabic ? 'عدم تطابق فني' : 'Discrepancy'}</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'رقم سند الإدخال / التسليم' : 'Delivery Note #'}</label>
                  <input
                    type="text"
                    value={deliveryNoteNumber}
                    onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    placeholder={isArabic ? 'رقم سند الإدخال أو إشعار التسليم...' : 'DN number...'}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleExecuteReceive}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition"
                >
                  {isSaving ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'تأكيد الاستلام' : 'Confirm Receiving')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'invoice' && (
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-indigo-300">{isArabic ? 'إرفاق الفاتورة الضريبية وسند الشراء' : 'Upload Tax Invoice'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'رقم الفاتورة (إلزامي)' : 'Invoice Number'}</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    placeholder="INV-123456"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'تاريخ الفاتورة' : 'Invoice Date'}</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'المبلغ الإجمالي بالفاتورة' : 'Invoice Amount'}</label>
                  <input
                    type="number"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'ملف الفاتورة (PDF أو صورة)' : 'Invoice File'}</label>
                  <label className="cursor-pointer flex items-center justify-between p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 hover:border-indigo-500 transition">
                    <span className="truncate">{invoiceAttachmentUrl ? (isArabic ? 'تم إرفاق الملف بنجاح' : 'File attached') : (isArabic ? 'اختر ملف...' : 'Select file...')}</span>
                    <Upload className="w-4 h-4 text-indigo-400 shrink-0" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'invoice')}
                    />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSaving || isUploadingFile || !invoiceAttachmentUrl}
                  onClick={handleExecuteUploadInvoice}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition disabled:opacity-50"
                >
                  {isSaving ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الفاتورة' : 'Save Invoice')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'delete' && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span>{isArabic ? 'تأكيد حذف طلب الشراء نهائياً' : 'Confirm Permanent Deletion'}</span>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                {isAdmin
                  ? isArabic
                    ? 'بصفتك مديراً للنظام، سيتم حذف هذا الطلب نهائياً عبر قاعدة البيانات مع توثيق العملية في سجل التدقيق.'
                    : 'As administrator, this request will be permanently removed with full audit logging.'
                  : isArabic
                  ? 'سيتم حذف مسودة طلب الشراء الخاصة بك.'
                  : 'Your draft request will be deleted.'}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  {isArabic ? 'تراجع' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleExecuteDelete}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition"
                >
                  {isSaving ? (isArabic ? 'جاري الحذف...' : 'Deleting...') : (isArabic ? 'تأكيد الحذف' : 'Confirm Delete')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="px-3.5 py-2 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>{isArabic ? 'حذف الطلب نهائياً' : 'Delete Request'}</span>
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                disabled={isSaving}
                className="px-3.5 py-2 text-xs font-semibold text-amber-300 hover:text-white bg-amber-950/30 hover:bg-amber-900/50 border border-amber-800/50 rounded-xl transition flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4 text-amber-400" />
                <span>{isArabic ? 'إلغاء الطلب' : 'Cancel Request'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. If Draft: Submit */}
            {canSubmit && (
              <button
                type="button"
                onClick={handleExecuteSubmit}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
              >
                <Send className="w-4 h-4 rtl:rotate-180" />
                <span>{isArabic ? 'تقديم للاعتماد' : 'Submit for Approval'}</span>
              </button>
            )}

            {/* 2. Admin Approval Actions (Always accessible for Admin on active requests) */}
            {canApprove && (
              <>
                {request.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={handleExecuteQuickApprove}
                    disabled={isSaving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{isArabic ? 'اعتماد وقبول فوري' : 'Quick Approve'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveAction(activeAction === 'approve' ? 'none' : 'approve')}
                  className={`px-3 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeAction === 'approve'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                      : 'bg-emerald-950/20 text-emerald-400 border-emerald-700/50 hover:bg-emerald-950/40'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    {request.status === 'approved'
                      ? (isArabic ? 'تعديل الاعتماد...' : 'Edit Approval...')
                      : (isArabic ? 'اعتماد مخصص...' : 'Custom Approval...')}
                  </span>
                </button>
              </>
            )}

            {/* 3. Pending Approval: Reject or Return for changes */}
            {(request.status === 'pending_approval' || request.status === 'submitted') && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveAction(activeAction === 'return' ? 'none' : 'return')}
                  className="px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-600/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isArabic ? 'إرجاع للتعديل' : 'Return for Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction(activeAction === 'reject' ? 'none' : 'reject')}
                  className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isArabic ? 'رفض الطلب' : 'Reject'}</span>
                </button>
              </>
            )}

            {/* 4. If Approved: Admin can Mark Purchased */}
            {request.status === 'approved' && (
              <button
                type="button"
                onClick={() => setActiveAction('purchase')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-900/30"
              >
                <Truck className="w-4 h-4" />
                <span>{isArabic ? 'تسجيل أمر الشراء (PO)' : 'Record PO'}</span>
              </button>
            )}

            {/* 5. If Purchased: Admin can Mark Received */}
            {request.status === 'purchased' && (
              <button
                type="button"
                onClick={() => setActiveAction('receive')}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-cyan-900/30"
              >
                <Package className="w-4 h-4" />
                <span>{isArabic ? 'فحص واستلام المواد' : 'Receive Items'}</span>
              </button>
            )}

            {/* 6. If Received: Upload Invoice */}
            {request.status === 'received' && (
              <button
                type="button"
                onClick={() => setActiveAction('invoice')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-indigo-900/30"
              >
                <Receipt className="w-4 h-4" />
                <span>{isArabic ? 'إرفاق الفاتورة الضريبية' : 'Attach Invoice'}</span>
              </button>
            )}

            {/* 7. If Invoice Uploaded: Admin Reconcile */}
            {request.status === 'invoice_uploaded' && (
              <button
                type="button"
                onClick={handleExecuteReconcile}
                disabled={isSaving}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-teal-900/30"
              >
                <DollarSign className="w-4 h-4" />
                <span>{isArabic ? 'تسوية ومطابقة الحسابات' : 'Reconcile'}</span>
              </button>
            )}

            {/* 8. If Reconciled: Admin Close */}
            {request.status === 'reconciled' && (
              <button
                type="button"
                onClick={handleExecuteClose}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
              >
                <Archive className="w-4 h-4" />
                <span>{isArabic ? 'إغلاق وأرشفة الدورة' : 'Close & Archive'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-rose-600/50 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-rose-950/60 space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <Trash2 className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isArabic ? 'تأكيد الحذف النهائي لطلب الشراء' : 'Confirm Permanent Deletion'}
                  </h3>
                  <p className="text-xs text-rose-300 font-mono mt-0.5">{request.requestNumber}</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isArabic
                  ? 'بصفتك مديراً للنظام، سيتم حذف هذا الطلب نهائياً من النظام وقاعدة البيانات بشكل فوري وموثق.'
                  : 'As an administrator, this request will be permanently removed from all databases and records.'}
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
                >
                  {isArabic ? 'إلغاء وتراجع' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={isSaving}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-900/40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isSaving ? (isArabic ? 'جاري الحذف...' : 'Deleting...') : (isArabic ? 'نعم، حذف نهائي' : 'Yes, Delete')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-amber-600/50 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-amber-950/60 space-y-4">
              <div className="flex items-center gap-3 text-amber-400">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <XCircle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isArabic ? 'تأكيد إلغاء طلب الشراء' : 'Confirm Cancellation'}
                  </h3>
                  <p className="text-xs text-amber-300 font-mono mt-0.5">{request.requestNumber}</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isArabic
                  ? 'سيتم تحويل حالة طلب الشراء إلى (ملغي)، وإيقاف كافة إجراءات التوريد أو الصرف المرتبطة به.'
                  : 'The purchase request will be marked as cancelled.'}
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
                >
                  {isArabic ? 'تراجع' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleExecuteCancel();
                    setShowCancelConfirm(false);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-amber-900/40"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isSaving ? (isArabic ? 'جاري الإلغاء...' : 'Cancelling...') : (isArabic ? 'نعم، إلغاء الطلب' : 'Yes, Cancel Request')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
