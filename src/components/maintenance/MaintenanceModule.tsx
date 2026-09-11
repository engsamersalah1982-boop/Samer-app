import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Package,
  FileCheck2,
  X,
  Trash2,
  AlertTriangle,
  Edit3,
  Lock,
  RotateCcw,
  Coins,
  Check,
  FileText,
  Send,
  Printer,
} from 'lucide-react';
import { db } from '../../services/db';
import { printWorkOrder } from '../../utils/printUtils';
import {
  WorkOrder,
  WorkOrderStatus,
  WorkOrderType,
  TaskPriority,
  SparePartItem,
  SafetyChecklistItem,
} from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { TimeInputHHHMM, hoursFloatToHHHMM, minutesToHHHMM } from '../common/TimeInputHHHMM';

interface MaintenanceModuleProps {
  initialEquipmentId?: string | null;
  onClearInitialEquipment?: () => void;
}

export const MaintenanceModule: React.FC<MaintenanceModuleProps> = ({
  initialEquipmentId,
  onClearInitialEquipment,
}) => {
  const { isArabic, t } = useLanguage();
  const {
    currentUser,
    canCloseWorkOrder,
    canDeleteWorkOrders,
    canManageWorkOrders,
    canCreateWorkOrders,
    canEditWorkOrders,
    isAdmin,
    isMaintenanceManager,
  } = useAuth();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => db.getWorkOrders());
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [woToDelete, setWoToDelete] = useState<WorkOrder | null>(null);
  const [isDeletingWO, setIsDeletingWO] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Editing Work Order Text Modal state
  const [editingWO, setEditingWO] = useState<WorkOrder | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<WorkOrderType>('corrective');
  const [editPriority, setEditPriority] = useState<TaskPriority>('high');
  const [editTechId, setEditTechId] = useState<string>('');
  const [editAlert, setEditAlert] = useState<string | null>(null);

  // Inline editing inside modal
  const [isInlineEditingText, setIsInlineEditingText] = useState(false);
  const [inlineDescInput, setInlineDescInput] = useState('');

  // Editing in detail view
  const [actionTakenInput, setActionTakenInput] = useState('');
  const [rootCauseInput, setRootCauseInput] = useState('');
  const [downtimeInput, setDowntimeInput] = useState<number>(0);
  const [actualHoursInput, setActualHoursInput] = useState<number>(0);
  const [actualMinutesInput, setActualMinutesInput] = useState<number>(0);
  const [actualHoursFormattedInput, setActualHoursFormattedInput] = useState<string>('000:00');

  // New spare part input (Detail view) - user MUST enter cost manually, no default
  const [newPartName, setNewPartName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartQty, setNewPartQty] = useState<number>(1);
  const [newPartCost, setNewPartCost] = useState<string>('');
  const [partCostError, setPartCostError] = useState<string | null>(null);

  // Editing existing spare part in detail view
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editPartName, setEditPartName] = useState<string>('');
  const [editPartNumber, setEditPartNumber] = useState<string>('');
  const [editPartQty, setEditPartQty] = useState<number>(1);
  const [editPartCost, setEditPartCost] = useState<string>('');

  // Spare parts when creating a new work order
  const [createParts, setCreateParts] = useState<SparePartItem[]>([]);
  const [showAddPartInCreate, setShowAddPartInCreate] = useState(false);
  const [createPartName, setCreatePartName] = useState('');
  const [createPartNumber, setCreatePartNumber] = useState('');
  const [createPartQty, setCreatePartQty] = useState<number>(1);
  const [createPartCost, setCreatePartCost] = useState<string>('');
  const [createPartError, setCreatePartError] = useState<string | null>(null);

  // New Work Order Form State
  const [newType, setNewType] = useState<WorkOrderType>('corrective');
  const [newPriority, setNewPriority] = useState<TaskPriority>('high');
  const [newEquipmentId, setNewEquipmentId] = useState<string>('eq-1');
  const [newTechnicianId, setNewTechnicianId] = useState<string>(() => {
    const users = db.getUsers();
    return users[0]?.id || 'usr-admin';
  });
  const [newDescription, setNewDescription] = useState('');

  const allEquipment = db.getEquipment();
  const allUsers = db.getUsers();

  useEffect(() => {
    if (initialEquipmentId) {
      setNewEquipmentId(initialEquipmentId);
      if (canCreateWorkOrders) {
        setShowCreateModal(true);
      }
      if (onClearInitialEquipment) onClearInitialEquipment();
    }
  }, [initialEquipmentId, onClearInitialEquipment, canCreateWorkOrders]);

  const refreshWorkOrders = () => {
    setWorkOrders(db.getWorkOrders());
    if (selectedWO) {
      const fresh = db.getWorkOrderById(selectedWO.id);
      if (fresh) {
        setSelectedWO(fresh);
        setActionTakenInput(fresh.actionTaken || '');
        setRootCauseInput(fresh.rootCause || '');
        setDowntimeInput(fresh.downtimeHours || 0);
        setActualHoursInput(fresh.actualHours || 0);
        const totMin = (fresh as any).actualMinutes || Math.round((fresh.actualHours || 0) * 60);
        const formatted = (fresh as any).actualHoursFormatted || hoursFloatToHHHMM(fresh.actualHours || 0);
        setActualMinutesInput(totMin);
        setActualHoursFormattedInput(formatted);
      }
    }
  };

  const openDetailModal = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setActionTakenInput(wo.actionTaken || '');
    setRootCauseInput(wo.rootCause || '');
    setDowntimeInput(wo.downtimeHours || 0);
    setActualHoursInput(wo.actualHours || 0);
    const totMin = (wo as any).actualMinutes || Math.round((wo.actualHours || 0) * 60);
    const formatted = (wo as any).actualHoursFormatted || hoursFloatToHHHMM(wo.actualHours || 0);
    setActualMinutesInput(totMin);
    setActualHoursFormattedInput(formatted);
    setIsInlineEditingText(false);
    setInlineDescInput(wo.problemDescription);
  };

  const openEditWOModal = (wo: WorkOrder) => {
    setEditingWO(wo);
    setEditDesc(wo.problemDescription);
    setEditType(wo.type);
    setEditPriority(wo.priority);
    setEditTechId(wo.assignedTechnicianId || '');
  };

  const handleSaveWOText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWO || !editDesc.trim()) return;

    const assignedTech = allUsers.find((u) => u.id === editTechId);

    db.updateWorkOrder(
      editingWO.id,
      {
        problemDescription: editDesc.trim(),
        type: editType,
        priority: editPriority,
        ...(assignedTech
          ? {
              assignedTechnicianId: assignedTech.id,
              assignedTechnicianName: isArabic ? assignedTech.nameAr : assignedTech.nameEn,
            }
          : {}),
      },
      currentUser?.id || 'usr-1',
      currentUser?.nameAr || 'Admin'
    );

    setEditAlert(
      isArabic
        ? `تم تحديث نص وبيانات أمر الصيانة (${editingWO.workOrderNumber}) بنجاح وإشعار الفني والإدارة`
        : `Work order (${editingWO.workOrderNumber}) text updated and notifications sent`
    );

    refreshWorkOrders();
    setEditingWO(null);
    setTimeout(() => setEditAlert(null), 4500);
  };

  const handleSaveInlineText = () => {
    if (!selectedWO || !inlineDescInput.trim()) return;
    db.updateWorkOrder(
      selectedWO.id,
      { problemDescription: inlineDescInput.trim() },
      currentUser?.id || 'usr-1',
      currentUser?.nameAr || 'Admin'
    );
    setIsInlineEditingText(false);
    refreshWorkOrders();
    setEditAlert(
      isArabic
        ? `تم حفظ النص المعدل لأمر الصيانة (${selectedWO.workOrderNumber}) بنجاح`
        : `Updated text saved for work order (${selectedWO.workOrderNumber})`
    );
    setTimeout(() => setEditAlert(null), 4000);
  };

  const filteredOrders = workOrders.filter((wo) => {
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    const matchesType = typeFilter === 'all' || wo.type === typeFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      wo.workOrderNumber.toLowerCase().includes(query) ||
      (wo.equipmentCode && wo.equipmentCode.toLowerCase().includes(query)) ||
      wo.problemDescription.toLowerCase().includes(query) ||
      (wo.assignedTechnicianName && wo.assignedTechnicianName.toLowerCase().includes(query));
    return matchesStatus && matchesType && matchesSearch;
  });

  const handleCreateWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateWorkOrders) {
      alert(isArabic ? 'عذراً، لا تملك صلاحية إنشاء أوامر صيانة.' : 'Unauthorized to create work orders.');
      return;
    }
    if (!newDescription.trim()) return;

    const equip = allEquipment.find((e) => e.id === newEquipmentId);
    const tech = allUsers.find((u) => u.id === newTechnicianId);

    const safetyChecklist: SafetyChecklistItem[] = [
      {
        id: `loto-1`,
        labelAr: 'تطبيق إجراءات العزل وفصل الطاقة الميكانيكية والكهربائية (LOTO)',
        labelEn: 'Apply Lockout/Tagout (LOTO)',
        checked: false,
      },
      {
        id: `loto-2`,
        labelAr: 'فحص نسبة الغازات السامة H2S و CH4 في محيط العمل بأجهزة كشف شخصية',
        labelEn: 'Atmospheric gas testing for H2S/CH4',
        checked: false,
      },
      {
        id: `loto-3`,
        labelAr: 'ارتداء معدات الوقاية الشخصية المقاومة للكيماويات والغازات',
        labelEn: 'Chemical PPE & Respirator inspection',
        checked: false,
      },
    ];

    db.createWorkOrder(
      {
        type: newType,
        priority: newPriority,
        equipmentId: newEquipmentId,
        equipmentCode: equip?.code,
        assignedTechnicianId: newTechnicianId,
        assignedTechnicianName: tech ? tech.nameAr : undefined,
        createdById: currentUser?.id || 'usr-admin',
        status: 'new',
        problemDescription: newDescription.trim(),
        safetyChecklist,
        sparePartsUsed: createParts,
        downtimeHours: 0,
        actualHours: 0,
      },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'Admin'
    );

    setShowCreateModal(false);
    setNewDescription('');
    setCreateParts([]);
    setCreatePartName('');
    setCreatePartNumber('');
    setCreatePartQty(1);
    setCreatePartCost('');
    setCreatePartError(null);
    setShowAddPartInCreate(false);
    refreshWorkOrders();
  };

  const handleAddCreatePart = (e: React.FormEvent) => {
    e.preventDefault();
    setCreatePartError(null);
    if (!createPartName.trim()) {
      setCreatePartError(isArabic ? 'يرجى إدخال اسم القطعة' : 'Please enter part name');
      return;
    }
    const costNum = parseFloat(createPartCost);
    if (createPartCost.trim() === '' || isNaN(costNum) || costNum < 0) {
      setCreatePartError(
        isArabic
          ? 'يجب إدخال وتحديد قيمة القطعة بالدينار الأردني (JOD) بدون قيمة افتراضية.'
          : 'Please enter the unit price in JOD (manual entry required).'
      );
      return;
    }

    const qty = Math.max(1, createPartQty || 1);
    const newPart: SparePartItem = {
      id: `sp-${Date.now()}`,
      partNumber: createPartNumber.trim() || `OEM-${Math.floor(1000 + Math.random() * 9000)}`,
      nameAr: createPartName.trim(),
      nameEn: createPartName.trim(),
      quantity: qty,
      unitCostJOD: costNum,
      totalCostJOD: parseFloat((qty * costNum).toFixed(2)),
    };

    setCreateParts([...createParts, newPart]);
    setCreatePartName('');
    setCreatePartNumber('');
    setCreatePartQty(1);
    setCreatePartCost('');
    setCreatePartError(null);
  };

  const handleRemoveCreatePart = (id: string) => {
    setCreateParts(createParts.filter((p) => p.id !== id));
  };

  // Ownership resolution: only the assigned technician or supervisor can execute or complete
  const isAssignedToMe = Boolean(
    selectedWO &&
    currentUser &&
    ((selectedWO.assignedTechnicianId && selectedWO.assignedTechnicianId === currentUser.id) ||
      (selectedWO.assignedTechnicianName && currentUser.nameAr && selectedWO.assignedTechnicianName.includes(currentUser.nameAr)) ||
      (selectedWO.assignedTechnicianName && currentUser.nameEn && selectedWO.assignedTechnicianName.includes(currentUser.nameEn)))
  );
  const isSupervisor = Boolean(isAdmin || isMaintenanceManager);
  const canOperateOnSelectedWO = isAssignedToMe || isSupervisor;

  const handleToggleSafetyItem = (checkId: string) => {
    if (!selectedWO || !canOperateOnSelectedWO) return;
    const updatedChecklist = selectedWO.safetyChecklist.map((item) =>
      item.id === checkId ? { ...item, checked: !item.checked } : item
    );

    db.updateWorkOrder(
      selectedWO.id,
      { safetyChecklist: updatedChecklist },
      currentUser?.id || 'usr-1',
      currentUser?.nameAr || 'User'
    );
    refreshWorkOrders();
  };

  const handleAddSparePart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO || !canOperateOnSelectedWO) return;
    setPartCostError(null);

    if (!newPartName.trim()) {
      setPartCostError(isArabic ? 'يرجى إدخال اسم القطعة المستهلكة' : 'Please enter spare part name');
      return;
    }

    const costNum = parseFloat(newPartCost);
    if (newPartCost.trim() === '' || isNaN(costNum) || costNum < 0) {
      setPartCostError(
        isArabic
          ? 'يجب تحديد وإدخال قيمة القطعة بالدينار الأردني (JOD) - لا يوجد سعر افتراضي.'
          : 'Please enter the spare part price in JOD (manual entry required).'
      );
      return;
    }

    const qty = Math.max(1, newPartQty || 1);
    const newPart: SparePartItem = {
      id: `sp-${Date.now()}`,
      partNumber: newPartNumber.trim() || `OEM-${Math.floor(1000 + Math.random() * 9000)}`,
      nameAr: newPartName.trim(),
      nameEn: newPartName.trim(),
      quantity: qty,
      unitCostJOD: costNum,
      totalCostJOD: parseFloat((qty * costNum).toFixed(2)),
    };

    const updatedParts = [...(selectedWO.sparePartsUsed || []), newPart];
    db.updateWorkOrder(
      selectedWO.id,
      { sparePartsUsed: updatedParts },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'User'
    );

    setNewPartName('');
    setNewPartNumber('');
    setNewPartQty(1);
    setNewPartCost('');
    setPartCostError(null);
    refreshWorkOrders();
  };

  const handleStartEditPart = (p: SparePartItem) => {
    setEditingPartId(p.id);
    setEditPartName(p.nameAr || p.nameEn);
    setEditPartNumber(p.partNumber || '');
    setEditPartQty(p.quantity);
    setEditPartCost(p.unitCostJOD.toString());
  };

  const handleCancelEditPart = () => {
    setEditingPartId(null);
    setEditPartName('');
    setEditPartNumber('');
    setEditPartQty(1);
    setEditPartCost('');
  };

  const handleSaveEditPart = (partId: string) => {
    if (!selectedWO || !canOperateOnSelectedWO) return;
    const costNum = parseFloat(editPartCost);
    if (editPartCost.trim() === '' || isNaN(costNum) || costNum < 0) {
      alert(
        isArabic
          ? 'يجب تحديد وإدخال قيمة القطعة بالدينار الأردني (JOD).'
          : 'Please enter a valid unit price in JOD.'
      );
      return;
    }
    const qty = Math.max(1, editPartQty || 1);

    const updatedParts = (selectedWO.sparePartsUsed || []).map((p) => {
      if (p.id === partId) {
        return {
          ...p,
          nameAr: editPartName.trim() || p.nameAr,
          nameEn: editPartName.trim() || p.nameEn,
          partNumber: editPartNumber.trim() || p.partNumber,
          quantity: qty,
          unitCostJOD: costNum,
          totalCostJOD: parseFloat((qty * costNum).toFixed(2)),
        };
      }
      return p;
    });

    db.updateWorkOrder(
      selectedWO.id,
      { sparePartsUsed: updatedParts },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'User'
    );

    setEditingPartId(null);
    refreshWorkOrders();
  };

  const handleRemoveSparePart = (partId: string) => {
    if (!selectedWO || !canOperateOnSelectedWO) return;
    const updatedParts = selectedWO.sparePartsUsed.filter((p) => p.id !== partId);
    db.updateWorkOrder(
      selectedWO.id,
      { sparePartsUsed: updatedParts },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'User'
    );
    refreshWorkOrders();
  };

  const handleSaveOperationalUpdates = () => {
    if (!selectedWO || !canOperateOnSelectedWO) return;
    const hoursFloat = Math.round((actualMinutesInput / 60) * 100) / 100;
    db.updateWorkOrder(
      selectedWO.id,
      {
        actionTaken: actionTakenInput,
        rootCause: rootCauseInput,
        downtimeHours: downtimeInput,
        actualHours: hoursFloat,
        actualHoursFormatted: actualHoursFormattedInput,
        actualMinutes: actualMinutesInput,
      },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'User'
    );
    refreshWorkOrders();
  };

  const [reportError, setReportError] = useState<string | null>(null);

  const handleTechnicianNotifyCompletion = () => {
    if (!selectedWO) return;
    if (!canOperateOnSelectedWO) {
      alert(isArabic ? 'عذراً، هذا الأمر موكول لفني آخر.' : 'This order is assigned to another technician.');
      return;
    }

    if (!actionTakenInput.trim()) {
      setReportError(
        isArabic
          ? 'يجب كتابة تقرير يصف ما قمت به بالتفصيل والإجراءات الفنية المنفذة قبل إشعار الانتهاء.'
          : 'Please document the technical actions taken and completion report before submitting.'
      );
      return;
    }

    setReportError(null);

    const hoursFloat = Math.round((actualMinutesInput / 60) * 100) / 100;

    // Update status to completed
    db.updateWorkOrder(
      selectedWO.id,
      {
        status: 'completed',
        actionTaken: actionTakenInput.trim(),
        rootCause: rootCauseInput.trim(),
        downtimeHours: downtimeInput,
        actualHours: hoursFloat,
        actualHoursFormatted: actualHoursFormattedInput,
        actualMinutes: actualMinutesInput,
      },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'User'
    );

    // Send high-priority notification to maintenance supervisors
    db.sendNotificationToAdmins({
      titleAr: `إشعار إنجاز أمر صيانة: ${selectedWO.workOrderNumber} 📋`,
      titleEn: `Work Order Completed: ${selectedWO.workOrderNumber}`,
      messageAr: `قام الفني (${currentUser?.nameAr || 'الفني المعتمد'}) بإنهاء تنفيذ أمر الصيانة للمعدة (${selectedWO.equipmentCode || ''}) ورفع تقرير الإنجاز للمراجعة والاعتماد.`,
      messageEn: `Technician ${currentUser?.nameEn || currentUser?.nameAr} has completed work order ${selectedWO.workOrderNumber} and submitted the technical report for approval.`,
      type: 'success',
      actionUrl: 'maintenance',
    });

    setEditAlert(
      isArabic
        ? `تم إشعار انتهاء تنفيذ أمر الصيانة ${selectedWO.workOrderNumber} بنجاح وإرسال تقرير الإنجاز لإدارة الصيانة للاعتماد.`
        : `Work order ${selectedWO.workOrderNumber} completion notified successfully and report submitted for review.`
    );

    refreshWorkOrders();
  };

  const handleStatusChange = (newStatus: WorkOrderStatus) => {
    if (!selectedWO || !canOperateOnSelectedWO) return;
    const hoursFloat = Math.round((actualMinutesInput / 60) * 100) / 100;
    db.updateWorkOrder(
      selectedWO.id,
      {
        status: newStatus,
        actionTaken: actionTakenInput,
        rootCause: rootCauseInput,
        downtimeHours: downtimeInput,
        actualHours: hoursFloat,
        actualHoursFormatted: actualHoursFormattedInput,
        actualMinutes: actualMinutesInput,
      },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'User'
    );
    refreshWorkOrders();
  };

  const handleCloseAndVerify = () => {
    if (!selectedWO || !canCloseWorkOrder) return;
    db.closeWorkOrder(
      selectedWO.id,
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'Maintenance Manager'
    );
    refreshWorkOrders();
  };

  const handleConfirmDeleteWorkOrder = () => {
    if (!woToDelete || !canDeleteWorkOrders) return;
    setIsDeletingWO(true);
    try {
      db.deleteWorkOrder(
        woToDelete.id,
        currentUser?.id || 'usr-admin',
        currentUser?.nameAr || 'مدير النظام'
      );
      if (selectedWO?.id === woToDelete.id) {
        setSelectedWO(null);
      }
      const num = woToDelete.workOrderNumber;
      setWoToDelete(null);
      refreshWorkOrders();
      setEditAlert(
        isArabic
          ? `تم شطب أمر الصيانة ${num} نهائياً ولن يظهر بعد الآن لأي مستخدم أو أدمن.`
          : `Work order ${num} has been permanently deleted.`
      );
      setTimeout(() => setEditAlert(null), 5000);
    } catch (err: any) {
      console.error(err);
      setEditAlert(err?.message || 'تعذر شطب أمر الصيانة');
    } finally {
      setIsDeletingWO(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-950 text-amber-400 border border-amber-500/30">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">{t('navMaintenance')}</h2>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'إصدار وتوثيق ومتابعة أوامر الصيانة التصحيحية والوقائية والطارئة'
                : 'Track, execute, and verify preventive and corrective work orders'}
            </p>
          </div>
        </div>

        {canCreateWorkOrders && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? 'إصدار أمر صيانة جديد' : 'New Work Order'}</span>
          </button>
        )}
      </div>

      {/* Edit Success Notification Alert */}
      {editAlert && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{editAlert}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search')}
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['all', 'new', 'in_progress', 'completed', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'all'
                ? t('all')
                : st === 'new'
                ? t('woNew')
                : st === 'in_progress'
                ? t('woInProgress')
                : st === 'completed'
                ? t('woCompleted')
                : t('woClosed')}
            </button>
          ))}
        </div>
      </div>

      {/* Work Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">{isArabic ? 'لا توجد أوامر صيانة' : 'No work orders found'}</p>
          </div>
        ) : (
          filteredOrders.map((wo) => {
            const allLotoPassed = wo.safetyChecklist.every((c) => c.checked);

            return (
              <div
                key={wo.id}
                onClick={() => openDetailModal(wo)}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer flex flex-col justify-between space-y-3 group shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {wo.workOrderNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        wo.status === 'closed'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40'
                          : wo.status === 'completed'
                          ? 'bg-blue-950 text-blue-300 border-blue-600/40'
                          : wo.status === 'in_progress'
                          ? 'bg-amber-950 text-amber-300 border-amber-600/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {wo.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-mono font-semibold text-emerald-400">
                      {wo.equipmentCode}
                    </span>
                    <span className="text-[10px] text-slate-400">• {wo.type}</span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium line-clamp-2 leading-relaxed">
                    {wo.problemDescription}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  {/* Safety Status Pill */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {allLotoPassed ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span className="text-[10px] text-slate-300">
                        {allLotoPassed
                          ? isArabic
                            ? 'معايير LOTO معتمدة'
                            : 'LOTO Verified'
                          : isArabic
                          ? 'عزل LOTO بانتظار الاعتماد'
                          : 'LOTO Pending'}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(wo.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="truncate max-w-[130px]">
                      {wo.assignedTechnicianName || 'Technician'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(wo as any).actualHoursFormatted ? (
                        <span className="font-mono text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                          {(wo as any).actualHoursFormatted}
                        </span>
                      ) : wo.actualHours && wo.actualHours > 0 ? (
                        <span className="font-mono text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                          {hoursFloatToHHHMM(wo.actualHours)}
                        </span>
                      ) : null}
                      {wo.sparePartsUsed.length > 0 && (
                        <span className="font-mono text-amber-300 text-[10px]">
                          {wo.sparePartsUsed.length} {isArabic ? 'قطع مستهلكة' : 'parts'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const eq = db.getEquipment().find((x) => x.code === wo.equipmentCode || x.id === wo.equipmentId);
                        printWorkOrder(wo, eq);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition active:scale-95"
                      title={isArabic ? 'طباعة سند أمر الصيانة الفني' : 'Print Work Order'}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'طباعة' : 'Print'}</span>
                    </button>

                    <div className="flex items-center gap-1.5 ms-auto">
                      {canManageWorkOrders && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditWOModal(wo);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition active:scale-95"
                          title={isArabic ? 'تحرير نص وبيانات أمر الصيانة' : 'Edit Work Order Text'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isArabic ? 'تحرير' : 'Edit'}</span>
                        </button>
                      )}

                      {canDeleteWorkOrders && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWoToDelete(wo);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition active:scale-95"
                          title={isArabic ? 'شطب وحذف أمر الصيانة نهائياً لجميع المستخدمين' : 'Delete/Purge Work Order'}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>{isArabic ? 'شطب' : 'Delete'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Work Order Execution & Details Modal */}
      {selectedWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-5 animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl overflow-y-auto space-y-4 text-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono font-bold text-amber-400">
                    {selectedWO.workOrderNumber}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    {selectedWO.equipmentCode}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    {selectedWO.type}
                  </span>
                </div>

                {isInlineEditingText ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      rows={3}
                      value={inlineDescInput}
                      onChange={(e) => setInlineDescInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-amber-500 text-xs text-white focus:outline-none"
                      placeholder={isArabic ? 'نص أمر الصيانة المحدث...' : 'Updated description...'}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveInlineText}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'حفظ النص' : 'Save Text'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsInlineEditingText(false);
                          setInlineDescInput(selectedWO.problemDescription);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs transition"
                      >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2 mt-1">
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      {selectedWO.problemDescription}
                    </p>
                    {canManageWorkOrders && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsInlineEditingText(true);
                          setInlineDescInput(selectedWO.problemDescription);
                        }}
                        className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0 transition"
                        title={isArabic ? 'تحرير النص مباشرة' : 'Edit Text'}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isArabic ? 'تحرير النص' : 'Edit Text'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const eq = db.getEquipment().find((x) => x.code === selectedWO.equipmentCode || x.id === selectedWO.equipmentId);
                    printWorkOrder(selectedWO, eq);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition active:scale-95"
                  title={isArabic ? 'طباعة سند أمر الصيانة الرسمي' : 'Print Work Order'}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'طباعة السند' : 'Print'}</span>
                </button>

                {canDeleteWorkOrders && (
                  <button
                    type="button"
                    onClick={() => setWoToDelete(selectedWO)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition active:scale-95"
                    title={isArabic ? 'شطب وحذف أمر الصيانة نهائياً' : 'Delete / Purge Work Order'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isArabic ? 'شطب الأمر' : 'Delete'}</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedWO(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lock Banner when assigned to another technician */}
            {!canOperateOnSelectedWO && (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold">
                    {isArabic ? 'صلاحية قراءة فقط (مهمة موكولة لفني آخر)' : 'Read-Only (Assigned to another technician)'}
                  </div>
                  <div className="text-[11px] text-amber-300/80 mt-0.5">
                    {isArabic
                      ? `أمر الصيانة مسند إلى الزميل: (${selectedWO.assignedTechnicianName || 'فني آخر'}). وفق سياسات العمل المعتمدة، لا يمكن لفني تنفيذ أو إغلاق أو تعديل مهمة موكولة لزميل آخر.`
                      : `Assigned to (${selectedWO.assignedTechnicianName || 'another technician'}). Operating policy strictly requires only the assignee or supervisor to execute or close tasks.`}
                  </div>
                </div>
              </div>
            )}

            {/* Safety & Isolation LOTO Checklist (Operational requirement) */}
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-amber-300">{t('lotoChecklist')}</h4>
              </div>
              <p className="text-[11px] text-slate-300">
                {isArabic
                  ? 'يجب على الفني المعتمد تأكيد كافة إجراءات العزل الميكانيكي والكهربائي وفحص الغازات قبل البدء:'
                  : 'Mandatory LOTO safety checks prior to servicing high-voltage and biogas machinery:'}
              </p>

              <div className="space-y-1.5 pt-1">
                {selectedWO.safetyChecklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleSafetyItem(item.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-3 transition ${
                      canOperateOnSelectedWO ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                    } ${
                      item.checked
                        ? 'bg-emerald-950/50 border-emerald-600/50 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-emerald-600 pointer-events-none"
                    />
                    <span className="text-xs">{isArabic ? item.labelAr : item.labelEn}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Actions & Cause Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {t('actionTaken')} <span className="text-amber-400">* {isArabic ? '(تقرير الفني)' : '(Technician Report)'}</span>
                </label>
                <textarea
                  rows={3}
                  disabled={!canOperateOnSelectedWO}
                  value={actionTakenInput}
                  onChange={(e) => setActionTakenInput(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'وثق الإجراءات الفنية المتخذة بالتفصيل، والفحوصات، وما قمت به لرفع تقرير الإنجاز...'
                      : 'Detail corrective technical procedures undertaken...'
                  }
                  className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-white focus:outline-none ${
                    canOperateOnSelectedWO
                      ? 'border-slate-700 focus:border-amber-500'
                      : 'border-slate-800 opacity-60 cursor-not-allowed'
                  }`}
                />
                {reportError && (
                  <div className="mt-1.5 text-xs font-semibold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{reportError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {t('rootCause')}
                </label>
                <input
                  type="text"
                  disabled={!canOperateOnSelectedWO}
                  value={rootCauseInput}
                  onChange={(e) => setRootCauseInput(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'السبب الجذري (مثل: تآكل المحامل، انسداد الفوهات بالشوائب)'
                      : 'Root cause analysis...'
                  }
                  className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-white focus:outline-none ${
                    canOperateOnSelectedWO
                      ? 'border-slate-700 focus:border-amber-500'
                      : 'border-slate-800 opacity-60 cursor-not-allowed'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {t('downtime')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    disabled={!canOperateOnSelectedWO}
                    value={downtimeInput}
                    onChange={(e) => setDowntimeInput(parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-white focus:outline-none font-mono ${
                      canOperateOnSelectedWO
                        ? 'border-slate-700 focus:border-amber-500'
                        : 'border-slate-800 opacity-60 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <TimeInputHHHMM
                    id="wo-actual-hours-input"
                    label={t('actualHours')}
                    totalMinutes={actualMinutesInput}
                    initialFormatted={actualHoursFormattedInput}
                    disabled={!canOperateOnSelectedWO}
                    isArabic={isArabic}
                    onChange={(totMin, formatted) => {
                      setActualMinutesInput(totMin);
                      setActualHoursFormattedInput(formatted);
                      setActualHoursInput(Math.round((totMin / 60) * 100) / 100);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Spare Parts Consumed & Cost Table */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isArabic ? 'قطع الغيار وتكلفتها (بالدينار الأردني JOD)' : 'Spare Parts & Cost (JOD)'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isArabic ? 'تحديد أسعار القطع المستهلكة يدوياً وتوثيق الفاتورة' : 'Manual pricing in JOD (no defaults)'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">{isArabic ? 'إجمالي التكلفة' : 'Total Parts Cost'}</span>
                  <span className="text-sm font-mono font-black text-emerald-400">
                    {selectedWO.sparePartsUsed
                      .reduce((acc, p) => acc + (p.totalCostJOD || 0), 0)
                      .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-sans font-bold">JOD</span>
                  </span>
                </div>
              </div>

              {/* List of parts */}
              <div className="space-y-2">
                {selectedWO.sparePartsUsed.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-500">
                    {isArabic
                      ? 'لا توجد قطع غيار مسجلة لهذا الأمر حالياً. يمكنك إضافة القطع وتحديد سعر كل قطعة بالدينار أدناه.'
                      : 'No spare parts registered yet. Add parts with unit price in JOD below.'}
                  </div>
                ) : (
                  selectedWO.sparePartsUsed.map((p) => {
                    const isEditingThis = editingPartId === p.id;
                    if (isEditingThis) {
                      return (
                        <div
                          key={p.id}
                          className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/50 space-y-2 text-xs animate-fade-in"
                        >
                          <div className="flex items-center justify-between text-amber-300 font-bold text-[11px]">
                            <span>{isArabic ? 'تعديل بيانات وسعر القطعة بالدينار' : 'Edit Spare Part & Cost (JOD)'}</span>
                            <span className="text-slate-400 font-mono text-[10px]">{p.id}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-300 block mb-0.5">
                                {isArabic ? 'اسم القطعة *' : 'Part Name *'}
                              </label>
                              <input
                                type="text"
                                value={editPartName}
                                onChange={(e) => setEditPartName(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-300 block mb-0.5">
                                {isArabic ? 'رقم / كود القطعة (Part No.)' : 'Part Code / No.'}
                              </label>
                              <input
                                type="text"
                                value={editPartNumber}
                                onChange={(e) => setEditPartNumber(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
                            <div>
                              <label className="text-[10px] text-slate-300 block mb-0.5">
                                {isArabic ? 'الكمية *' : 'Quantity *'}
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={editPartQty}
                                onChange={(e) => setEditPartQty(parseInt(e.target.value) || 1)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono text-center focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-amber-300 font-bold block mb-0.5">
                                {isArabic ? 'سعر الوحدة بالدينار (JOD) *' : 'Unit Price (JOD) *'}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={editPartCost}
                                onChange={(e) => setEditPartCost(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-amber-500/70 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                              />
                            </div>
                            <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEditPart(p.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                                title={isArabic ? 'حفظ السعر' : 'Save'}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isArabic ? 'حفظ' : 'Save'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditPart}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                                title={isArabic ? 'إلغاء' : 'Cancel'}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[10px] text-emerald-400 font-mono bg-slate-950/70 p-1.5 rounded-lg border border-slate-800 flex justify-between">
                            <span>{isArabic ? 'المجموع المحسوب:' : 'Calculated Total:'}</span>
                            <span className="font-bold">
                              {((Math.max(1, editPartQty) * (parseFloat(editPartCost) || 0))).toFixed(2)} JOD
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">
                              {isArabic ? p.nameAr : p.nameEn}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
                              {p.partNumber}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span className="text-slate-300 font-mono">
                              {isArabic ? 'الكمية:' : 'Qty:'}{' '}
                              <strong className="text-white">{p.quantity}</strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-amber-400 font-mono">
                              {isArabic ? 'سعر الوحدة:' : 'Unit:'}{' '}
                              <strong>{p.unitCostJOD.toFixed(2)} JOD</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block sm:hidden">{isArabic ? 'الإجمالي' : 'Total'}</span>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-xs inline-block">
                              {(p.totalCostJOD || p.quantity * p.unitCostJOD).toFixed(2)} JOD
                            </span>
                          </div>

                          {selectedWO.status !== 'closed' && canOperateOnSelectedWO && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditPart(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition"
                                title={isArabic ? 'تعديل السعر والكمية' : 'Edit price & quantity'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSparePart(p.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title={isArabic ? 'حذف القطعة' : 'Remove part'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add part form (Manual Price Entry Required) */}
              {selectedWO.status !== 'closed' && canOperateOnSelectedWO && (
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2.5 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <span>{isArabic ? 'إضافة قطعة غيار وتحديد قيمتها بالدينار الأردني' : 'Add Part with Custom JOD Price'}</span>
                    </span>
                    <span className="text-[10px] text-amber-400/90 font-medium">
                      {isArabic ? '* إدخال السعر يدوي وإلزامي (بدون قيمة افتراضية)' : '* Manual price required'}
                    </span>
                  </div>

                  {partCostError && (
                    <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5 animate-shake">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{partCostError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddSparePart} className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-300 block mb-1">
                          {isArabic ? 'اسم القطعة المستهلكة *' : 'Spare Part Name *'}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={isArabic ? 'مثال: شمعة احتراق MWM، فلتر زيت، جوان...' : 'Part name...'}
                          value={newPartName}
                          onChange={(e) => {
                            setNewPartName(e.target.value);
                            if (partCostError) setPartCostError(null);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-300 block mb-1">
                          {isArabic ? 'رقم / كود القطعة (Part No.)' : 'Part Number / Code'}
                        </label>
                        <input
                          type="text"
                          placeholder={isArabic ? 'مثال: MWM-2020-OIL-01' : 'e.g. MWM-2020-OIL-01'}
                          value={newPartNumber}
                          onChange={(e) => setNewPartNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-3">
                        <label className="text-[10px] font-semibold text-slate-300 block mb-1">
                          {isArabic ? 'الكمية (Qty) *' : 'Quantity *'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder={isArabic ? 'الكمية' : 'Qty'}
                          value={newPartQty}
                          onChange={(e) => setNewPartQty(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="text-[10px] font-bold text-amber-300 block mb-1 flex items-center justify-between">
                          <span>{isArabic ? 'سعر الوحدة بالدينار الأردني (JOD) *' : 'Unit Price (JOD) *'}</span>
                          <span className="text-[9px] text-slate-400 font-normal">{isArabic ? 'أدخل القيمة' : 'Enter price'}</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder={isArabic ? 'أدخل القيمة بالدينار (مثال: 85.50)' : 'Enter price in JOD'}
                            value={newPartCost}
                            onChange={(e) => {
                              setNewPartCost(e.target.value);
                              if (partCostError) setPartCostError(null);
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/70 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                          />
                          <span className="absolute left-3 top-2 text-xs font-mono font-bold text-amber-400 pointer-events-none">
                            JOD
                          </span>
                        </div>
                      </div>

                      <div className="sm:col-span-4 flex items-center gap-2">
                        <button
                          type="submit"
                          className="w-full px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{isArabic ? 'إضافة القطعة والتكلفة' : 'Add Part & Price'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Calculated live summary pill */}
                    {newPartCost !== '' && !isNaN(parseFloat(newPartCost)) && (
                      <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 font-mono">
                        <span className="text-[11px] text-slate-300">
                          {isArabic
                            ? `المجموع المحسوب (${newPartQty} قطعة × ${parseFloat(newPartCost).toFixed(2)} د.أ):`
                            : `Subtotal (${newPartQty} x ${parseFloat(newPartCost).toFixed(2)} JOD):`}
                        </span>
                        <strong className="text-emerald-400 font-bold">
                          {(Math.max(1, newPartQty) * parseFloat(newPartCost)).toFixed(2)} JOD
                        </strong>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>

            {/* Workflow Action Bar */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              {canOperateOnSelectedWO ? (
                <button
                  type="button"
                  onClick={handleSaveOperationalUpdates}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                >
                  {isArabic ? 'حفظ الملاحظات الفنية' : 'Save Notes'}
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isArabic ? 'عرض للقراءة فقط' : 'Read-only view'}</span>
                </span>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {canOperateOnSelectedWO && selectedWO.status === 'new' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                  >
                    {isArabic ? 'بدء العمل الفني' : 'Start Work'}
                  </button>
                )}

                {canOperateOnSelectedWO && selectedWO.status === 'in_progress' && (
                  <button
                    onClick={handleTechnicianNotifyCompletion}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'إشعار انتهاء التنفيذ ورفع التقرير 📝' : 'Notify Completion & Submit Report'}</span>
                  </button>
                )}

                {selectedWO.status === 'completed' && (
                  <div className="px-3 py-1.5 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>
                      {isArabic
                        ? 'تم إشعار الإنجاز من الفني (بانتظار اعتماد الإغلاق النهائي)'
                        : 'Completion notified (Pending final sign-off)'}
                    </span>
                  </div>
                )}

                {/* Closing requires Maintenance Manager or Admin permissions */}
                {selectedWO.status === 'completed' && canCloseWorkOrder && (
                  <button
                    onClick={handleCloseAndVerify}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>{t('closeWorkOrder')}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedWO(null);
                    setReportError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xs"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete/Purge Confirmation Modal (Strictly Admin Only) */}
      {woToDelete && canDeleteWorkOrders && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-2xl bg-rose-950 border border-rose-500/40">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isArabic ? 'تأكيد شطب أمر الصيانة نهائياً' : 'Confirm Work Order Purge'}
                </h3>
                <span className="text-xs font-mono font-bold text-rose-300">
                  {woToDelete.workOrderNumber} • {woToDelete.equipmentCode}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-xs text-rose-200 leading-relaxed space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  {isArabic
                    ? 'تنبيه أمني للأدمن: سيتم شطب هذا الأمر نهائياً بجميع حالاته وسجلاته'
                    : 'Admin Security Notice: This order will be permanently purged regardless of status.'}
                </span>
              </p>
              <p className="text-[11px] text-slate-300">
                {isArabic
                  ? 'لن يظهر أمر الصيانة هذا بعد حذفه لا عند الأدمن ولا عند المستخدمين أو الفنيين نهائياً، وسيتم توثيق عملية الشطب في سجل تدقيق النظام.'
                  : 'This order will disappear completely for all users and admins. An audit log entry will be recorded.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingWO}
                onClick={() => setWoToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                {isArabic ? 'إلغاء والتراجع' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingWO}
                onClick={handleConfirmDeleteWorkOrder}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isDeletingWO
                    ? isArabic
                      ? 'جاري الشطب...'
                      : 'Deleting...'
                    : isArabic
                    ? 'تأكيد الشطب والحذف نهائياً'
                    : 'Confirm Permanent Delete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Work Order Modal (Restricted to Authorized Roles) */}
      {showCreateModal && canCreateWorkOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">
                {isArabic ? 'إصدار أمر صيانة محطة' : 'Issue Work Order'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'المعدة المستهدفة *' : 'Target Equipment *'}
                </label>
                <select
                  value={newEquipmentId}
                  onChange={(e) => setNewEquipmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {allEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.code} — {isArabic ? eq.nameAr : eq.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'نوع الصيانة' : 'Type'}
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as WorkOrderType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="corrective">{t('woTypeCorrective')}</option>
                    <option value="preventive">{t('woTypePreventive')}</option>
                    <option value="emergency">{t('woTypeEmergency')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('priority')}
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="urgent">{t('priorityUrgent')}</option>
                    <option value="high">{t('priorityHigh')}</option>
                    <option value="medium">{t('priorityMedium')}</option>
                    <option value="low">{t('priorityLow')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('assignedTo')}
                </label>
                <select
                  value={newTechnicianId}
                  onChange={(e) => setNewTechnicianId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {allUsers
                    .filter((u) => u.role === 'technician' || u.role === 'maintenance_manager')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {isArabic ? u.nameAr : u.nameEn} ({u.jobTitleAr})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('problemDescription')} *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'وصف الأعطال، الأعراض الميكانيكية أو قراءات الإنذارات...'
                      : 'Describe failure symptoms or alarms...'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Optional: Add Spare Parts during WO Creation with required manual pricing */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isArabic ? 'قطع الغيار والتكلفة بالدينار (اختياري)' : 'Spare Parts & Cost in JOD (Optional)'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddPartInCreate(!showAddPartInCreate)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showAddPartInCreate ? (isArabic ? 'إخفاء الإضافة' : 'Hide') : (isArabic ? '+ إضافة قطعة وتكلفتها' : '+ Add Part')}</span>
                  </button>
                </div>

                {createParts.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {createParts.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-200 block">{p.nameAr}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {p.partNumber} • {p.quantity} x {p.unitCostJOD.toFixed(2)} JOD
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400 text-xs">
                            {p.totalCostJOD.toFixed(2)} JOD
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCreatePart(p.id)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-xs font-mono font-bold text-emerald-400 pt-1">
                      {isArabic ? 'إجمالي القطع المضافة:' : 'Total Parts Cost:'}{' '}
                      {createParts.reduce((acc, p) => acc + p.totalCostJOD, 0).toFixed(2)} JOD
                    </div>
                  </div>
                )}

                {showAddPartInCreate && (
                  <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2 text-xs">
                    <div className="font-bold text-emerald-300 text-[11px] flex items-center justify-between">
                      <span>{isArabic ? 'تحديد قطعة غيار وسعرها بالدينار (إدخال يدوي)' : 'Add Part (Manual Price)'}</span>
                      <span className="text-[10px] text-amber-400">{isArabic ? 'لا توجد قيمة افتراضية' : 'No defaults'}</span>
                    </div>

                    {createPartError && (
                      <div className="text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{createPartError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={isArabic ? 'اسم القطعة *' : 'Part Name *'}
                        value={createPartName}
                        onChange={(e) => setCreatePartName(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder={isArabic ? 'كود القطعة (اختياري)' : 'Part No. (optional)'}
                        value={createPartNumber}
                        onChange={(e) => setCreatePartNumber(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <label className="text-[10px] text-slate-300 block mb-0.5">{isArabic ? 'الكمية *' : 'Qty *'}</label>
                        <input
                          type="number"
                          min="1"
                          value={createPartQty}
                          onChange={(e) => setCreatePartQty(parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="col-span-5">
                        <label className="text-[10px] text-amber-300 font-bold block mb-0.5">{isArabic ? 'السعر بالدينار (JOD) *' : 'Price (JOD) *'}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={createPartCost}
                          onChange={(e) => setCreatePartCost(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-amber-500/70 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="col-span-3">
                        <button
                          type="button"
                          onClick={handleAddCreatePart}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isArabic ? 'إدراج' : 'Add'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  {isArabic ? 'إصدار أمر الصيانة' : 'Issue Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit Work Order Text & Details Modal */}
      {editingWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isArabic ? 'تحرير نص وبيانات أمر الصيانة' : 'Edit Work Order Details & Text'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mt-0.5">
                    <span>{editingWO.workOrderNumber}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-400">{editingWO.equipmentCode}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWO(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWOText} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'نص أمر الصيانة / نطاق العمل الوقائي والتصحيحي *' : 'Work Order Text / Scope *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'أدخل النص المحدث بدقة، متضمناً الأعطال أو خطوات الصيانة الوقائية...'
                      : 'Enter updated description or PM steps...'
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {isArabic ? 'نوع أمر الصيانة' : 'Type'}
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as WorkOrderType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="corrective">{t('woTypeCorrective')}</option>
                    <option value="preventive">{t('woTypePreventive')}</option>
                    <option value="emergency">{t('woTypeEmergency')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('priority')}
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="urgent">{t('priorityUrgent')}</option>
                    <option value="high">{t('priorityHigh')}</option>
                    <option value="medium">{t('priorityMedium')}</option>
                    <option value="low">{t('priorityLow')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'الفني المعين' : 'Assigned Technician'}
                </label>
                <select
                  value={editTechId}
                  onChange={(e) => setEditTechId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">{isArabic ? '-- اختر فنياً --' : '-- Select Tech --'}</option>
                  {allUsers
                    .filter((u) => u.role === 'technician' || u.role === 'maintenance_manager')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {isArabic ? u.nameAr : u.nameEn} ({u.jobTitleAr})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingWO(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  {isArabic ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
