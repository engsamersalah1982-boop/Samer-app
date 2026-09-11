import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  Edit,
  Trash2,
  BarChart3,
  Layers,
  DollarSign,
  TrendingUp,
  Sliders,
  ChevronDown,
  RefreshCw,
  Eye,
  Building,
} from 'lucide-react';
import { PurchaseRequest, PettyCashRequest, ProcurementCategory } from '../../types';
import { procurementService } from '../../services/procurementService';
import { printPurchaseRequest, printPettyCashRequest, printProcurementReport, printPettyCashReport } from '../../utils/printUtils';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { PurchaseRequestFormModal } from './PurchaseRequestFormModal';
import { PettyCashFormModal } from './PettyCashFormModal';
import { PurchaseDetailsModal } from './PurchaseDetailsModal';
import { PettyCashDetailsModal } from './PettyCashDetailsModal';

export const ProcurementModule: React.FC = () => {
  const { isArabic, t } = useLanguage();
  const { currentUser, isAdmin } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'purchases' | 'pettyCash' | 'overview' | 'categories'>('purchases');

  // Data
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [pettyCashList, setPettyCashList] = useState<PettyCashRequest[]>([]);
  const [categories, setCategories] = useState<ProcurementCategory[]>([]);

  // Modals state
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRequest | null>(null);

  const [showPettyCashForm, setShowPettyCashForm] = useState(false);
  const [editingPettyCash, setEditingPettyCash] = useState<PettyCashRequest | null>(null);

  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRequest | null>(null);
  const [selectedPettyCash, setSelectedPettyCash] = useState<PettyCashRequest | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlyMyRequests, setOnlyMyRequests] = useState(false);

  // New Category Input (Admin)
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newCatNameEn, setNewCatNameEn] = useState('');

  // Load and subscribe to updates
  const loadData = async (syncBackend = false) => {
    setPurchases(procurementService.getPurchaseRequests());
    setPettyCashList(procurementService.getPettyCashRequests());
    setCategories(procurementService.getCategories());

    if (syncBackend) {
      try {
        await procurementService.syncFromBackend();
        setPurchases(procurementService.getPurchaseRequests());
        setPettyCashList(procurementService.getPettyCashRequests());
        setCategories(procurementService.getCategories());
      } catch {
        // Keep state loaded from local cache
      }
    }
  };

  useEffect(() => {
    loadData(true);
    const unsubscribe = procurementService.subscribe(() => {
      loadData(false);
    });
    return () => unsubscribe();
  }, [isAdmin, currentUser]);

  // Statistics Calculation
  const pendingPurchases = purchases.filter(
    (p) => p.status === 'submitted' || p.status === 'pending_approval' || (p.status as string) === 'pending'
  );
  const approvedPurchases = purchases.filter((p) => p.status === 'approved' || p.status === 'purchased');
  const receivedPurchases = purchases.filter(
    (p) =>
      p.status === 'received' ||
      p.status === 'invoice_uploaded' ||
      p.status === 'reconciled' ||
      p.status === 'closed'
  );
  const urgentPurchases = purchases.filter(
    (p) => p.priority === 'urgent' && p.status !== 'closed' && p.status !== 'cancelled' && p.status !== 'rejected'
  );

  const pendingPettyCash = pettyCashList.filter(
    (c) => c.status === 'submitted' || c.status === 'pending_approval' || (c.status as string) === 'pending'
  );
  const disbursedPettyCash = pettyCashList.filter(
    (c) =>
      c.status === 'disbursed' ||
      c.status === 'receipt_pending' ||
      (c.status as string) === 'cash_disbursed' ||
      c.status === 'receipt_uploaded' ||
      c.status === 'reconciled' ||
      c.status === 'closed'
  );
  const totalPettyCashAmount = pettyCashList
    .filter((c) => c.status !== 'rejected' && c.status !== 'cancelled')
    .reduce((sum, item) => sum + item.amount, 0);

  // Filtered Purchases
  const filteredPurchases = purchases.filter((p) => {
    if (!isAdmin && p.requesterId !== currentUser?.id) return false;
    if (isAdmin && onlyMyRequests && p.requesterId !== currentUser?.id) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_approval') {
        if (p.status !== 'pending_approval' && p.status !== 'submitted' && (p.status as string) !== 'pending') return false;
      } else if (p.status !== statusFilter) {
        return false;
      }
    }
    if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${p.requestNumber} ${p.itemDescription} ${p.requesterName} ${p.department} ${p.category} ${p.relatedEquipmentName || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  // Filtered Petty Cash
  const filteredPettyCash = pettyCashList.filter((pc) => {
    if (!isAdmin && pc.requesterId !== currentUser?.id) return false;
    if (isAdmin && onlyMyRequests && pc.requesterId !== currentUser?.id) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_approval') {
        if (pc.status !== 'pending_approval' && pc.status !== 'submitted' && (pc.status as string) !== 'pending') return false;
      } else if (statusFilter === 'disbursed' || statusFilter === 'cash_disbursed') {
        if (pc.status !== 'disbursed' && pc.status !== 'receipt_pending' && (pc.status as string) !== 'cash_disbursed') return false;
      } else if (pc.status !== statusFilter) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${pc.requestNumber} ${pc.purpose} ${pc.requesterName} ${pc.expenseCategory}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const handleDeletePurchase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(isArabic ? 'هل أنت متأكد من رغبتك في حذف طلب الشراء؟' : 'Are you sure to delete this request?')) {
      try {
        await procurementService.deletePurchaseRequest(id, currentUser || undefined);
        loadData();
      } catch (err: any) {
        alert(err.message || 'Error deleting request');
      }
    }
  };

  const handleDeletePettyCash = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(isArabic ? 'هل أنت متأكد من حذف سند النثريات؟' : 'Are you sure to delete this voucher?')) {
      try {
        await procurementService.deletePettyCashRequest(id, currentUser || undefined);
        loadData();
      } catch (err: any) {
        alert(err.message || 'Error deleting petty cash');
      }
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameAr.trim()) return;
    procurementService.addCategory(newCatNameAr.trim(), newCatNameEn.trim() || newCatNameAr.trim());
    setNewCatNameAr('');
    setNewCatNameEn('');
    setCategories(procurementService.getCategories());
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 end-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
              <Building className="w-3.5 h-3.5" />
              <span>{isArabic ? 'شركة الغاز الحيوي الأردنية (JBC)' : 'Jordan Biogas Company'}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">{isArabic ? 'محطة مكب الغباوي' : 'Al-Ghabawi Plant'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <ShoppingBag className="w-6 h-6" />
              </span>
              <span>{isArabic ? 'المشتريات والنثريات' : 'Procurement & Petty Cash'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {isArabic
                ? 'إدارة طلبات الشراء الداخلية، سندات صرف النثريات، والتحقق التلقائي لمنع ازدواجية الطلبات'
                : 'Manage internal requisitions, petty cash disbursements & prevent duplicate ordering'}
            </p>
          </div>

          {/* Quick Create Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                if (activeTab === 'pettyCash') {
                  printPettyCashReport(filteredPettyCash);
                } else {
                  printProcurementReport(filteredPurchases);
                }
              }}
              className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md"
              title={isArabic ? 'طباعة تقرير الكشف الحالي' : 'Print current report'}
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>{isArabic ? 'طباعة تقرير' : 'Print Report'}</span>
            </button>

            <button
              onClick={() => {
                setEditingPurchase(null);
                setShowPurchaseForm(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-bold transition shadow-lg shadow-emerald-900/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isArabic ? 'طلب شراء داخلي' : 'New Purchase Requisition'}</span>
            </button>

            <button
              onClick={() => {
                setEditingPettyCash(null);
                setShowPettyCashForm(true);
              }}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs sm:text-sm font-bold transition shadow-lg shadow-sky-900/30 flex items-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>{isArabic ? 'صرف نثريات' : 'New Petty Cash'}</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 sm:p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>{isArabic ? 'طلبات بانتظار الاعتماد' : 'Pending Requests'}</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-400 mt-1">
              {pendingPurchases.length + pendingPettyCash.length}
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 sm:p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>{isArabic ? 'طلبات قيد التوريد / معتمدة' : 'Approved / In PO'}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">
              {approvedPurchases.length}
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 sm:p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>{isArabic ? 'طلبات شراء طارئة' : 'Urgent Requests'}</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-400 mt-1">
              {urgentPurchases.length}
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 sm:p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>{isArabic ? 'إجمالي النثريات النشطة' : 'Petty Cash Total'}</span>
              <DollarSign className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-sky-400 mt-1">
              {totalPettyCashAmount.toLocaleString()} <span className="text-xs font-normal">JOD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'purchases'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
              : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{isArabic ? 'طلبات الشراء الداخلية' : 'Purchase Requisitions'}</span>
          <span className="text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/50">
            {purchases.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pettyCash')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'pettyCash'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
              : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{isArabic ? 'سندات صرف النثريات' : 'Petty Cash Vouchers'}</span>
          <span className="text-[11px] bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-700/50">
            {pettyCashList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
              : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{isArabic ? 'المؤشرات والتحليلات' : 'Analytics & Trends'}</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isArabic ? 'التصنيفات الفنية' : 'Technical Categories'}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar for Purchases and Petty Cash */}
      {(activeTab === 'purchases' || activeTab === 'pettyCash') && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'purchases'
                    ? isArabic ? 'بحث برقم الطلب، اسم المادة، مقدم الطلب، التصنيف...' : 'Search by item, requisition #, requester...'
                    : isArabic ? 'بحث برقم السند، الغاية من الصرف، مقدم الطلب...' : 'Search by purpose, voucher #, requester...'
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl ps-9 pe-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">{isArabic ? 'كافة الحالات' : 'All Statuses'}</option>
                <option value="draft">{isArabic ? 'مسودة' : 'Draft'}</option>
                <option value="pending_approval">{isArabic ? 'قيد الاعتماد' : 'Pending Approval'}</option>
                <option value="approved">{isArabic ? 'معتمد' : 'Approved'}</option>
                {activeTab === 'purchases' && (
                  <>
                    <option value="purchased">{isArabic ? 'تم الشراء' : 'Purchased'}</option>
                    <option value="received">{isArabic ? 'تم الاستلام' : 'Received'}</option>
                    <option value="invoice_uploaded">{isArabic ? 'الفاتورة مرفقة' : 'Invoice Attached'}</option>
                    <option value="reconciled">{isArabic ? 'تمت التسوية' : 'Reconciled'}</option>
                    <option value="closed">{isArabic ? 'مغلق ومؤرشف' : 'Closed'}</option>
                  </>
                )}
                {activeTab === 'pettyCash' && (
                  <>
                    <option value="disbursed">{isArabic ? 'تم الصرف نقداً / بانتظار الفاتورة' : 'Disbursed / Pending Receipt'}</option>
                    <option value="receipt_uploaded">{isArabic ? 'تم رفع الفاتورة' : 'Receipt Attached'}</option>
                    <option value="reconciled">{isArabic ? 'تمت التسوية' : 'Reconciled'}</option>
                    <option value="closed">{isArabic ? 'مغلق ومؤرشف' : 'Closed'}</option>
                  </>
                )}
                <option value="returned_for_changes">{isArabic ? 'مُعاد للتعديل' : 'Returned for Changes'}</option>
                <option value="rejected">{isArabic ? 'مرفوض' : 'Rejected'}</option>
              </select>

              {activeTab === 'purchases' && (
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">{isArabic ? 'كافة الأولويات' : 'All Priorities'}</option>
                  <option value="urgent">{isArabic ? 'طارئة جداً' : 'Urgent'}</option>
                  <option value="high">{isArabic ? 'عالية' : 'High'}</option>
                  <option value="medium">{isArabic ? 'متوسطة' : 'Medium'}</option>
                  <option value="normal">{isArabic ? 'عادية' : 'Normal'}</option>
                </select>
              )}

              {/* View My Requests vs All Requests */}
              <button
                onClick={() => setOnlyMyRequests(!onlyMyRequests)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition border whitespace-nowrap ${
                  onlyMyRequests
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {onlyMyRequests ? (isArabic ? 'طلباتي فقط' : 'My Requests') : (isArabic ? 'كافة الطلبات' : 'All Requests')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: PURCHASE REQUESTS LIST */}
      {activeTab === 'purchases' && (
        <div className="space-y-3">
          {filteredPurchases.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">
                {isArabic ? 'لا توجد طلبات شراء مطابقة' : 'No Purchase Requests Found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isArabic
                  ? 'يمكنك تقديم طلب شراء داخلي جديد بالنقر على زر "طلب شراء داخلي" أعلاه.'
                  : 'You can submit a new internal requisition by clicking the button above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredPurchases.map((pr) => {
                const canEditPr =
                  isAdmin ||
                  (pr.requesterId === currentUser?.id &&
                    (pr.status === 'draft' || pr.status === 'returned_for_changes'));
                const canDeletePr =
                  isAdmin ||
                  (pr.requesterId === currentUser?.id && pr.status === 'draft');

                const getStatusStyle = () => {
                  switch (pr.status) {
                    case 'draft':
                      return 'bg-slate-800 text-slate-300 border-slate-700';
                    case 'approved':
                    case 'purchased':
                    case 'received':
                    case 'invoice_uploaded':
                    case 'reconciled':
                    case 'closed':
                      return 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50';
                    case 'rejected':
                      return 'bg-rose-900/50 text-rose-300 border-rose-700/50';
                    case 'returned_for_changes':
                      return 'bg-orange-900/50 text-orange-300 border-orange-700/50';
                    default:
                      return 'bg-amber-900/50 text-amber-300 border-amber-700/50';
                  }
                };

                const getStatusText = () => {
                  switch (pr.status) {
                    case 'draft':
                      return isArabic ? 'مسودة' : 'Draft';
                    case 'pending_approval':
                    case 'submitted':
                    case 'pending':
                      return isArabic ? 'قيد الاعتماد' : 'Pending Approval';
                    case 'approved':
                      return isArabic ? 'معتمد' : 'Approved';
                    case 'purchased':
                      return isArabic ? 'تم الشراء' : 'Purchased';
                    case 'received':
                      return isArabic ? 'تم الاستلام' : 'Received';
                    case 'invoice_uploaded':
                      return isArabic ? 'الفاتورة مرفقة' : 'Invoice Attached';
                    case 'reconciled':
                      return isArabic ? 'تمت التسوية' : 'Reconciled';
                    case 'closed':
                      return isArabic ? 'مغلق ومؤرشف' : 'Closed';
                    case 'rejected':
                      return isArabic ? 'مرفوض' : 'Rejected';
                    case 'returned_for_changes':
                      return isArabic ? 'مُعاد للتعديل' : 'Returned';
                    default:
                      return pr.status;
                  }
                };

                return (
                  <div
                    key={pr.id}
                    onClick={() => setSelectedPurchase(pr)}
                    className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition cursor-pointer shadow-md group relative"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                            {pr.requestNumber}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusStyle()}`}>
                            {getStatusText()}
                          </span>

                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                              pr.priority === 'urgent'
                                ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                                : pr.priority === 'high'
                                ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {pr.priority === 'urgent'
                              ? isArabic ? 'طارئة جداً' : 'Urgent'
                              : pr.priority === 'high'
                              ? isArabic ? 'عالية' : 'High'
                              : pr.priority === 'medium'
                              ? isArabic ? 'متوسطة' : 'Medium'
                              : isArabic ? 'عادية' : 'Normal'}
                          </span>

                          <span className="text-xs text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded">
                            {pr.category}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition">
                          {pr.itemDescription}
                        </h3>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {pr.justification}
                        </p>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 pt-1">
                          <div>
                            <span className="text-slate-500">{isArabic ? 'مقدم الطلب: ' : 'Requester: '}</span>
                            <span className="text-slate-300 font-medium">{pr.requesterName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">{isArabic ? 'التاريخ المطلوب: ' : 'Required: '}</span>
                            <span className="text-slate-300">{pr.requiredDate}</span>
                          </div>
                          {pr.relatedEquipmentName && (
                            <div>
                              <span className="text-slate-500">{isArabic ? 'المعدة: ' : 'Equipment: '}</span>
                              <span className="text-emerald-400">{pr.relatedEquipmentName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side: Amount & Actions */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 shrink-0">
                        <div className="text-start sm:text-end">
                          <div className="text-sm sm:text-base font-black text-emerald-400">
                            {pr.quantity} <span className="text-xs text-slate-400 font-normal">{pr.unit}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-300">
                            {pr.estimatedTotal.toLocaleString()} {pr.currency}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              printPurchaseRequest(pr, isAdmin);
                            }}
                            title={isArabic ? 'طباعة الطلب' : 'Print'}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {canEditPr && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPurchase(pr);
                                setShowPurchaseForm(true);
                              }}
                              title={isArabic ? 'تعديل الطلب' : 'Edit'}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDeletePr && (
                            <button
                              onClick={(e) => handleDeletePurchase(pr.id, e)}
                              title={isArabic ? 'حذف الطلب' : 'Delete'}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PETTY CASH LIST */}
      {activeTab === 'pettyCash' && (
        <div className="space-y-3">
          {filteredPettyCash.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
              <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">
                {isArabic ? 'لا توجد سندات صرف نثريات' : 'No Petty Cash Vouchers'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isArabic
                  ? 'يمكنك إنشاء سند صرف نثريات مستعجل بالنقر على زر "صرف نثريات" أعلاه.'
                  : 'You can submit a petty cash voucher by clicking above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredPettyCash.map((pc) => {
                const canEditPc =
                  isAdmin ||
                  (pc.requesterId === currentUser?.id &&
                    (pc.status === 'draft' || pc.status === 'returned_for_changes'));
                const canDeletePc =
                  isAdmin ||
                  (pc.requesterId === currentUser?.id && pc.status === 'draft');

                const getPcStatusStyle = () => {
                  switch (pc.status) {
                    case 'draft':
                      return 'bg-slate-800 text-slate-300 border-slate-700';
                    case 'approved':
                    case 'cash_disbursed':
                    case 'disbursed':
                    case 'receipt_uploaded':
                    case 'reconciled':
                    case 'closed':
                      return 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50';
                    case 'rejected':
                      return 'bg-rose-900/50 text-rose-300 border-rose-700/50';
                    case 'returned_for_changes':
                      return 'bg-orange-900/50 text-orange-300 border-orange-700/50';
                    default:
                      return 'bg-amber-900/50 text-amber-300 border-amber-700/50';
                  }
                };

                const getPcStatusText = () => {
                  switch (pc.status) {
                    case 'draft':
                      return isArabic ? 'مسودة' : 'Draft';
                    case 'pending_approval':
                    case 'submitted':
                    case 'pending':
                      return isArabic ? 'قيد الاعتماد' : 'Pending';
                    case 'approved':
                      return isArabic ? 'معتمد' : 'Approved';
                    case 'cash_disbursed':
                    case 'disbursed':
                      return isArabic ? 'تم الصرف نقداً' : 'Disbursed';
                    case 'receipt_uploaded':
                      return isArabic ? 'تم رفع الفاتورة' : 'Receipt Attached';
                    case 'reconciled':
                      return isArabic ? 'تمت التسوية' : 'Reconciled';
                    case 'closed':
                      return isArabic ? 'مغلق ومؤرشف' : 'Closed';
                    case 'rejected':
                      return isArabic ? 'مرفوض' : 'Rejected';
                    case 'returned_for_changes':
                      return isArabic ? 'مُعاد للتعديل' : 'Returned';
                    default:
                      return pc.status;
                  }
                };

                return (
                  <div
                    key={pc.id}
                    onClick={() => setSelectedPettyCash(pc)}
                    className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition cursor-pointer shadow-md group relative"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/50">
                            {pc.requestNumber}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getPcStatusStyle()}`}>
                            {getPcStatusText()}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded">
                            {pc.expenseCategory}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-sky-300 transition">
                          {pc.purpose}
                        </h3>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 pt-1">
                          <div>
                            <span className="text-slate-500">{isArabic ? 'الموظف: ' : 'Beneficiary: '}</span>
                            <span className="text-slate-300 font-medium">{pc.requesterName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">{isArabic ? 'تاريخ السند: ' : 'Date: '}</span>
                            <span className="text-slate-300">
                              {new Date(pc.requestDate).toLocaleDateString(isArabic ? 'ar-JO' : 'en-GB')}
                            </span>
                          </div>
                          {pc.relatedEquipmentName && (
                            <div>
                              <span className="text-slate-500">{isArabic ? 'المعدة: ' : 'Equipment: '}</span>
                              <span className="text-sky-400">{pc.relatedEquipmentName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side: Amount and actions */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 shrink-0">
                        <div className="text-start sm:text-end">
                          <div className="text-lg sm:text-xl font-black text-sky-400">
                            {pc.amount.toFixed(2)} <span className="text-xs font-normal text-slate-400">{pc.currency}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              printPettyCashRequest(pc, isAdmin);
                            }}
                            title={isArabic ? 'طباعة السند' : 'Print'}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {canEditPc && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPettyCash(pc);
                                setShowPettyCashForm(true);
                              }}
                              title={isArabic ? 'تعديل' : 'Edit'}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDeletePc && (
                            <button
                              onClick={(e) => handleDeletePettyCash(pc.id, e)}
                              title={isArabic ? 'حذف' : 'Delete'}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANALYTICS & OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purchase Requests by Category */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>{isArabic ? 'طلبات الشراء حسب التصنيف الفني' : 'Purchases by Category'}</span>
              </h3>
              <div className="space-y-3">
                {categories.map((cat) => {
                  const count = purchases.filter((p) => p.category === cat.nameAr).length;
                  const total = purchases.length || 1;
                  const percentage = Math.round((count / total) * 100);

                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{cat.nameAr}</span>
                        <span className="text-slate-400">
                          {count} {isArabic ? 'طلب' : 'reqs'} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Procurement Status Breakdown */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>{isArabic ? 'حالة دورة التوريد والاستلام' : 'Procurement Cycle Status'}</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-2xl text-center">
                  <div className="text-xs text-amber-300 font-semibold">{isArabic ? 'قيد المتابعة' : 'Pending'}</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{pendingPurchases.length}</div>
                </div>
                <div className="p-4 bg-blue-950/30 border border-blue-800/40 rounded-2xl text-center">
                  <div className="text-xs text-blue-300 font-semibold">{isArabic ? 'معتمد / تم الشراء' : 'Approved / PO'}</div>
                  <div className="text-2xl font-black text-blue-400 mt-1">{approvedPurchases.length}</div>
                </div>
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl text-center">
                  <div className="text-xs text-emerald-300 font-semibold">{isArabic ? 'تم الاستلام بالمستودع' : 'Received'}</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{receivedPurchases.length}</div>
                </div>
                <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-2xl text-center">
                  <div className="text-xs text-rose-300 font-semibold">{isArabic ? 'مرفوض' : 'Rejected'}</div>
                  <div className="text-2xl font-black text-rose-400 mt-1">
                    {purchases.filter((p) => p.status === 'rejected').length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CATEGORIES MANAGEMENT (Admin) */}
      {activeTab === 'categories' && isAdmin && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>{isArabic ? 'إدارة التصنيفات الفنية للمشتريات' : 'Procurement Categories'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isArabic
                  ? 'تصنيف المواد لتسهيل البحث ومنع تكرار طلبات قطع الغيار'
                  : 'Organize items to prevent duplicate requests'}
              </p>
            </div>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-slate-300">{isArabic ? 'إضافة تصنيف فني جديد:' : 'Add New Category:'}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newCatNameAr}
                onChange={(e) => setNewCatNameAr(e.target.value)}
                placeholder={isArabic ? 'اسم التصنيف بالعربية (مثال: محابس وصمامات غاز)' : 'Category Name (Arabic)'}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={newCatNameEn}
                onChange={(e) => setNewCatNameEn(e.target.value)}
                placeholder={isArabic ? 'الاسم بالإنجليزية (اختياري)' : 'English Name (Optional)'}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isArabic ? 'إضافة التصنيف' : 'Add Category'}</span>
              </button>
            </div>
          </form>

          {/* Category List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">{cat.nameAr}</div>
                  <div className="text-[11px] text-slate-400">{cat.nameEn}</div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  {purchases.filter((p) => p.category === cat.nameAr).length} {isArabic ? 'طلب' : 'items'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Purchase Request Form Modal */}
      <PurchaseRequestFormModal
        isOpen={showPurchaseForm}
        onClose={() => {
          setShowPurchaseForm(false);
          setEditingPurchase(null);
        }}
        onSuccess={() => {
          loadData();
        }}
        existingRequest={editingPurchase}
      />

      {/* 2. Petty Cash Form Modal */}
      <PettyCashFormModal
        isOpen={showPettyCashForm}
        onClose={() => {
          setShowPettyCashForm(false);
          setEditingPettyCash(null);
        }}
        onSuccess={() => {
          loadData();
        }}
        existingRequest={editingPettyCash}
      />

      {/* 3. Purchase Details Modal */}
      {selectedPurchase && (
        <PurchaseDetailsModal
          isOpen={!!selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          request={selectedPurchase}
          onRefresh={() => {
            loadData();
            // refresh active modal view data
            const updated = procurementService.getPurchaseRequests({ includeDeleted: true }).find((p) => p.id === selectedPurchase.id);
            if (updated) setSelectedPurchase(updated);
          }}
          onEdit={(req) => {
            setEditingPurchase(req);
            setShowPurchaseForm(true);
          }}
        />
      )}

      {/* 4. Petty Cash Details Modal */}
      {selectedPettyCash && (
        <PettyCashDetailsModal
          isOpen={!!selectedPettyCash}
          onClose={() => setSelectedPettyCash(null)}
          request={selectedPettyCash}
          onRefresh={() => {
            loadData();
            const updated = procurementService.getPettyCashRequests({ includeDeleted: true }).find((c) => c.id === selectedPettyCash.id);
            if (updated) setSelectedPettyCash(updated);
          }}
          onEdit={(req) => {
            setEditingPettyCash(req);
            setShowPettyCashForm(true);
          }}
        />
      )}
    </div>
  );
};
