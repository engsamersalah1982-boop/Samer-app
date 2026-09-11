export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'maintenance_manager'
  | 'technician'
  | 'employee';

export interface UserPermissions {
  canCreateWorkOrders: boolean;
  canEditWorkOrders: boolean;
  canExecuteWorkOrders: boolean;
  canCloseWorkOrder: boolean;
  canDeleteWorkOrders?: boolean;
  canManageEquipment: boolean;
  canUpdateOperatingHours: boolean;
  canApproveRequests: boolean;
  canCreateTasks: boolean;
  canDeleteTasks?: boolean;
  canCloseTasks?: boolean;
  canReassignTasks?: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canManageDocuments: boolean;
  canManageProcurement?: boolean;
  canApproveProcurement?: boolean;
}

export function getDefaultPermissionsForRole(role?: UserRole): UserPermissions {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return {
        canCreateWorkOrders: true,
        canEditWorkOrders: true,
        canExecuteWorkOrders: true,
        canCloseWorkOrder: true,
        canDeleteWorkOrders: true,
        canManageEquipment: true,
        canUpdateOperatingHours: true,
        canApproveRequests: true,
        canCreateTasks: true,
        canDeleteTasks: true,
        canCloseTasks: true,
        canReassignTasks: true,
        canManageUsers: true,
        canViewReports: true,
        canManageDocuments: true,
        canManageProcurement: true,
        canApproveProcurement: true,
      };
    case 'maintenance_manager':
      return {
        canCreateWorkOrders: true,
        canEditWorkOrders: true,
        canExecuteWorkOrders: true,
        canCloseWorkOrder: true,
        canDeleteWorkOrders: false,
        canManageEquipment: true,
        canUpdateOperatingHours: true,
        canApproveRequests: true,
        canCreateTasks: true,
        canDeleteTasks: false,
        canCloseTasks: true,
        canReassignTasks: true,
        canManageUsers: false,
        canViewReports: true,
        canManageDocuments: true,
        canManageProcurement: true,
        canApproveProcurement: true,
      };
    case 'technician':
      return {
        canCreateWorkOrders: false,
        canEditWorkOrders: false,
        canExecuteWorkOrders: true,
        canCloseWorkOrder: false,
        canDeleteWorkOrders: false,
        canManageEquipment: false,
        canUpdateOperatingHours: false,
        canApproveRequests: false,
        canCreateTasks: false,
        canDeleteTasks: false,
        canManageUsers: false,
        canViewReports: false,
        canManageDocuments: false,
        canManageProcurement: false,
        canApproveProcurement: false,
      };
    case 'employee':
    default:
      return {
        canCreateWorkOrders: false,
        canEditWorkOrders: false,
        canExecuteWorkOrders: false,
        canCloseWorkOrder: false,
        canDeleteWorkOrders: false,
        canManageEquipment: false,
        canUpdateOperatingHours: false,
        canApproveRequests: false,
        canCreateTasks: false,
        canDeleteTasks: false,
        canManageUsers: false,
        canViewReports: false,
        canManageDocuments: false,
        canManageProcurement: false,
        canApproveProcurement: false,
      };
  }
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name?: string;
  nameAr: string;
  nameEn: string;
  email: string;
  role: UserRole;
  department: string;
  jobTitleAr: string;
  jobTitleEn: string;
  phone?: string;
  avatar?: string;
  employeeId?: string;
  permissions?: Partial<UserPermissions>;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskChecklistItem {
  id: string;
  textAr: string;
  textEn: string;
  completed: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Task {
  id: string;
  taskCode: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  assignedToUserId: string;
  assignedByUserId: string;
  assignedToName?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  estimatedHours: number;
  actualHours?: number;
  actualHoursFormatted?: string; // "HHH:MM" format e.g. "012:30"
  actualMinutes?: number;
  completionNotes?: string;
  closedById?: string;
  closedByName?: string;
  closedAt?: string;
  adminApprovalNotes?: string;
  reopenedById?: string;
  reopenedByName?: string;
  reopenedAt?: string;
  reopenReason?: string;
  checklist: TaskChecklistItem[];
  attachments: TaskAttachment[];
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkOrderStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'pending_spare_parts'
  | 'completed'
  | 'closed';

export type WorkOrderType = 'preventive' | 'corrective' | 'emergency';

export interface SafetyChecklistItem {
  id: string;
  labelAr: string;
  labelEn: string;
  checked: boolean;
}

export interface SparePartItem {
  id: string;
  partNumber: string;
  nameAr: string;
  nameEn: string;
  quantity: number;
  unitCostJOD: number;
  totalCostJOD: number;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title?: string;
  type: WorkOrderType;
  priority: TaskPriority;
  equipmentId: string;
  equipmentCode?: string;
  assignedTechnicianId: string;
  assignedTechnicianName?: string;
  createdById: string;
  status: WorkOrderStatus;
  problemDescription: string;
  actionTaken?: string;
  completionNotes?: string;
  failureCause?: string;
  rootCause?: string;
  safetyChecklist: SafetyChecklistItem[];
  sparePartsUsed: SparePartItem[];
  downtimeHours: number;
  actualHours: number;
  actualHoursFormatted?: string;
  actualMinutes?: number;
  closedById?: string;
  closedByName?: string;
  closedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type EquipmentStatus = 'running' | 'under_maintenance' | 'stopped';

export interface Equipment {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  model: string;
  serialNumber: string;
  location: string;
  status: EquipmentStatus;
  operatingHours: number;
  lastMaintenanceDate?: string;
  specifications: Record<string, string | number>;
  qrCodeValue: string;
  installedDate: string;
}

export interface PMSchedule {
  id: string;
  equipmentId: string;
  titleAr: string;
  titleEn: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'operating_hours';
  operatingHoursInterval?: number;
  nextDueDate: string;
  lastTriggeredDate?: string;
  steps: string[];
  autoGenerateWorkOrder: boolean;
}

export type LeaveType = 'annual' | 'sick' | 'emergency' | 'unpaid';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  replacementEmployeeId?: string;
  status: RequestStatus;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  isBalanceDeducted?: boolean;
  createdAt: string;
}

export interface PermissionRequest {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  reasonType: 'personal' | 'official';
  reason: string;
  status: RequestStatus;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  isBalanceDeducted?: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  userId?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  jobTitleAr: string;
  jobTitleEn: string;
  department: string;
  phone: string;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
  permissionHoursBalance: number;
  status: 'active' | 'on_leave' | 'off_duty';
}

export type DocumentCategory =
  | 'manuals'
  | 'safety'
  | 'procedures'
  | 'reports'
  | 'permits'
  | 'catalogs';

export interface PlantDocument {
  id: string;
  titleAr: string;
  titleEn: string;
  category: DocumentCategory;
  description?: string;
  fileType: string;
  fileSizeBytes: number;
  fileName?: string;
  url: string;
  fileData?: string; // Base64 or Data URL for real preview and download
  tags: string[];
  department?: string;
  relatedAssetId?: string;
  relatedAssetName?: string;
  relatedTaskId?: string;
  uploadedById: string;
  uploadedByName?: string;
  uploadedBy?: string;
  uploadedByUserId?: string;
  fileSize?: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedByUserId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  ipAddress?: string;
}

export interface SystemNotification {
  id: string;
  userId: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface PlantProfile {
  facilityNameAr: string;
  facilityNameEn: string;
  subTitleAr: string;
  subTitleEn: string;
  companyNameAr: string;
  companyNameEn: string;
  locationAr: string;
  locationEn: string;
  installedCapacityAr: string;
  installedCapacityEn: string;
  gridConnectionAr: string;
  gridConnectionEn: string;
  plantDescriptionAr: string;
  plantDescriptionEn: string;
  environmentalImpactAr: string;
  environmentalImpactEn: string;
  lastUpdated?: string;
  updatedBy?: string;
}

// ==========================================
// PROCUREMENT & PETTY CASH (المشتريات والنثريات)
// ==========================================

export type PurchaseRequestType =
  | 'spare_part'
  | 'consumable'
  | 'tool_equipment'
  | 'service_subcontract'
  | 'safety_ppe'
  | 'general';

export type PurchasePriority = 'low' | 'medium' | 'high' | 'urgent';

export type PurchaseRequestStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'returned_for_changes'
  | 'purchased'
  | 'received'
  | 'invoice_uploaded'
  | 'reconciled'
  | 'closed'
  | 'cancelled';

export interface PurchaseAttachment {
  id: string;
  name: string;
  type: 'quotation' | 'invoice' | 'receipt' | 'delivery_note' | 'specs' | 'other';
  url: string;
  size?: string;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName?: string;
}

export interface PurchaseApproval {
  approvedById?: string;
  approvedByName?: string;
  approvalDate?: string;
  approvedAmount?: number;
  approvalNotes?: string;
  rejectionReason?: string;
  returnedChangesNotes?: string;
}

export interface PurchaseOrderDetails {
  supplier: string;
  supplierContact?: string;
  purchaseDate: string;
  poNumber?: string;
  actualUnitPrice: number;
  actualTotal: number;
  currency: string;
  paymentMethod: 'cash' | 'transfer' | 'cheque' | 'credit';
  buyerName: string;
  notes?: string;
  attachmentUrl?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
}

export interface ReceivingDetails {
  receivedDate: string;
  receivedById: string;
  receivedByName: string;
  quantityOrdered?: number;
  quantityReceived: number;
  remainingQuantity?: number;
  isPartial: boolean;
  condition: 'excellent' | 'acceptable' | 'damaged' | 'discrepancy';
  deliveryNoteNumber?: string;
  deliveryNoteUrl?: string;
  notes?: string;
}

export interface InvoiceDetails {
  invoiceNumber: string;
  invoiceDate: string;
  supplier: string;
  invoiceAmount: number;
  currency: string;
  paymentMethod: string;
  notes?: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedDate: string;
  attachmentUrl?: string;
}

export interface PurchaseReconciliation {
  reconciledDate: string;
  reconciledById: string;
  reconciledByName: string;
  estimatedTotal: number;
  actualTotal: number;
  variance: number;
  notes?: string;
}

export interface PurchaseRequest {
  id: string;
  requestNumber: string; // e.g. PR-2026-0001
  requestDate: string;
  requesterId: string;
  requesterName: string;
  department: string;
  section?: string;
  requestType: PurchaseRequestType;
  priority: PurchasePriority;
  requiredDate: string;
  itemDescription: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotal: number;
  currency: string;
  justification: string;
  suggestedSupplier?: string;
  supplierContact?: string;
  relatedEquipmentId?: string;
  relatedEquipmentName?: string;
  relatedTaskId?: string;
  relatedTaskCode?: string;
  projectCostCenter?: string;
  notes?: string;
  attachments: PurchaseAttachment[];
  status: PurchaseRequestStatus;
  approval?: PurchaseApproval;
  purchaseDetails?: PurchaseOrderDetails;
  receivingDetails?: ReceivingDetails;
  invoiceDetails?: InvoiceDetails;
  reconciliation?: PurchaseReconciliation;
  duplicateWarningAcknowledged?: boolean;
  duplicateWarningDetails?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Petty Cash
export type PettyCashStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'returned_for_changes'
  | 'cash_disbursed'
  | 'receipt_pending'
  | 'receipt_uploaded'
  | 'pending_reconciliation'
  | 'under_review'
  | 'reconciled'
  | 'closed'
  | 'cancelled';

export type PettyCashExpenseCategory =
  | 'emergency_fuel_oil'
  | 'urgent_hardware_tools'
  | 'hospitality_office'
  | 'transport_courier'
  | 'site_supplies'
  | 'maintenance_urgent'
  | 'operational_purchases'
  | 'other';

export interface PettyCashDisbursement {
  disbursedDate: string;
  disbursedById: string;
  disbursedByName: string;
  actualAmount: number;
  paymentMethod?: 'cash' | 'transfer' | 'voucher';
  paymentRef?: string;
  cashReference?: string;
  recipient?: string;
  notes?: string;
  attachmentUrl?: string;
}

export interface PettyCashReceipt {
  receiptNumber: string;
  receiptDate: string;
  supplier: string;
  receiptAmount: number;
  currency: string;
  notes?: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedDate: string;
  attachmentUrl: string;
}

export interface PettyCashReconciliation {
  reconciledDate: string;
  reconciledById: string;
  reconciledByName: string;
  spentAmount: number;
  returnedAmount: number;
  variance: number;
  receiptNumber?: string;
  receiptUrl?: string;
  returnDate?: string;
  returnReference?: string;
  settlementStatus?:
    | 'not_required'
    | 'pending_reconciliation'
    | 'under_review'
    | 'returned'
    | 'reconciled'
    | 'closed';
  notes?: string;
  attachmentUrl?: string;
}

export interface PettyCashRequest {
  id: string;
  requestNumber: string; // e.g. PC-2026-0001
  requestDate: string;
  requesterId: string;
  requesterName: string;
  department: string;
  amount: number;
  currency: string;
  purpose: string;
  description?: string;
  expenseCategory: PettyCashExpenseCategory;
  requiredDate: string;
  relatedTaskId?: string;
  relatedTaskCode?: string;
  relatedEquipmentId?: string;
  relatedEquipmentName?: string;
  relatedPurchaseRequestId?: string;
  relatedPurchaseRequestNumber?: string;
  notes?: string;
  attachments: PurchaseAttachment[];
  status: PettyCashStatus;
  approval?: PurchaseApproval;
  disbursement?: PettyCashDisbursement;
  receipt?: PettyCashReceipt;
  reconciliation?: PettyCashReconciliation;
  duplicateWarningAcknowledged?: boolean;
  duplicateWarningDetails?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  description?: string;
  active: boolean;
}

