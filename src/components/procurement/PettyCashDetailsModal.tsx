import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
  DollarSign,
  FileCheck,
  User,
  Calendar,
  Layers,
  Wrench,
  AlertTriangle,
  Upload,
  FileText,
  Trash2,
  Send,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  History,
  Archive,
  Banknote,
  Coins,
} from 'lucide-react';
import {
  PettyCashRequest,
  PettyCashDisbursement,
  PettyCashReceipt,
  PettyCashReconciliation,
} from '../../types';
import { procurementService } from '../../services/procurementService';
import { printPettyCashRequest } from '../../utils/printUtils';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';

interface PettyCashDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PettyCashRequest;
  onRefresh: () => void;
  onEdit: (req: PettyCashRequest) => void;
}

export const PettyCashDetailsModal: React.FC<PettyCashDetailsModalProps> = ({
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
    'none' | 'approve' | 'reject' | 'return' | 'disburse' | 'receipt' | 'reconcile' | 'delete' | 'cancel'
  >('none');

  // Action inputs
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number>(request.amount);
  const [rejectionReason, setRejectionReason] = useState('');
  const [returnComment, setReturnComment] = useState('');

  // Disbursement inputs
  const [disbursedAmount, setDisbursedAmount] = useState<number>(request.approval?.approvedAmount || request.amount);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'voucher'>('cash');
  const [cashReference, setCashReference] = useState(`VCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [recipient, setRecipient] = useState(request.requesterName);
  const [disbursementNotes, setDisbursementNotes] = useState('');
  const [disbursementAttachmentUrl, setDisbursementAttachmentUrl] = useState('');

  // Receipt upload inputs
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptSupplier, setReceiptSupplier] = useState('');
  const [receiptAmount, setReceiptAmount] = useState<number>(request.disbursement?.actualAmount || request.amount);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptAttachmentUrl, setReceiptAttachmentUrl] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Reconciliation inputs
  const [spentAmount, setSpentAmount] = useState<number>(request.receipt?.receiptAmount || request.disbursement?.actualAmount || request.amount);
  const [returnedAmount, setReturnedAmount] = useState<number>(
    Math.max(0, (request.disbursement?.actualAmount || request.amount) - (request.receipt?.receiptAmount || request.amount))
  );
  const [returnReference, setReturnReference] = useState('');
  const [reconciliationNotes, setReconciliationNotes] = useState('');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApprovedAmount(request.amount);
      setDisbursedAmount(request.approval?.approvedAmount || request.amount);
      setRecipient(request.requesterName);
      setReceiptAmount(request.disbursement?.actualAmount || request.amount);
      setSpentAmount(request.receipt?.receiptAmount || request.disbursement?.actualAmount || request.amount);
      setReturnedAmount(
        Math.max(0, (request.disbursement?.actualAmount || request.amount) - (request.receipt?.receiptAmount || request.amount))
      );
      setActiveAction('none');
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
  const canDelete = isAdmin || (isOwner && request.status === 'draft');
  const canEdit = isAdmin || (isOwner && (request.status === 'draft' || request.status === 'returned_for_changes'));
  const canSubmit = (isOwner || isAdmin) && request.status === 'draft';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'receipt' | 'disbursement') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingFile(true);
      setErrorMsg('');
      const uploaded = await procurementService.uploadFile(file);
      if (target === 'receipt') {
        setReceiptAttachmentUrl(uploaded.url);
      } else {
        setDisbursementAttachmentUrl(uploaded.url);
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
      await procurementService.submitPettyCash(request.id);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تقديم السند');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteApprove = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.approvePettyCash(request.id, approvalNotes, approvedAmount);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل اعتماد السند');
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
      await procurementService.rejectPettyCash(request.id, rejectionReason);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل رفض السند');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteReturn = async () => {
    if (!returnComment.trim()) {
      setErrorMsg(isArabic ? 'يرجى كتابة الملاحظات المطلوبة' : 'Notes required');
      return;
    }
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.returnPettyCash(request.id, returnComment);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرجاع السند للتعديل');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteDisburse = async () => {
    if (disbursedAmount <= 0) {
      setErrorMsg(isArabic ? 'المبلغ المصروف يجب أن يكون أكبر من صفر' : 'Disbursed amount must be > 0');
      return;
    }
    try {
      setIsSaving(true);
      setErrorMsg('');
      const details: Partial<PettyCashDisbursement> = {
        disbursedDate: new Date().toISOString(),
        disbursedByName: currentUser?.nameAr || 'أمين الصندوق',
        actualAmount: Number(disbursedAmount),
        paymentMethod,
        cashReference,
        recipient,
        notes: disbursementNotes.trim(),
        attachmentUrl: disbursementAttachmentUrl,
      };
      await procurementService.recordDisbursement(request.id, details);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل صرف النقدية');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteUploadReceipt = async () => {
    if (!receiptNumber.trim() || !receiptAttachmentUrl) {
      setErrorMsg(isArabic ? 'يرجى إدخال رقم الإيصال ورفع صورة الإيصال / الفاتورة' : 'Receipt # and file are required');
      return;
    }
    try {
      setIsSaving(true);
      setErrorMsg('');
      const details: Partial<PettyCashReceipt> = {
        receiptNumber: receiptNumber.trim(),
        receiptDate,
        supplier: receiptSupplier.trim() || 'مورد محلي',
        receiptAmount: Number(receiptAmount),
        currency: request.currency,
        notes: receiptNotes.trim(),
        attachmentUrl: receiptAttachmentUrl,
      };
      await procurementService.uploadReceipt(request.id, details);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرفاق الإيصال');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteReconcile = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      const reconciliation: Partial<PettyCashReconciliation> = {
        spentAmount: Number(spentAmount),
        returnedAmount: Number(returnedAmount),
        returnReference: returnReference.trim(),
        notes: reconciliationNotes.trim(),
        settlementStatus: 'reconciled',
      };
      await procurementService.recordReconciliation(request.id, reconciliation);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسوية السلفة');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteClose = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.closePettyCash(request.id);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إغلاق السند');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteCancel = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.cancelPettyCash(request.id);
      onRefresh();
      setActiveAction('none');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إلغاء السند');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteDelete = async () => {
    try {
      setIsSaving(true);
      setErrorMsg('');
      await procurementService.deletePettyCashRequest(request.id);
      onRefresh();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حذف السند');
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
        return { labelAr: 'معتمد للصرف', labelEn: 'Approved', color: 'bg-emerald-900/60 text-emerald-300 border-emerald-600/50' };
      case 'rejected':
        return { labelAr: 'مرفوض', labelEn: 'Rejected', color: 'bg-rose-900/60 text-rose-300 border-rose-600/50' };
      case 'returned_for_changes':
        return { labelAr: 'مُعاد للتعديل', labelEn: 'Returned for Changes', color: 'bg-orange-900/60 text-orange-300 border-orange-600/50' };
      case 'cash_disbursed':
      case 'receipt_pending':
        return { labelAr: 'تم الصرف (بانتظار الفاتورة)', labelEn: 'Receipt Pending', color: 'bg-blue-900/60 text-blue-300 border-blue-600/50' };
      case 'receipt_uploaded':
        return { labelAr: 'تم رفع الفاتورة', labelEn: 'Receipt Attached', color: 'bg-indigo-900/60 text-indigo-300 border-indigo-600/50' };
      case 'pending_reconciliation':
      case 'under_review':
        return { labelAr: 'تحت المطابقة والتسوية', labelEn: 'Under Review', color: 'bg-purple-900/60 text-purple-300 border-purple-600/50' };
      case 'reconciled':
        return { labelAr: 'تمت التسوية المالية', labelEn: 'Reconciled', color: 'bg-teal-900/60 text-teal-300 border-teal-600/50' };
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
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm sm:text-base font-bold text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-800/60">
                  {request.requestNumber}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusInfo.color}`}>
                  {isArabic ? statusInfo.labelAr : statusInfo.labelEn}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 mt-1 line-clamp-1">
                {request.purpose}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => printPettyCashRequest(request, isAdmin)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
              title={isArabic ? 'طباعة سند A4 رسمي' : 'Print A4 Voucher'}
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
                title={isArabic ? 'تعديل السند' : 'Edit Voucher'}
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
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            {isArabic ? 'بيانات السند والمصروف' : 'Voucher Details'}
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'workflow'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isArabic ? 'مسار الصرف والتسوية' : 'Disbursement & Settlement'}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
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
              {/* Primary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">{isArabic ? 'المبلغ المطلوب' : 'Requested Amount'}</span>
                  <div className="text-xl font-bold text-blue-400">
                    {request.amount.toLocaleString()} <span className="text-xs font-normal text-blue-200">{request.currency}</span>
                  </div>
                  <span className="text-xs text-slate-400 block">{isArabic ? 'التصنيف: ' : 'Category: '} {request.expenseCategory}</span>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">{isArabic ? 'تاريخ الاستحقاق' : 'Required Date'}</span>
                  <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{request.requiredDate}</span>
                  </div>
                  <span className="text-xs text-slate-400 block">{isArabic ? 'تاريخ التقديم: ' : 'Request Date: '} {new Date(request.requestDate).toLocaleDateString('ar-JO')}</span>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">{isArabic ? 'المستفيد والقسم' : 'Requester & Dept'}</span>
                  <div className="text-sm font-bold text-slate-200">{request.requesterName}</div>
                  <span className="text-xs text-slate-400 block">{request.department}</span>
                </div>
              </div>

              {/* Purpose & Description */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {isArabic ? 'الغاية من صرف النثريات:' : 'Purpose of Expense:'}
                  </h4>
                  <p className="text-sm text-slate-200 font-medium leading-relaxed">{request.purpose}</p>
                </div>

                {request.description && (
                  <div className="pt-3 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {isArabic ? 'تفاصيل إضافية:' : 'Additional Details:'}
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{request.description}</p>
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span>{isArabic ? 'المرفقات والفواتير' : 'Attachments & Receipts'}</span>
                  </h4>
                  <label className="cursor-pointer px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'إضافة مرفق' : 'Attach File'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'receipt')}
                    />
                  </label>
                </div>

                {(!request.attachments || request.attachments.length === 0) && !receiptAttachmentUrl ? (
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
                          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="text-slate-200 truncate font-medium">{att.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </a>
                    ))}
                    {receiptAttachmentUrl && (
                      <a
                        href={receiptAttachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-700/60 rounded-lg text-xs transition"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Receipt className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-indigo-200 truncate font-medium">
                            {isArabic ? 'ملف الإيصال المرفق' : 'Receipt Document'}
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
            <div className="space-y-4">
              {/* 1. Approval Stage */}
              <div className={`p-4 rounded-xl border ${
                request.approval ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-800/30 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    {isArabic ? '1. الاعتماد المالي والموافقة' : '1. Management Approval'}
                  </span>
                  {request.approval?.approvalDate && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(request.approval.approvalDate).toLocaleDateString('ar-JO')}
                    </span>
                  )}
                </div>
                {request.approval ? (
                  <div className="text-xs text-slate-300 space-y-1">
                    <p>{isArabic ? 'معتمد بواسطة: ' : 'Approved by: '} <strong className="text-slate-100">{request.approval.approvedByName}</strong></p>
                    <p>{isArabic ? 'المبلغ المعتمد: ' : 'Approved Amount: '} <strong className="text-emerald-400">{request.approval.approvedAmount} {request.currency}</strong></p>
                    {request.approval.approvalNotes && <p className="text-slate-400">{isArabic ? 'ملاحظات: ' : 'Notes: '} {request.approval.approvalNotes}</p>}
                    {request.approval.rejectionReason && <p className="text-rose-400">{isArabic ? 'سبب الرفض: ' : 'Rejection Reason: '} {request.approval.rejectionReason}</p>}
                    {request.approval.returnedChangesNotes && <p className="text-orange-400">{isArabic ? 'ملاحظات التعديل: ' : 'Change Notes: '} {request.approval.returnedChangesNotes}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{isArabic ? 'بانتظار موافقة الإدارة' : 'Pending approval'}</p>
                )}
              </div>

              {/* 2. Disbursement Stage */}
              <div className={`p-4 rounded-xl border ${
                request.disbursement ? 'bg-blue-950/20 border-blue-500/30' : 'bg-slate-800/30 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-blue-400" />
                    {isArabic ? '2. الصرف الفعلي من الصندوق' : '2. Cash Disbursement'}
                  </span>
                  {request.disbursement?.disbursedDate && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(request.disbursement.disbursedDate).toLocaleDateString('ar-JO')}
                    </span>
                  )}
                </div>
                {request.disbursement ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>{isArabic ? 'القائم بالصرف: ' : 'Disbursed By: '} <strong className="text-slate-100">{request.disbursement.disbursedByName}</strong></div>
                    <div>{isArabic ? 'المستلم: ' : 'Recipient: '} <strong className="text-slate-100">{request.disbursement.recipient}</strong></div>
                    <div>{isArabic ? 'المبلغ المصروف: ' : 'Disbursed Amount: '} <strong className="text-blue-300">{request.disbursement.actualAmount} {request.currency}</strong></div>
                    <div>{isArabic ? 'سند الصرف: ' : 'Voucher Ref: '} <strong className="font-mono text-blue-300">{request.disbursement.cashReference}</strong></div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{isArabic ? 'لم يتم صرف النقدية بعد' : 'Cash not yet disbursed'}</p>
                )}
              </div>

              {/* 3. Receipt Upload Stage */}
              <div className={`p-4 rounded-xl border ${
                request.receipt ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-slate-800/30 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-indigo-400" />
                    {isArabic ? '3. فواتير وإيصالات المشتريات المرفقة' : '3. Expense Receipts'}
                  </span>
                </div>
                {request.receipt ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>{isArabic ? 'رقم الإيصال: ' : 'Receipt #: '} <strong className="font-mono text-indigo-300">{request.receipt.receiptNumber}</strong></div>
                    <div>{isArabic ? 'المبلغ: ' : 'Amount: '} <strong className="text-indigo-300">{request.receipt.receiptAmount} {request.currency}</strong></div>
                    <div>{isArabic ? 'المورد: ' : 'Supplier: '} <strong>{request.receipt.supplier}</strong></div>
                    <div>
                      {request.receipt.attachmentUrl && (
                        <a href={request.receipt.attachmentUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1 font-bold">
                          <ExternalLink className="w-3.5 h-3.5" />
                          {isArabic ? 'عرض الإيصال' : 'View File'}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{isArabic ? 'بانتظار إرفاق الإيصالات والفواتير الضريبية' : 'Pending receipts upload'}</p>
                )}
              </div>

              {/* 4. Reconciliation & Return Stage */}
              <div className={`p-4 rounded-xl border ${
                request.reconciliation ? 'bg-teal-950/20 border-teal-500/30' : 'bg-slate-800/30 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-teal-400" />
                    {isArabic ? '4. تسوية السلفة وإرجاع المتبقي للصندوق' : '4. Settlement & Return'}
                  </span>
                  {request.reconciliation?.reconciledDate && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(request.reconciliation.reconciledDate).toLocaleDateString('ar-JO')}
                    </span>
                  )}
                </div>
                {request.reconciliation ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>{isArabic ? 'المصروف الفعلي: ' : 'Spent Amount: '} <strong className="text-slate-100">{request.reconciliation.spentAmount} {request.currency}</strong></div>
                    <div>{isArabic ? 'المبلغ المرجع للصندوق: ' : 'Returned Amount: '} <strong className="text-teal-300">{request.reconciliation.returnedAmount} {request.currency}</strong></div>
                    <div>{isArabic ? 'فارق العهدة: ' : 'Variance: '} <strong className="text-slate-100">{request.reconciliation.variance} {request.currency}</strong></div>
                    <div>{isArabic ? 'المسؤول عن التسوية: ' : 'Reconciled By: '} <strong>{request.reconciliation.reconciledByName}</strong></div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{isArabic ? 'لم تتم التسوية المالية بعد' : 'Settlement pending'}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {isArabic ? 'السجل التاريخي لسند النثريات:' : 'Audit Trail for Voucher:'}
              </h4>
              {isLoadingAudit ? (
                <div className="p-6 text-center text-xs text-slate-500">{isArabic ? 'جاري التحميل...' : 'Loading...'}</div>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 bg-slate-800/30 rounded-xl">{isArabic ? 'لا توجد سجلات تدقيق' : 'No audit logs'}</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-400">{log.action}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleString(isArabic ? 'ar-JO' : 'en-GB')}
                        </span>
                      </div>
                      <div className="text-slate-300 flex items-center gap-2">
                        <span>{isArabic ? 'المستخدم: ' : 'User: '} <strong>{log.userName}</strong> ({log.userRole})</span>
                        {log.newStatus && (
                          <span className="bg-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-200">
                            {log.newStatus}
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

          {/* Action Input Panels */}
          {activeAction === 'approve' && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-emerald-300">{isArabic ? 'اعتماد صرف سلفة النثريات' : 'Approve Petty Cash'}</h4>
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
                <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'ملاحظات الاعتماد' : 'Approval Notes'}</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  placeholder={isArabic ? 'توجيهات لأمين الصندوق...' : 'Notes for cashier...'}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveAction('none')} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs">
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" disabled={isSaving} onClick={handleExecuteApprove} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition">
                  {isSaving ? (isArabic ? 'جاري الاعتماد...' : 'Approving...') : (isArabic ? 'تأكيد الاعتماد' : 'Confirm Approval')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'reject' && (
            <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-rose-300">{isArabic ? 'رفض صرف النثريات' : 'Reject Petty Cash'}</h4>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'سبب الرفض (إلزامي)' : 'Rejection Reason (Required)'}</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  placeholder={isArabic ? 'توضيح سبب الرفض...' : 'Reason...'}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveAction('none')} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs">
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" disabled={isSaving} onClick={handleExecuteReject} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition">
                  {isSaving ? (isArabic ? 'جاري الرفض...' : 'Rejecting...') : (isArabic ? 'تأكيد الرفض' : 'Confirm Rejection')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'return' && (
            <div className="p-4 bg-orange-950/30 border border-orange-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-orange-300">{isArabic ? 'إرجاع السند للتعديل' : 'Return for Changes'}</h4>
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'الملاحظات والتعديل المطلوب' : 'Modification Notes'}</label>
                <textarea
                  value={returnComment}
                  onChange={(e) => setReturnComment(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  placeholder={isArabic ? 'توضيح سبب إرجاع السند...' : 'Modification details...'}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveAction('none')} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs">
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" disabled={isSaving} onClick={handleExecuteReturn} className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs transition">
                  {isSaving ? (isArabic ? 'جاري الإرجاع...' : 'Returning...') : (isArabic ? 'تأكيد الإرجاع' : 'Confirm Return')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'disburse' && (
            <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-blue-300">{isArabic ? 'صرف مبلغ السلفة نقداً من الصندوق' : 'Disburse Petty Cash'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'المبلغ المصروف' : 'Amount'}</label>
                  <input
                    type="number"
                    value={disbursedAmount}
                    onChange={(e) => setDisbursedAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'رقم سند الصرف' : 'Voucher Ref'}</label>
                  <input
                    type="text"
                    value={cashReference}
                    onChange={(e) => setCashReference(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'اسم المستلم' : 'Recipient'}</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'طريقة الصرف' : 'Payment Method'}</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="cash">{isArabic ? 'نقداً من الصندوق' : 'Cash from box'}</option>
                    <option value="transfer">{isArabic ? 'تحويل محفظة إلكترونية' : 'E-Wallet Transfer'}</option>
                    <option value="voucher">{isArabic ? 'سند صرف محاسبي' : 'Voucher'}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveAction('none')} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs">
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" disabled={isSaving} onClick={handleExecuteDisburse} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition">
                  {isSaving ? (isArabic ? 'جاري الصرف...' : 'Disbursing...') : (isArabic ? 'تأكيد الصرف' : 'Confirm Disbursement')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'receipt' && (
            <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-indigo-300">{isArabic ? 'إرفاق فواتير ومستندات الصرف' : 'Upload Expense Receipt'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'رقم الإيصال / الفاتورة' : 'Receipt #'}</label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    placeholder="REC-9876"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'المبلغ الفعلي المصروف' : 'Actual Amount'}</label>
                  <input
                    type="number"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'اسم المحل / المورد' : 'Supplier / Store'}</label>
                  <input
                    type="text"
                    value={receiptSupplier}
                    onChange={(e) => setReceiptSupplier(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'ملف الإيصال (صورة أو PDF)' : 'Receipt File'}</label>
                  <label className="cursor-pointer flex items-center justify-between p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 hover:border-indigo-500 transition">
                    <span className="truncate">{receiptAttachmentUrl ? (isArabic ? 'تم إرفاق الملف' : 'Attached') : (isArabic ? 'اختر ملف...' : 'Select file...')}</span>
                    <Upload className="w-4 h-4 text-indigo-400 shrink-0" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'receipt')}
                    />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveAction('none')} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs">
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isSaving || isUploadingFile || !receiptAttachmentUrl}
                  onClick={handleExecuteUploadReceipt}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition disabled:opacity-50"
                >
                  {isSaving ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الإيصال' : 'Save Receipt')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'reconcile' && (
            <div className="p-4 bg-teal-950/30 border border-teal-500/30 rounded-xl space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-teal-300">{isArabic ? 'تسوية السلفة وإرجاع المتبقي للصندوق' : 'Reconcile & Settle'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'المبلغ المصروف بموجب فواتير' : 'Spent Amount'}</label>
                  <input
                    type="number"
                    value={spentAmount}
                    onChange={(e) => setSpentAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'المبلغ المرجع للصندوق' : 'Returned Amount'}</label>
                  <input
                    type="number"
                    value={returnedAmount}
                    onChange={(e) => setReturnedAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-300 font-medium block mb-1">{isArabic ? 'رقم سند استلام المتبقي بالصندوق' : 'Return Voucher Ref'}</label>
                  <input
                    type="text"
                    value={returnReference}
                    onChange={(e) => setReturnReference(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    placeholder="RV-2026-0012"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveAction('none')} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs">
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" disabled={isSaving} onClick={handleExecuteReconcile} className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs transition">
                  {isSaving ? (isArabic ? 'جاري التسوية...' : 'Reconciling...') : (isArabic ? 'تأكيد التسوية' : 'Confirm Settlement')}
                </button>
              </div>
            </div>
          )}

          {activeAction === 'delete' && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span>{isArabic ? 'تأكيد حذف سند النثريات نهائياً' : 'Confirm Deletion'}</span>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                {isAdmin
                  ? isArabic
                    ? 'بصفتك مديراً للنظام، سيتم حذف سند النثريات نهائياً مع توثيق العملية في سجل التدقيق.'
                    : 'As administrator, this voucher will be permanently deleted with audit logging.'
                  : isArabic
                  ? 'سيتم حذف مسودة سند النثريات الخاصة بك.'
                  : 'Your draft voucher will be deleted.'}
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveAction('none')} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs">
                  {isArabic ? 'تراجع' : 'Cancel'}
                </button>
                <button type="button" disabled={isSaving} onClick={handleExecuteDelete} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition">
                  {isSaving ? (isArabic ? 'جاري الحذف...' : 'Deleting...') : (isArabic ? 'تأكيد الحذف' : 'Confirm Delete')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => setActiveAction('delete')}
                className="px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/50 rounded-xl transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isArabic ? 'حذف السند' : 'Delete'}</span>
              </button>
            )}

            {request.status !== 'closed' && request.status !== 'cancelled' && (isOwner || isAdmin) && (
              <button
                type="button"
                onClick={handleExecuteCancel}
                className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                {isArabic ? 'إلغاء السند' : 'Cancel Voucher'}
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-900/30"
              >
                <Send className="w-4 h-4 rtl:rotate-180" />
                <span>{isArabic ? 'تقديم للاعتماد' : 'Submit for Approval'}</span>
              </button>
            )}

            {/* 2. If Pending Approval: Admin Actions */}
            {isAdmin && request.status === 'pending_approval' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveAction('return')}
                  className="px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-600/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isArabic ? 'إرجاع للتعديل' : 'Return for Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('reject')}
                  className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isArabic ? 'رفض السند' : 'Reject'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('approve')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isArabic ? 'اعتماد الصرف' : 'Approve'}</span>
                </button>
              </>
            )}

            {/* 3. If Approved: Admin Disburses Cash */}
            {isAdmin && request.status === 'approved' && (
              <button
                type="button"
                onClick={() => setActiveAction('disburse')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-900/30"
              >
                <Banknote className="w-4 h-4" />
                <span>{isArabic ? 'تسجيل صرف النقدية' : 'Disburse Cash'}</span>
              </button>
            )}

            {/* 4. If Cash Disbursed / Receipt Pending: Upload Receipt */}
            {(request.status === 'cash_disbursed' || request.status === 'receipt_pending') && (
              <button
                type="button"
                onClick={() => setActiveAction('receipt')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-indigo-900/30"
              >
                <Receipt className="w-4 h-4" />
                <span>{isArabic ? 'إرفاق فواتير المصروفات' : 'Upload Receipts'}</span>
              </button>
            )}

            {/* 5. If Receipt Uploaded: Admin Reconcile */}
            {isAdmin && (request.status === 'receipt_uploaded' || request.status === 'under_review') && (
              <button
                type="button"
                onClick={() => setActiveAction('reconcile')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-teal-900/30"
              >
                <Coins className="w-4 h-4" />
                <span>{isArabic ? 'تسوية السلفة والمتبقي' : 'Reconcile & Settle'}</span>
              </button>
            )}

            {/* 6. If Reconciled: Admin Close */}
            {isAdmin && request.status === 'reconciled' && (
              <button
                type="button"
                onClick={handleExecuteClose}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
              >
                <Archive className="w-4 h-4" />
                <span>{isArabic ? 'إغلاق وأرشفة السند' : 'Close Voucher'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
