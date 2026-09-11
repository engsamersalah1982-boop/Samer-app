import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Search,
  Filter,
  QrCode,
  Wrench,
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  Plus,
  Edit3,
  Trash2,
  X,
  Clock,
  MapPin,
  Barcode,
  Save,
  Shield,
  Eye,
  Settings2,
  Check,
  Zap,
} from 'lucide-react';
import { db } from '../../services/db';
import { Equipment, EquipmentStatus } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { QRCodeModal } from '../common/QRCodeModal';

interface EquipmentModuleProps {
  initialEquipmentId?: string | null;
  onShowQR?: (eq: Equipment) => void;
  onOpenQRScanner?: () => void;
  onNavigateToMaintenanceWithEquipment?: (equipmentId: string) => void;
  onSelectEquipmentForMaintenance?: (equipmentId: string) => void;
}

export const EquipmentModule: React.FC<EquipmentModuleProps> = ({
  initialEquipmentId,
  onShowQR,
  onOpenQRScanner,
  onNavigateToMaintenanceWithEquipment,
  onSelectEquipmentForMaintenance,
}) => {
  const { isArabic, t } = useLanguage();
  const { currentUser, canEditEquipment, canDeleteEquipment, isAdmin, canCreateWorkOrders } = useAuth();

  const [equipmentList, setEquipmentList] = useState<Equipment[]>(() => db.getEquipment());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [qrModalEquipment, setQrModalEquipment] = useState<Equipment | null>(null);
  const [viewDetailEquipment, setViewDetailEquipment] = useState<Equipment | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [hoursModalEquipment, setHoursModalEquipment] = useState<Equipment | null>(null);
  const [deleteConfirmEquipment, setDeleteConfirmEquipment] = useState<Equipment | null>(null);

  // Form states for Add / Edit
  const [formCode, setFormCode] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState<EquipmentStatus>('running');
  const [formOperatingHours, setFormOperatingHours] = useState<number>(0);
  const [formInstalledDate, setFormInstalledDate] = useState('');
  const [formSpecKey1, setFormSpecKey1] = useState('Power output');
  const [formSpecVal1, setFormSpecVal1] = useState('');
  const [formSpecKey2, setFormSpecKey2] = useState('Capacity');
  const [formSpecVal2, setFormSpecVal2] = useState('');

  // Quick Hours update state
  const [newOperatingHours, setNewOperatingHours] = useState<number>(0);
  const [newStatus, setNewStatus] = useState<EquipmentStatus>('running');

  const workOrders = db.getWorkOrders();

  // Handle auto-focusing on initialEquipmentId (from QR scan)
  useEffect(() => {
    if (initialEquipmentId) {
      const rawId = initialEquipmentId.split('_')[0].toLowerCase();
      const eq = equipmentList.find(
        (e) => e.id.toLowerCase() === rawId || e.code.toLowerCase() === rawId
      );
      if (eq) {
        setViewDetailEquipment(eq);
      }
    }
  }, [initialEquipmentId, equipmentList]);

  const refreshList = () => {
    setEquipmentList(db.getEquipment());
  };

  const filteredEquipment = equipmentList.filter((eq) => {
    const matchesStatus = statusFilter === 'all' || eq.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      eq.code.toLowerCase().includes(query) ||
      eq.nameAr.toLowerCase().includes(query) ||
      eq.nameEn.toLowerCase().includes(query) ||
      eq.location.toLowerCase().includes(query) ||
      eq.model.toLowerCase().includes(query) ||
      eq.serialNumber.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'running':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
      case 'under_maintenance':
        return 'bg-amber-950 text-amber-300 border-amber-500/40';
      case 'stopped':
        return 'bg-rose-950 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    const nextCodeNumber = equipmentList.length + 1;
    setFormCode(`JBC-EQ-${String(nextCodeNumber).padStart(2, '0')}`);
    setFormNameAr('');
    setFormNameEn('');
    setFormModel('');
    setFormSerialNumber('');
    setFormLocation('Al-Ghabawi Biogas Plant');
    setFormStatus('running');
    setFormOperatingHours(0);
    setFormInstalledDate(new Date().toISOString().split('T')[0]);
    setFormSpecKey1('Power kW');
    setFormSpecVal1('');
    setFormSpecKey2('Design Capacity');
    setFormSpecVal2('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormCode(eq.code);
    setFormNameAr(eq.nameAr);
    setFormNameEn(eq.nameEn);
    setFormModel(eq.model);
    setFormSerialNumber(eq.serialNumber);
    setFormLocation(eq.location);
    setFormStatus(eq.status);
    setFormOperatingHours(eq.operatingHours);
    setFormInstalledDate(eq.installedDate || new Date().toISOString().split('T')[0]);

    const specKeys = Object.keys(eq.specifications || {});
    setFormSpecKey1(specKeys[0] || 'Capacity');
    setFormSpecVal1(String(eq.specifications?.[specKeys[0]] || ''));
    setFormSpecKey2(specKeys[1] || 'Voltage');
    setFormSpecVal2(String(eq.specifications?.[specKeys[1]] || ''));
  };

  // Save New Asset
  const handleSaveNewAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formNameAr.trim()) return;

    const specs: Record<string, string | number> = {};
    if (formSpecKey1 && formSpecVal1) specs[formSpecKey1] = formSpecVal1;
    if (formSpecKey2 && formSpecVal2) specs[formSpecKey2] = formSpecVal2;

    db.createEquipment(
      {
        code: formCode.trim().toUpperCase(),
        nameAr: formNameAr.trim(),
        nameEn: formNameEn.trim() || formNameAr.trim(),
        model: formModel.trim() || 'Industrial Biogas Spec',
        serialNumber: formSerialNumber.trim() || `SN-${Date.now()}`,
        location: formLocation.trim() || 'Al-Ghabawi Plant',
        status: formStatus,
        operatingHours: Number(formOperatingHours) || 0,
        specifications: specs,
        qrCodeValue: formCode.trim().toUpperCase(),
        installedDate: formInstalledDate || new Date().toISOString().split('T')[0],
      },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'Admin'
    );

    refreshList();
    setIsAddModalOpen(false);
  };

  // Save Edit Asset
  const handleSaveEditAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment || !formCode.trim() || !formNameAr.trim()) return;

    const specs: Record<string, string | number> = {
      ...(editingEquipment.specifications || {}),
    };
    if (formSpecKey1 && formSpecVal1) specs[formSpecKey1] = formSpecVal1;
    if (formSpecKey2 && formSpecVal2) specs[formSpecKey2] = formSpecVal2;

    db.updateEquipment(
      editingEquipment.id,
      {
        code: formCode.trim().toUpperCase(),
        nameAr: formNameAr.trim(),
        nameEn: formNameEn.trim() || formNameAr.trim(),
        model: formModel.trim(),
        serialNumber: formSerialNumber.trim(),
        location: formLocation.trim(),
        status: formStatus,
        operatingHours: Number(formOperatingHours) || 0,
        specifications: specs,
        qrCodeValue: formCode.trim().toUpperCase(),
        installedDate: formInstalledDate,
      },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'Admin'
    );

    refreshList();
    setEditingEquipment(null);
    if (viewDetailEquipment?.id === editingEquipment.id) {
      setViewDetailEquipment(db.getEquipmentById(editingEquipment.id) || null);
    }
  };

  // Quick Update Hours
  const handleOpenHoursModal = (eq: Equipment) => {
    setHoursModalEquipment(eq);
    setNewOperatingHours(eq.operatingHours);
    setNewStatus(eq.status);
  };

  const handleSaveHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hoursModalEquipment) return;

    db.updateEquipmentHours(
      hoursModalEquipment.id,
      Number(newOperatingHours),
      newStatus,
      currentUser?.id || 'usr-user',
      currentUser?.nameAr || 'User'
    );

    refreshList();
    setHoursModalEquipment(null);
    if (viewDetailEquipment?.id === hoursModalEquipment.id) {
      setViewDetailEquipment(db.getEquipmentById(hoursModalEquipment.id) || null);
    }
  };

  // Delete Asset
  const handleDeleteConfirm = () => {
    if (!deleteConfirmEquipment) return;

    db.deleteEquipment(
      deleteConfirmEquipment.id,
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'Admin'
    );

    refreshList();
    setDeleteConfirmEquipment(null);
    if (viewDetailEquipment?.id === deleteConfirmEquipment.id) {
      setViewDetailEquipment(null);
    }
  };

  const handleCreateWorkOrder = (equipmentId: string) => {
    if (!canCreateWorkOrders) return;
    if (onNavigateToMaintenanceWithEquipment) {
      onNavigateToMaintenanceWithEquipment(equipmentId);
    } else if (onSelectEquipmentForMaintenance) {
      onSelectEquipmentForMaintenance(equipmentId);
    }
    setViewDetailEquipment(null);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* MWM 4.68 MWe Baseload Power Generation Station Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/60 border border-emerald-500/30 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-white">
                {isArabic
                  ? 'محطة توليد غاز المطامر الحيوية — تشغيل مستمر لمولدات MWM'
                  : 'Landfill Biogas Power Plant — Continuous MWM Generation'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500 text-slate-950 shadow-sm animate-pulse">
                4.68 MWe (3 × 1.56 MWe)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-500/40">
                {isArabic ? 'تشغيل مستمر 24/7' : '24/7 Baseload'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {isArabic
                ? '3 مولدات غاز ألمانية MWM TCG 2020 V16 بقدرة 1.56 ميجاواط كهربائي لكل مولد لتوليد طاقة مستمرة وتغذية شبكة الكهرباء الوطنية.'
                : '3 German MWM TCG 2020 V16 Biogas gensets producing 1.56 MWe each, delivering 4.68 MWe continuous baseload to the national grid.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-left md:text-right px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">
              {isArabic ? 'القدرة التشغيلية الفعالة' : 'Active Output'}
            </div>
            <div className="text-xs font-black text-emerald-400">4,680 kWe Continuous</div>
          </div>
        </div>
      </div>

      {/* Module Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-950 text-teal-400 border border-teal-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">{t('navEquipment')}</h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  canEditEquipment
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                    : 'bg-teal-950 text-teal-300 border-teal-500/30'
                }`}
              >
                {canEditEquipment
                  ? isArabic
                    ? 'صلاحية أدمن: إضافة وتعديل وحذف'
                    : 'Admin: Full Edit Access'
                  : isArabic
                  ? 'صلاحية يوزر: مسح وتحديث قراءات'
                  : 'User: Scan & Meter Log'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'سجل أصول ومعدات المحطة، مسح رموز QR، وساعات التشغيل التراكمية'
                : 'Plant machinery registry, QR asset tags, runtime meters, and field updates'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Add (Admin) and Scan QR (All) */}
        <div className="flex items-center gap-2">
          {/* Scan QR Button */}
          {onOpenQRScanner && (
            <button
              onClick={onOpenQRScanner}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm"
              title={isArabic ? 'مسح رمز أصل ميداني' : 'Scan Asset QR'}
            >
              <QrCode className="w-4 h-4" />
              <span>{isArabic ? 'مسح رمز الأصل' : 'Scan Asset'}</span>
            </button>
          )}

          {/* Add New Equipment (Admin only) */}
          {canEditEquipment && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isArabic ? 'إضافة أصل جديد' : 'Add New Asset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isArabic
                ? 'بحث برمز الأصل (مثل JBC-GEN-01)، الاسم، الموديل أو الرقم التسلسلي...'
                : 'Search code (e.g. JBC-GEN-01), name, model or serial...'
            }
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['all', 'running', 'under_maintenance', 'stopped'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'all'
                ? t('all')
                : st === 'running'
                ? t('equipStatusRunning')
                : st === 'under_maintenance'
                ? t('equipStatusMaintenance')
                : t('equipStatusStopped')}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Count and Quick Stats */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          {isArabic
            ? `عرض ${filteredEquipment.length} من أصل ${equipmentList.length} معدة مسجلة`
            : `Showing ${filteredEquipment.length} of ${equipmentList.length} assets`}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px]">
              {equipmentList.filter((e) => e.status === 'running').length}{' '}
              {isArabic ? 'تعمل' : 'Running'}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[11px]">
              {equipmentList.filter((e) => e.status === 'under_maintenance').length}{' '}
              {isArabic ? 'قيد الصيانة' : 'Maintenance'}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-[11px]">
              {equipmentList.filter((e) => e.status === 'stopped').length}{' '}
              {isArabic ? 'متوقفة' : 'Stopped'}
            </span>
          </span>
        </div>
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredEquipment.map((eq) => {
          const eqWorkOrders = workOrders.filter((w) => w.equipmentId === eq.id);

          return (
            <div
              key={eq.id}
              className={`p-4 rounded-2xl bg-slate-900/90 border transition flex flex-col justify-between space-y-3 group shadow-xs ${
                initialEquipmentId === eq.id
                  ? 'border-teal-500 ring-2 ring-teal-500/30'
                  : 'border-slate-800 hover:border-teal-500/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-teal-400 bg-teal-950/80 px-2.5 py-0.5 rounded-lg border border-teal-500/30 flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5" />
                    <span>{eq.code}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${getStatusBadge(
                      eq.status
                    )}`}
                  >
                    {eq.status === 'running'
                      ? t('equipStatusRunning')
                      : eq.status === 'under_maintenance'
                      ? t('equipStatusMaintenance')
                      : t('equipStatusStopped')}
                  </span>
                </div>

                <h3
                  onClick={() => setViewDetailEquipment(eq)}
                  className="text-sm font-bold text-white group-hover:text-teal-300 transition cursor-pointer"
                >
                  {isArabic ? eq.nameAr : eq.nameEn}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">{eq.location}</span>
                </p>
              </div>

              {/* Specs & Hours */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-[11px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('equipModel')}:</span>
                  <span className="font-mono text-slate-200">{eq.model}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t('operatingHours')}:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {eq.operatingHours.toLocaleString()} h
                    </span>
                    {/* Quick hours update button */}
                    <button
                      onClick={() => handleOpenHoursModal(eq)}
                      className="text-[10px] text-teal-400 hover:text-teal-300 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-500/30 font-semibold"
                      title={isArabic ? 'تحديث عداد الساعات' : 'Update hours'}
                    >
                      {isArabic ? 'تحديث' : 'Update'}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isArabic ? 'الرقم التسلسلي:' : 'Serial No:'}</span>
                  <span className="font-mono text-slate-300 truncate max-w-[150px]">
                    {eq.serialNumber || '—'}
                  </span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1">
                  {/* View Details & QR Button */}
                  <button
                    onClick={() => setViewDetailEquipment(eq)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                    title={isArabic ? 'معاينة الأصل ورمز QR' : 'View Details & QR'}
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-400" />
                  </button>

                  {/* QR print modal button */}
                  <button
                    onClick={() => (onShowQR ? onShowQR(eq) : setQrModalEquipment(eq))}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                    title={t('viewQR')}
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  </button>

                  {/* Edit Asset (Admin only) */}
                  {canEditEquipment && (
                    <button
                      onClick={() => handleOpenEditModal(eq)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-blue-950/70 text-blue-400 border border-slate-700/80 transition"
                      title={isArabic ? 'تعديل بيانات الأصل' : 'Edit Asset'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete Asset (Admin only) */}
                  {canDeleteEquipment && (
                    <button
                      onClick={() => setDeleteConfirmEquipment(eq)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/70 text-rose-400 border border-slate-700/80 transition"
                      title={isArabic ? 'حذف الأصل' : 'Delete Asset'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Create Work Order Button (Authorized users only) */}
                {canCreateWorkOrders && (
                  <button
                    onClick={() => handleCreateWorkOrder(eq.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'أمر صيانة' : 'Work Order'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* VIEW ASSET DETAIL & ACTIONS MODAL */}
      {viewDetailEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-950 text-teal-400 border border-teal-500/30">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-teal-400 block">
                    {viewDetailEquipment.code}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {isArabic ? viewDetailEquipment.nameAr : viewDetailEquipment.nameEn}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setViewDetailEquipment(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{isArabic ? 'الحالة التشغيلية:' : 'Status:'}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(
                    viewDetailEquipment.status
                  )}`}
                >
                  {viewDetailEquipment.status === 'running'
                    ? t('equipStatusRunning')
                    : viewDetailEquipment.status === 'under_maintenance'
                    ? t('equipStatusMaintenance')
                    : t('equipStatusStopped')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">{isArabic ? 'ساعات التشغيل:' : 'Runtime:'}</span>
                <span className="font-mono font-bold text-emerald-400">
                  {viewDetailEquipment.operatingHours.toLocaleString()} h
                </span>
              </div>
            </div>

            {/* Technical Specifications Grid */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-teal-400" />
                <span>{isArabic ? 'المواصفات الفنية وبيانات الأصل:' : 'Technical Specifications:'}</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">{isArabic ? 'الموديل:' : 'Model:'}</span>
                  <span className="font-medium text-slate-200">{viewDetailEquipment.model}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isArabic ? 'الرقم التسلسلي:' : 'Serial Number:'}</span>
                  <span className="font-mono text-slate-200">{viewDetailEquipment.serialNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isArabic ? 'الموقع في المحطة:' : 'Location:'}</span>
                  <span className="text-slate-200">{viewDetailEquipment.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isArabic ? 'تاريخ التركيب:' : 'Installed Date:'}</span>
                  <span className="font-mono text-slate-200">{viewDetailEquipment.installedDate || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isArabic ? 'آخر صيانة منفذة:' : 'Last Maintenance:'}</span>
                  <span className="font-mono text-slate-200">{viewDetailEquipment.lastMaintenanceDate || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isArabic ? 'رمز QR المبرمج:' : 'QR Tag:'}</span>
                  <span className="font-mono text-teal-300">{viewDetailEquipment.qrCodeValue}</span>
                </div>
              </div>
            </div>

            {/* Specifications Key-Values if available */}
            {viewDetailEquipment.specifications && Object.keys(viewDetailEquipment.specifications).length > 0 && (
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-1 text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {isArabic ? 'المعايير والخصائص الهندسية:' : 'Engineering Parameters:'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(viewDetailEquipment.specifications).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">{k}:</span>
                      <span className="font-mono text-slate-200 font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {/* Print/View QR tag */}
                <button
                  onClick={() => {
                    setQrModalEquipment(viewDetailEquipment);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>{isArabic ? 'بطاقة QR للطباعة' : 'QR Label'}</span>
                </button>

                {/* Quick update meter */}
                <button
                  onClick={() => handleOpenHoursModal(viewDetailEquipment)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-500/40 text-xs font-bold transition"
                >
                  <Clock className="w-4 h-4" />
                  <span>{isArabic ? 'تحديث الساعات' : 'Log Hours'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Edit (Admin only) */}
                {canEditEquipment && (
                  <button
                    onClick={() => {
                      handleOpenEditModal(viewDetailEquipment);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/40 text-xs font-bold transition"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{isArabic ? 'تعديل الأصل' : 'Edit'}</span>
                  </button>
                )}

                {/* Create Work Order (Authorized users only - Technicians cannot create) */}
                {canCreateWorkOrders && (
                  <button
                    onClick={() => handleCreateWorkOrder(viewDetailEquipment.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>{isArabic ? 'إصدار أمر صيانة' : 'Create Work Order'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW ASSET MODAL (Admin Only) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {isArabic ? 'إضافة أصل / معدة جديدة للمحطة' : 'Add New Machinery / Asset'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAsset} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Equipment Code */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'رمز الأصل (Code)' : 'Asset Code'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. JBC-GEN-03"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'الحالة الأولية' : 'Initial Status'} *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as EquipmentStatus)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="running">{isArabic ? 'تعمل بشكل طبيعي (Running)' : 'Running'}</option>
                    <option value="under_maintenance">{isArabic ? 'قيد الصيانة (Under Maintenance)' : 'Under Maintenance'}</option>
                    <option value="stopped">{isArabic ? 'متوقفة عن العمل (Stopped)' : 'Stopped'}</option>
                  </select>
                </div>
              </div>

              {/* Arabic & English Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'اسم المعدة بالعربية' : 'Name in Arabic'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    placeholder="مثال: مولد الغاز الحيوي رقم 3"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'اسم المعدة بالإنجليزية' : 'Name in English'}
                  </label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    placeholder="e.g. Biogas Generator Set #3"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Model & Serial Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'الموديل والشركة المصنعة' : 'Model / Manufacturer'}
                  </label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="e.g. MWM TCG 2020 V16 (1.56 MWe)"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'الرقم التسلسلي (Serial Number)' : 'Serial Number'}
                  </label>
                  <input
                    type="text"
                    value={formSerialNumber}
                    onChange={(e) => setFormSerialNumber(e.target.value)}
                    placeholder="e.g. JBC-2026-SN098"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Location & Operating Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'الموقع في المحطة' : 'Plant Location'}
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Engine Hall #2"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'ساعات التشغيل الحالية' : 'Initial Operating Hours'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formOperatingHours}
                    onChange={(e) => setFormOperatingHours(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Technical Specifications Fields */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block">
                  {isArabic ? 'المواصفات الهندسية (اختياري):' : 'Engineering Specifications:'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formSpecKey1}
                    onChange={(e) => setFormSpecKey1(e.target.value)}
                    placeholder="Feature (e.g. Power kW)"
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
                  />
                  <input
                    type="text"
                    value={formSpecVal1}
                    onChange={(e) => setFormSpecVal1(e.target.value)}
                    placeholder="Value (e.g. 1,063 kW)"
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isArabic ? 'حفظ الأصل الجديد' : 'Save Asset'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ASSET MODAL (Admin Only) */}
      {editingEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isArabic ? 'تعديل بيانات الأصل' : 'Edit Asset Details'}
                  </h3>
                  <span className="text-xs font-mono text-teal-400">{editingEquipment.code}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingEquipment(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAsset} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Code */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'رمز الأصل' : 'Asset Code'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'الحالة التشغيلية' : 'Operating Status'} *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as EquipmentStatus)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="running">{isArabic ? 'تعمل بشكل طبيعي (Running)' : 'Running'}</option>
                    <option value="under_maintenance">{isArabic ? 'قيد الصيانة (Under Maintenance)' : 'Under Maintenance'}</option>
                    <option value="stopped">{isArabic ? 'متوقفة عن العمل (Stopped)' : 'Stopped'}</option>
                  </select>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'الاسم بالعربية' : 'Arabic Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'الاسم بالإنجليزية' : 'English Name'}
                  </label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Model & Serial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'الموديل والشركة' : 'Model / Maker'}
                  </label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'الرقم التسلسلي' : 'Serial Number'}
                  </label>
                  <input
                    type="text"
                    value={formSerialNumber}
                    onChange={(e) => setFormSerialNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Location & Operating Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'الموقع في المحطة' : 'Location'}
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'ساعات التشغيل (Operating Hours)' : 'Operating Hours'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formOperatingHours}
                    onChange={(e) => setFormOperatingHours(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEquipment(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isArabic ? 'تحديث التعديلات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK OPERATING HOURS / STATUS MODAL (User & Admin) */}
      {hoursModalEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-950 text-teal-400 border border-teal-500/30">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isArabic ? 'تحديث ساعات التشغيل الميدانية' : 'Log Operating Meter'}
                  </h3>
                  <span className="text-[11px] font-mono text-teal-400">
                    {hoursModalEquipment.code}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setHoursModalEquipment(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHours} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'قراءة عداد الساعات الحالية (ساعة)' : 'Current Operating Hours (h)'}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newOperatingHours}
                  onChange={(e) => setNewOperatingHours(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-teal-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {isArabic
                    ? `القراءة السابقة المسجلة: ${hoursModalEquipment.operatingHours.toLocaleString()} ساعة`
                    : `Previous recorded reading: ${hoursModalEquipment.operatingHours.toLocaleString()} h`}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'حالة تشغيل المعدة' : 'Machine Status'}
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as EquipmentStatus)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="running">{isArabic ? 'تعمل بشكل طبيعي (Running)' : 'Running'}</option>
                  <option value="under_maintenance">{isArabic ? 'قيد الصيانة (Under Maintenance)' : 'Under Maintenance'}</option>
                  <option value="stopped">{isArabic ? 'متوقفة (Stopped)' : 'Stopped'}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHoursModalEquipment(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm"
                >
                  {isArabic ? 'تثبيت القراءة' : 'Confirm Meter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG (Admin Only) */}
      {deleteConfirmEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-600/50 p-5 shadow-2xl text-slate-100 space-y-3">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-950 border border-rose-500/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">
                {isArabic ? 'تأكيد حذف الأصل من السجلات' : 'Confirm Asset Deletion'}
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              {isArabic
                ? `هل أنت متأكد من حذف المعدة "${deleteConfirmEquipment.nameAr} (${deleteConfirmEquipment.code})"؟ سيتم توثيق هذه العملية في سجل الرقابة الأمني.`
                : `Are you sure you want to delete "${deleteConfirmEquipment.code}"? This action will be recorded in audit trail.`}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirmEquipment(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm"
              >
                {isArabic ? 'تأكيد الحذف' : 'Delete Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Printable Modal */}
      <QRCodeModal
        isOpen={!!qrModalEquipment}
        onClose={() => setQrModalEquipment(null)}
        equipment={qrModalEquipment}
      />
    </div>
  );
};
