import React from 'react';
import { AlertTriangle, Clock, User, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { PurchaseRequest, PettyCashRequest } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  similarRequests: (PurchaseRequest | PettyCashRequest)[];
  itemTitle: string;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  similarRequests,
  itemTitle,
}) => {
  const { isArabic } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-amber-950/40 border-b border-amber-500/20 flex items-start gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-amber-300">
              {isArabic ? 'تنبيه: تم رصد طلبات مشابهة مسبقاً' : 'Warning: Similar Requests Detected'}
            </h3>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              {isArabic
                ? `هناك طلبات شراء أو نثريات مسجلة مسبقاً تطابق أو تشابه المادة "${itemTitle}". يرجى التحقق لتفادي تكرار الشراء أو الازدواجية غير المبررة.`
                : `There are existing requests closely matching "${itemTitle}". Please review to prevent unnecessary duplicates.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Similar Requests List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-800">
          <div className="text-xs font-semibold text-slate-400 px-1">
            {isArabic ? `الطلبات المماثلة (${similarRequests.length}):` : `Similar Requests (${similarRequests.length}):`}
          </div>

          {similarRequests.map((req) => {
            const isPurchase = 'itemDescription' in req;
            const title = isPurchase ? (req as PurchaseRequest).itemDescription : (req as PettyCashRequest).purpose;
            const amountStr = isPurchase
              ? `${(req as PurchaseRequest).quantity} ${(req as PurchaseRequest).unit} (${(req as PurchaseRequest).estimatedTotal} ${(req as PurchaseRequest).currency})`
              : `${(req as PettyCashRequest).amount} ${(req as PettyCashRequest).currency}`;

            return (
              <div
                key={req.id}
                className="pt-3 first:pt-0 p-3 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl transition"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                      {req.requestNumber}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                      {isPurchase ? (isArabic ? 'طلب شراء' : 'Purchase') : (isArabic ? 'نثريات' : 'Petty Cash')}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      req.status === 'approved' || req.status === 'purchased' || req.status === 'received'
                        ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                        : req.status === 'rejected'
                        ? 'bg-rose-900/50 text-rose-300 border border-rose-700/50'
                        : 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                    }`}
                  >
                    {req.status === 'approved'
                      ? isArabic ? 'معتمد' : 'Approved'
                      : req.status === 'purchased'
                      ? isArabic ? 'تم الشراء' : 'Purchased'
                      : req.status === 'received'
                      ? isArabic ? 'تم الاستلام' : 'Received'
                      : req.status === 'rejected'
                      ? isArabic ? 'مرفوض' : 'Rejected'
                      : isArabic ? 'قيد المتابعة' : 'Pending'}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-200 line-clamp-2 mb-2">
                  {title}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{req.requesterName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(req.requestDate).toLocaleDateString(isArabic ? 'ar-JO' : 'en-GB')}</span>
                  </div>
                  <div className="col-span-2 text-slate-300 font-medium pt-1 border-t border-slate-700/40">
                    {isArabic ? 'القيمة / الكمية: ' : 'Qty / Amount: '}
                    <span className="text-amber-300 font-bold">{amountStr}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700"
          >
            {isArabic ? 'إلغاء ومراجعة الطلب' : 'Review & Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition shadow-lg shadow-amber-900/30 flex items-center gap-1.5"
          >
            <span>{isArabic ? 'المتابعة وحفظ الطلب رغم التشابه' : 'Proceed & Submit Anyway'}</span>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
