import {
  PurchaseRequest,
  PettyCashRequest,
  ProcurementCategory,
  User,
  PurchaseRequestStatus,
  PettyCashStatus,
  PurchasePriority,
  PettyCashExpenseCategory,
  PurchaseOrderDetails,
  ReceivingDetails,
  InvoiceDetails,
  PurchaseReconciliation,
  PettyCashDisbursement,
  PettyCashReceipt,
  PettyCashReconciliation,
} from '../types';
import {
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_PETTY_CASH_REQUESTS,
  INITIAL_PROCUREMENT_CATEGORIES,
} from '../data/initialProcurement';
import { db } from './db';
import { firestoreSync } from './firestoreSync';

export const PURCHASE_REQUESTS_KEY = 'jbc_purchase_requests_v1';
export const PETTY_CASH_KEY = 'jbc_petty_cash_requests_v1';
export const PROCUREMENT_CATEGORIES_KEY = 'jbc_procurement_categories_v1';
const CURRENT_USER_KEY = 'jbc_current_user_v2';

export interface SimilarMatchResult {
  hasSimilar: boolean;
  matches: {
    request: PurchaseRequest | PettyCashRequest;
    type: 'purchase' | 'petty_cash';
    matchReasons: string[];
  }[];
}

class ProcurementService {
  private memoryPurchases: PurchaseRequest[] = [];
  private memoryPettyCash: PettyCashRequest[] = [];
  private memoryCategories: ProcurementCategory[] = [];
  private isInitialized = false;
  private inFlightSync: Promise<void> | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.initFromLocal();
    this.syncFromBackend().catch(() => {});
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Procurement listener error:', err);
      }
    }
  }

  private getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return null;
  }

  private getHeaders(actor?: User): Record<string, string> {
    const user = actor || this.getCurrentUser();
    const rawName = user?.nameAr || user?.nameEn || 'User';
    return {
      'Content-Type': 'application/json',
      'x-user-id': user?.id || 'usr-admin',
      'x-user-name': encodeURIComponent(rawName),
      'x-user-role': user?.role || 'employee',
    };
  }

  private initFromLocal() {
    try {
      const prRaw = localStorage.getItem(PURCHASE_REQUESTS_KEY);
      this.memoryPurchases = prRaw ? JSON.parse(prRaw) : INITIAL_PURCHASE_REQUESTS;

      const pcRaw = localStorage.getItem(PETTY_CASH_KEY);
      this.memoryPettyCash = pcRaw ? JSON.parse(pcRaw) : INITIAL_PETTY_CASH_REQUESTS;

      const catRaw = localStorage.getItem(PROCUREMENT_CATEGORIES_KEY);
      this.memoryCategories = catRaw ? JSON.parse(catRaw) : INITIAL_PROCUREMENT_CATEGORIES;
      if (!this.memoryCategories || this.memoryCategories.length === 0) {
        this.memoryCategories = [...INITIAL_PROCUREMENT_CATEGORIES];
      }
    } catch (e) {
      console.warn('ProcurementService: local init fallback', e);
      this.memoryPurchases = INITIAL_PURCHASE_REQUESTS;
      this.memoryPettyCash = INITIAL_PETTY_CASH_REQUESTS;
      this.memoryCategories = INITIAL_PROCUREMENT_CATEGORIES;
    }
  }

  private saveToLocal(notify = true) {
    try {
      localStorage.setItem(PURCHASE_REQUESTS_KEY, JSON.stringify(this.memoryPurchases));
      localStorage.setItem(PETTY_CASH_KEY, JSON.stringify(this.memoryPettyCash));
      localStorage.setItem(PROCUREMENT_CATEGORIES_KEY, JSON.stringify(this.memoryCategories));
      firestoreSync.pushUpdate(PURCHASE_REQUESTS_KEY, this.memoryPurchases);
      firestoreSync.pushUpdate(PETTY_CASH_KEY, this.memoryPettyCash);
      firestoreSync.pushUpdate(PROCUREMENT_CATEGORIES_KEY, this.memoryCategories);
      if (notify) {
        window.dispatchEvent(new CustomEvent('jbc-data-updated', { detail: { key: PURCHASE_REQUESTS_KEY } }));
        window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
        this.notifyListeners();
      }
    } catch (e) {
      console.error('Procurement local save failed', e);
    }
  }

  public async syncFromBackend(): Promise<void> {
    if (this.inFlightSync) {
      return this.inFlightSync;
    }

    this.inFlightSync = (async () => {
      try {
        const currentUser = this.getCurrentUser();
        const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'maintenance_manager');

        const [prRes, pcRes, catRes] = await Promise.allSettled([
          fetch('/api/procurement/purchase-requests?includeDeleted=true', { headers: this.getHeaders() }),
          fetch('/api/procurement/petty-cash?includeDeleted=true', { headers: this.getHeaders() }),
          fetch('/api/procurement/categories', { headers: this.getHeaders() }),
        ]);

        if (prRes.status === 'fulfilled' && prRes.value.ok) {
          const prData = await prRes.value.json();
          if (Array.isArray(prData)) {
            if (isAdmin) {
              this.memoryPurchases = prData;
            } else {
              const others = this.memoryPurchases.filter((p) => p.requesterId !== currentUser?.id);
              this.memoryPurchases = [...prData, ...others];
            }
          }
        }

        if (pcRes.status === 'fulfilled' && pcRes.value.ok) {
          const pcData = await pcRes.value.json();
          if (Array.isArray(pcData)) {
            if (isAdmin) {
              this.memoryPettyCash = pcData;
            } else {
              const others = this.memoryPettyCash.filter((p) => p.requesterId !== currentUser?.id);
              this.memoryPettyCash = [...pcData, ...others];
            }
          }
        }

        if (catRes.status === 'fulfilled' && catRes.value.ok) {
          const catData = await catRes.value.json();
          if (Array.isArray(catData) && catData.length > 0) {
            this.memoryCategories = catData;
          }
        }

        this.isInitialized = true;
        // Do NOT notify listeners from syncFromBackend to prevent recursive event loops!
        this.saveToLocal(false);
      } catch (err) {
        console.warn('Backend sync failed, continuing with local persistence:', err);
      } finally {
        this.inFlightSync = null;
      }
    })();

    return this.inFlightSync;
  }

  public async loadPurchaseRequests(): Promise<PurchaseRequest[]> {
    await this.syncFromBackend();
    return this.getPurchaseRequests();
  }

  public async loadPettyCashRequests(): Promise<PettyCashRequest[]> {
    await this.syncFromBackend();
    return this.getPettyCashRequests();
  }

  public addCategory(nameAr: string, nameEn: string): ProcurementCategory {
    const newCat: ProcurementCategory = {
      id: `cat-${Date.now()}`,
      code: `CAT-${Date.now().toString().slice(-4)}`,
      nameAr,
      nameEn,
      active: true,
    };
    this.memoryCategories.push(newCat);
    this.saveToLocal();
    fetch('/api/procurement/categories', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(newCat),
    }).catch((err) => console.warn('Category sync failed:', err));
    return newCat;
  }

  // ==========================================
  // PERMANENT FILE UPLOADER
  // ==========================================
  public async uploadFile(file: File): Promise<{
    url: string;
    fileName: string;
    size: string;
    mimeType: string;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result as string;
          const res = await fetch('/api/procurement/upload', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              fileName: file.name,
              fileData,
              mimeType: file.type,
            }),
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.message || 'File upload failed');
          }

          const result = await res.json();
          resolve(result);
        } catch (err) {
          // If server upload fails (e.g. offline preview), persist as base64 data URL
          console.warn('Backend upload fallback to data URL:', err);
          resolve({
            url: reader.result as string,
            fileName: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            mimeType: file.type,
          });
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  // ==========================================
  // PURCHASE REQUESTS
  // ==========================================

  public getPurchaseRequests(options?: {
    status?: PurchaseRequestStatus;
    requesterId?: string;
    includeDeleted?: boolean;
  }): PurchaseRequest[] {
    let list = [...this.memoryPurchases];
    if (!options?.includeDeleted) {
      list = list.filter((p) => !p.deleted);
    }
    if (options?.status) {
      list = list.filter((p) => p.status === options.status);
    }
    if (options?.requesterId) {
      list = list.filter((p) => p.requesterId === options.requesterId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getPurchaseRequestById(id: string): PurchaseRequest | undefined {
    return this.memoryPurchases.find((p) => p.id === id);
  }

  public async createPurchaseRequest(
    data: Partial<PurchaseRequest>,
    saveAsDraftOrActor: boolean | User = false,
    duplicateWarningAcknowledged = false
  ): Promise<PurchaseRequest> {
    const saveAsDraft = typeof saveAsDraftOrActor === 'boolean' ? saveAsDraftOrActor : false;
    const actor = typeof saveAsDraftOrActor === 'object' && saveAsDraftOrActor !== null ? saveAsDraftOrActor : this.getCurrentUser();
    
    const payload = {
      ...data,
      requesterId: actor?.id || data.requesterId || 'usr-admin',
      requesterName: actor?.nameAr || data.requesterName || 'الموظف',
      department: actor?.department || data.department || 'الموقع',
      saveAsDraft,
      duplicateWarningAcknowledged: duplicateWarningAcknowledged || Boolean(data.duplicateWarningAcknowledged),
    };

    let created: PurchaseRequest | null = null;
    try {
      const res = await fetch('/api/procurement/purchase-requests', {
        method: 'POST',
        headers: this.getHeaders(actor),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        created = await res.json();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create purchase request');
      }
    } catch (e: any) {
      console.warn('API call failed, saving locally:', e);
      // Local fallback
      const year = new Date().getFullYear();
      const count = this.memoryPurchases.length + 1;
      const requestNumber = `PR-${year}-${String(count).padStart(4, '0')}`;
      created = {
        id: `pr-${Date.now()}`,
        requestNumber,
        requestDate: new Date().toISOString(),
        requesterId: actor?.id || 'usr-default',
        requesterName: actor?.nameAr || 'الموظف',
        department: actor?.department || data.department || 'الموقع',
        section: data.section || '',
        requestType: data.requestType || 'consumable',
        priority: data.priority || 'medium',
        requiredDate: data.requiredDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        itemDescription: data.itemDescription || '',
        category: data.category || 'عام',
        quantity: Number(data.quantity) || 1,
        unit: data.unit || 'قطعة',
        estimatedUnitPrice: Number(data.estimatedUnitPrice) || 0,
        estimatedTotal: (Number(data.quantity) || 1) * (Number(data.estimatedUnitPrice) || 0),
        currency: data.currency || 'JOD',
        justification: data.justification || '',
        suggestedSupplier: data.suggestedSupplier || '',
        supplierContact: data.supplierContact || '',
        relatedEquipmentId: data.relatedEquipmentId || '',
        relatedEquipmentName: data.relatedEquipmentName || '',
        relatedTaskId: data.relatedTaskId || '',
        relatedTaskCode: data.relatedTaskCode || '',
        projectCostCenter: data.projectCostCenter || '',
        notes: data.notes || '',
        attachments: data.attachments || [],
        status: saveAsDraft ? 'draft' : 'pending_approval',
        duplicateWarningAcknowledged: Boolean(data.duplicateWarningAcknowledged),
        duplicateWarningDetails: data.duplicateWarningDetails || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (created) {
      this.memoryPurchases.unshift(created);
      this.saveToLocal();
      if (!saveAsDraft) {
        db.sendNotificationToAdmins({
          titleAr: 'طلب شراء جديد بانتظار الاعتماد 📋',
          titleEn: 'New Purchase Request Submitted',
          messageAr: `قدم ${created.requesterName} طلب شراء (${created.requestNumber}) لمادة "${created.itemDescription}" بقيمة تقديرية ${created.estimatedTotal} ${created.currency}.`,
          messageEn: `${created.requesterName} submitted PR (${created.requestNumber}) for "${created.itemDescription}".`,
          type: 'info',
          actionUrl: 'procurement',
        });
      }
      return created;
    }
    throw new Error('Could not create purchase request');
  }

  public async updatePurchaseRequest(
    id: string,
    updates: Partial<PurchaseRequest>,
    _actor?: User
  ): Promise<PurchaseRequest> {
    const res = await fetch(`/api/procurement/purchase-requests/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update request');
    }

    const updated = await res.json();
    const idx = this.memoryPurchases.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.memoryPurchases[idx] = updated;
      this.saveToLocal();
    }
    return updated;
  }

  // DELETE PURCHASE REQUEST (Admin can delete ANY status, employee only own draft)
  public async deletePurchaseRequest(id: string, actor?: User): Promise<boolean> {
    const user = actor || this.getCurrentUser();
    // 1. Immediately perform local deletion so it never fails or delays
    const idx = this.memoryPurchases.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.memoryPurchases[idx].deleted = true;
      this.memoryPurchases[idx].deletedAt = new Date().toISOString();
      this.memoryPurchases[idx].deletedBy = user?.nameAr || 'م. سامر صلاح (مدير النظام)';
      this.saveToLocal();
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
    }

    // 2. Sync with backend API
    try {
      const res = await fetch(`/api/procurement/purchase-requests/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(actor),
      });
      if (!res.ok) {
        console.warn('Backend delete returned non-ok, local deletion kept:', res.status);
      }
    } catch (err) {
      console.warn('Backend delete fetch failed, local deletion preserved:', err);
    }

    return true;
  }

  public async submitPurchaseRequest(id: string): Promise<PurchaseRequest> {
    const res = await fetch(`/api/procurement/purchase-requests/${id}/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit request');
    }
    const updated = await res.json();
    this.updateLocalPR(updated);
    db.sendNotificationToAdmins({
      titleAr: 'طلب شراء تم تقديمه للاعتماد 📋',
      titleEn: 'Purchase Request Submitted for Approval',
      messageAr: `قام ${updated.requesterName} بتقديم طلب الشراء (${updated.requestNumber}) للاعتماد.`,
      messageEn: `${updated.requesterName} submitted PR (${updated.requestNumber}) for approval.`,
      type: 'info',
      actionUrl: 'procurement',
    });
    return updated;
  }

  public async approvePurchaseRequest(
    id: string,
    notes?: string,
    approvedAmount?: number,
    actor?: User
  ): Promise<PurchaseRequest> {
    const user = actor || this.getCurrentUser();
    let updatedObj: PurchaseRequest | null = null;

    // 1. Immediately perform local approval
    const idx = this.memoryPurchases.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const existing = this.memoryPurchases[idx];
      const approvedAmt = Number(approvedAmount) || existing.estimatedTotal;
      this.memoryPurchases[idx] = {
        ...existing,
        status: 'approved',
        updatedAt: new Date().toISOString(),
        approval: {
          approvedById: user?.id || 'usr-admin',
          approvedByName: user?.nameAr || 'م. سامر صلاح (مدير النظام)',
          approvalDate: new Date().toISOString(),
          approvedAmount: approvedAmt,
          approvalNotes: notes || 'تم الاعتماد والموافقة رسمياً',
        },
      };
      updatedObj = this.memoryPurchases[idx];
      this.saveToLocal();
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
    }

    // 2. Sync with backend API
    try {
      const res = await fetch(`/api/procurement/purchase-requests/${id}/approve`, {
        method: 'POST',
        headers: this.getHeaders(actor),
        body: JSON.stringify({ notes, approvedAmount }),
      });
      if (res.ok) {
        const serverUpdated = await res.json();
        this.updateLocalPR(serverUpdated);
        updatedObj = serverUpdated;
      }
    } catch (err) {
      console.warn('Backend approve fetch failed, local approval preserved:', err);
    }

    if (updatedObj) {
      if (updatedObj.requesterId) {
        db.sendNotification({
          userId: updatedObj.requesterId,
          titleAr: 'تمت الموافقة على طلب الشراء ✅',
          titleEn: 'Purchase Request Approved',
          messageAr: `تم اعتماد طلب الشراء (${updatedObj.requestNumber}) لمادة "${updatedObj.itemDescription}".`,
          messageEn: `Purchase Request (${updatedObj.requestNumber}) has been approved.`,
          type: 'success',
          actionUrl: 'procurement',
        });
      }
      return updatedObj;
    }
    throw new Error('Failed to approve request');
  }

  public async rejectPurchaseRequest(id: string, reason: string, actor?: User): Promise<PurchaseRequest> {
    let updatedObj: PurchaseRequest | null = null;

    const idx = this.memoryPurchases.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.memoryPurchases[idx] = {
        ...this.memoryPurchases[idx],
        status: 'rejected',
        updatedAt: new Date().toISOString(),
        notes: (this.memoryPurchases[idx].notes ? `${this.memoryPurchases[idx].notes}\n` : '') + `[سبب الرفض: ${reason}]`,
      };
      updatedObj = this.memoryPurchases[idx];
      this.saveToLocal();
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
    }

    try {
      const res = await fetch(`/api/procurement/purchase-requests/${id}/reject`, {
        method: 'POST',
        headers: this.getHeaders(actor),
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        const serverUpdated = await res.json();
        this.updateLocalPR(serverUpdated);
        updatedObj = serverUpdated;
      }
    } catch (err) {
      console.warn('Backend reject fetch failed, local rejection preserved:', err);
    }

    if (updatedObj) {
      if (updatedObj.requesterId) {
        db.sendNotification({
          userId: updatedObj.requesterId,
          titleAr: 'تم رفض طلب الشراء ⚠️',
          titleEn: 'Purchase Request Rejected',
          messageAr: `تم رفض طلب الشراء (${updatedObj.requestNumber}). السبب: ${reason}`,
          messageEn: `Purchase Request (${updatedObj.requestNumber}) was rejected: ${reason}`,
          type: 'alert',
          actionUrl: 'procurement',
        });
      }
      return updatedObj;
    }
    throw new Error('Failed to reject request');
  }

  public async returnPurchaseRequest(id: string, comment: string, actor?: User): Promise<PurchaseRequest> {
    let updatedObj: PurchaseRequest | null = null;

    const idx = this.memoryPurchases.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.memoryPurchases[idx] = {
        ...this.memoryPurchases[idx],
        status: 'returned_for_changes',
        updatedAt: new Date().toISOString(),
        notes: (this.memoryPurchases[idx].notes ? `${this.memoryPurchases[idx].notes}\n` : '') + `[توجيهات التعديل: ${comment}]`,
      };
      updatedObj = this.memoryPurchases[idx];
      this.saveToLocal();
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
    }

    try {
      const res = await fetch(`/api/procurement/purchase-requests/${id}/return`, {
        method: 'POST',
        headers: this.getHeaders(actor),
        body: JSON.stringify({ comment }),
      });
      if (res.ok) {
        const serverUpdated = await res.json();
        this.updateLocalPR(serverUpdated);
        updatedObj = serverUpdated;
      }
    } catch (err) {
      console.warn('Backend return fetch failed, local change preserved:', err);
    }

    if (updatedObj) {
      if (updatedObj.requesterId) {
        db.sendNotification({
          userId: updatedObj.requesterId,
          titleAr: 'إرجاع طلب الشراء للتعديل 🔄',
          titleEn: 'Purchase Request Returned for Changes',
          messageAr: `تم إرجاع طلب الشراء (${updatedObj.requestNumber}) للتعديل: ${comment}`,
          messageEn: `Purchase Request (${updatedObj.requestNumber}) returned: ${comment}`,
          type: 'warning',
          actionUrl: 'procurement',
        });
      }
      return updatedObj;
    }
    throw new Error('Failed to return request');
  }

  public async markPurchased(id: string, details: PurchaseOrderDetails): Promise<PurchaseRequest> {
    const res = await fetch(`/api/procurement/purchase-requests/${id}/purchase`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(details),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to mark as purchased');
    }
    const updated = await res.json();
    this.updateLocalPR(updated);
    if (updated.requesterId) {
      db.sendNotification({
        userId: updated.requesterId,
        titleAr: 'تم تنفيذ أمر الشراء والتوريد 🛒',
        titleEn: 'Purchase Order Executed',
        messageAr: `تم إصدار أمر الشراء (${updated.requestNumber}) لمادة "${updated.itemDescription}".`,
        messageEn: `Purchase order placed for (${updated.requestNumber}).`,
        type: 'info',
        actionUrl: 'procurement',
      });
    }
    return updated;
  }

  public async markReceived(id: string, details: Partial<ReceivingDetails>): Promise<PurchaseRequest> {
    const res = await fetch(`/api/procurement/purchase-requests/${id}/receive`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(details),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to mark as received');
    }
    const updated = await res.json();
    this.updateLocalPR(updated);
    db.sendNotificationToAdmins({
      titleAr: 'تم استلام وتوثيق مواد طلب الشراء 📦',
      titleEn: 'Materials Received at Plant',
      messageAr: `تم استلام مواد طلب الشراء (${updated.requestNumber}) لمادة "${updated.itemDescription}".`,
      messageEn: `Materials received for PR (${updated.requestNumber}).`,
      type: 'success',
      actionUrl: 'procurement',
    });
    return updated;
  }

  public async uploadInvoice(id: string, details: Partial<InvoiceDetails>): Promise<PurchaseRequest> {
    const res = await fetch(`/api/procurement/purchase-requests/${id}/upload-invoice`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(details),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to upload invoice');
    }
    const updated = await res.json();
    this.updateLocalPR(updated);
    return updated;
  }

  public async reconcilePurchase(id: string, notes?: string): Promise<PurchaseRequest> {
    const res = await fetch(`/api/procurement/purchase-requests/${id}/reconcile`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to reconcile purchase');
    }
    const updated = await res.json();
    this.updateLocalPR(updated);
    return updated;
  }

  public async closePurchase(id: string): Promise<PurchaseRequest> {
    const res = await fetch(`/api/procurement/purchase-requests/${id}/close`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to close request');
    }
    const updated = await res.json();
    this.updateLocalPR(updated);
    return updated;
  }

  public async cancelPurchase(id: string, actor?: User): Promise<PurchaseRequest> {
    let updatedObj: PurchaseRequest | null = null;

    // 1. Immediately perform local cancellation
    const idx = this.memoryPurchases.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.memoryPurchases[idx] = {
        ...this.memoryPurchases[idx],
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      };
      updatedObj = this.memoryPurchases[idx];
      this.saveToLocal();
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
    }

    // 2. Sync with backend
    try {
      const res = await fetch(`/api/procurement/purchase-requests/${id}/cancel`, {
        method: 'POST',
        headers: this.getHeaders(actor),
      });
      if (res.ok) {
        const serverUpdated = await res.json();
        this.updateLocalPR(serverUpdated);
        return serverUpdated;
      }
    } catch (err) {
      console.warn('Backend cancel fetch failed, local cancellation preserved:', err);
    }

    if (updatedObj) return updatedObj;
    throw new Error('Failed to cancel request');
  }

  public async acknowledgeDuplicate(id: string, details?: string): Promise<PurchaseRequest> {
    const res = await fetch(`/api/procurement/purchase-requests/${id}/duplicate-acknowledged`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ details }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to acknowledge duplicate');
    }
    const updated = await res.json();
    this.updateLocalPR(updated);
    return updated;
  }

  private updateLocalPR(updated: PurchaseRequest) {
    const idx = this.memoryPurchases.findIndex((p) => p.id === updated.id);
    if (idx !== -1) {
      this.memoryPurchases[idx] = updated;
    } else {
      this.memoryPurchases.unshift(updated);
    }
    this.saveToLocal();
  }

  // ==========================================
  // PETTY CASH REQUESTS
  // ==========================================

  public getPettyCashRequests(options?: {
    status?: PettyCashStatus;
    requesterId?: string;
    includeDeleted?: boolean;
  }): PettyCashRequest[] {
    let list = [...this.memoryPettyCash];
    if (!options?.includeDeleted) {
      list = list.filter((p) => !p.deleted);
    }
    if (options?.status) {
      list = list.filter((p) => p.status === options.status);
    }
    if (options?.requesterId) {
      list = list.filter((p) => p.requesterId === options.requesterId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getPettyCashById(id: string): PettyCashRequest | undefined {
    return this.memoryPettyCash.find((p) => p.id === id);
  }

  public async createPettyCashRequest(
    data: Partial<PettyCashRequest>,
    saveAsDraftOrActor: boolean | User = false,
    duplicateWarningAcknowledged = false
  ): Promise<PettyCashRequest> {
    const saveAsDraft = typeof saveAsDraftOrActor === 'boolean' ? saveAsDraftOrActor : false;
    const actor = typeof saveAsDraftOrActor === 'object' && saveAsDraftOrActor !== null ? saveAsDraftOrActor : this.getCurrentUser();
    const payload = {
      ...data,
      requesterId: actor?.id || data.requesterId || 'usr-admin',
      requesterName: actor?.nameAr || data.requesterName || 'الموظف',
      department: actor?.department || data.department || 'الموقع',
      saveAsDraft,
      duplicateWarningAcknowledged: duplicateWarningAcknowledged || Boolean(data.duplicateWarningAcknowledged),
    };

    let created: PettyCashRequest | null = null;
    try {
      const res = await fetch('/api/procurement/petty-cash', {
        method: 'POST',
        headers: this.getHeaders(actor),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        created = await res.json();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create petty cash');
      }
    } catch (e: any) {
      console.warn('API call failed, saving locally:', e);
      const year = new Date().getFullYear();
      const count = this.memoryPettyCash.length + 1;
      const requestNumber = `PC-${year}-${String(count).padStart(4, '0')}`;
      created = {
        id: `pc-${Date.now()}`,
        requestNumber,
        requestDate: new Date().toISOString(),
        requesterId: actor?.id || 'usr-default',
        requesterName: actor?.nameAr || 'الموظف',
        department: actor?.department || data.department || 'الموقع',
        amount: Number(data.amount) || 0,
        currency: data.currency || 'JOD',
        purpose: data.purpose || '',
        description: data.description || '',
        expenseCategory: data.expenseCategory || 'site_supplies',
        requiredDate: data.requiredDate || new Date().toISOString().split('T')[0],
        relatedTaskId: data.relatedTaskId || '',
        relatedTaskCode: data.relatedTaskCode || '',
        relatedEquipmentId: data.relatedEquipmentId || '',
        relatedEquipmentName: data.relatedEquipmentName || '',
        relatedPurchaseRequestId: data.relatedPurchaseRequestId || '',
        relatedPurchaseRequestNumber: data.relatedPurchaseRequestNumber || '',
        notes: data.notes || '',
        attachments: data.attachments || [],
        status: saveAsDraft ? 'draft' : 'pending_approval',
        duplicateWarningAcknowledged: Boolean(data.duplicateWarningAcknowledged),
        duplicateWarningDetails: data.duplicateWarningDetails || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (created) {
      this.memoryPettyCash.unshift(created);
      this.saveToLocal();
      if (!saveAsDraft) {
        db.sendNotificationToAdmins({
          titleAr: 'طلب سلفة نثريات جديد بانتظار الاعتماد 💵',
          titleEn: 'New Petty Cash Request Submitted',
          messageAr: `قدم ${created.requesterName} سند نثريات (${created.requestNumber}) بقيمة ${created.amount} ${created.currency} لغاية: ${created.purpose}.`,
          messageEn: `${created.requesterName} submitted Petty Cash (${created.requestNumber}).`,
          type: 'info',
          actionUrl: 'procurement',
        });
      }
      return created;
    }
    throw new Error('Could not create petty cash request');
  }

  public async updatePettyCashRequest(
    id: string,
    updates: Partial<PettyCashRequest>,
    _actor?: User
  ): Promise<PettyCashRequest> {
    const res = await fetch(`/api/procurement/petty-cash/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update petty cash');
    }
    const updated = await res.json();
    this.updateLocalPC(updated);
    return updated;
  }

  // DELETE PETTY CASH (Admin can delete ANY status, employee only own draft)
  public async deletePettyCashRequest(id: string, actor?: User): Promise<boolean> {
    const user = actor || this.getCurrentUser();
    // 1. Immediately perform local deletion
    const idx = this.memoryPettyCash.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.memoryPettyCash[idx].deleted = true;
      this.memoryPettyCash[idx].deletedAt = new Date().toISOString();
      this.memoryPettyCash[idx].deletedBy = user?.nameAr || 'م. سامر صلاح (مدير النظام)';
      this.saveToLocal();
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
    }

    // 2. Sync with backend
    try {
      const res = await fetch(`/api/procurement/petty-cash/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(actor),
      });
      if (!res.ok) {
        console.warn('Backend delete petty cash returned non-ok, local change preserved:', res.status);
      }
    } catch (err) {
      console.warn('Backend delete petty cash failed, local change preserved:', err);
    }

    return true;
  }

  public async submitPettyCash(id: string): Promise<PettyCashRequest> {
    const res = await fetch(`/api/procurement/petty-cash/${id}/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit petty cash');
    }
    const updated = await res.json();
    this.updateLocalPC(updated);
    db.sendNotificationToAdmins({
      titleAr: 'سند نثريات مقدم للاعتماد 💵',
      titleEn: 'Petty Cash Submitted for Approval',
      messageAr: `قدم ${updated.requesterName} سند النثريات (${updated.requestNumber}) للاعتماد.`,
      messageEn: `${updated.requesterName} submitted Petty Cash (${updated.requestNumber}) for approval.`,
      type: 'info',
      actionUrl: 'procurement',
    });
    return updated;
  }

  public async approvePettyCash(
    id: string,
    notes?: string,
    approvedAmount?: number,
    actor?: User
  ): Promise<PettyCashRequest> {
    const user = actor || this.getCurrentUser();
    let updatedObj: PettyCashRequest | null = null;

    // 1. Immediately perform local approval
    const idx = this.memoryPettyCash.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const existing = this.memoryPettyCash[idx];
      const approvedAmt = Number(approvedAmount) || existing.amount;
      this.memoryPettyCash[idx] = {
        ...existing,
        status: 'approved',
        updatedAt: new Date().toISOString(),
        approval: {
          approvedById: user?.id || 'usr-admin',
          approvedByName: user?.nameAr || 'م. سامر صلاح (مدير النظام)',
          approvalDate: new Date().toISOString(),
          approvedAmount: approvedAmt,
          approvalNotes: notes || 'معتمد رسمياً',
        },
      };
      updatedObj = this.memoryPettyCash[idx];
      this.saveToLocal();
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
    }

    // 2. Sync with backend
    try {
      const res = await fetch(`/api/procurement/petty-cash/${id}/approve`, {
        method: 'POST',
        headers: this.getHeaders(actor),
        body: JSON.stringify({ notes, approvedAmount }),
      });
      if (res.ok) {
        const serverUpdated = await res.json();
        this.updateLocalPC(serverUpdated);
        updatedObj = serverUpdated;
      }
    } catch (err) {
      console.warn('Backend approve petty cash failed, local change preserved:', err);
    }

    if (updatedObj) {
      if (updatedObj.requesterId) {
        db.sendNotification({
          userId: updatedObj.requesterId,
          titleAr: 'تم اعتماد سند النثريات ✅',
          titleEn: 'Petty Cash Approved',
          messageAr: `تمت الموافقة على سند النثريات (${updatedObj.requestNumber}) بمبلغ ${updatedObj.approval?.approvedAmount || updatedObj.amount} ${updatedObj.currency}.`,
          messageEn: `Petty Cash (${updatedObj.requestNumber}) has been approved.`,
          type: 'success',
          actionUrl: 'procurement',
        });
      }
      return updatedObj;
    }
    throw new Error('Failed to approve petty cash');
  }

  public async rejectPettyCash(id: string, reason: string, actor?: User): Promise<PettyCashRequest> {
    let updatedObj: PettyCashRequest | null = null;

    const idx = this.memoryPettyCash.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.memoryPettyCash[idx] = {
        ...this.memoryPettyCash[idx],
        status: 'rejected',
        updatedAt: new Date().toISOString(),
        notes: (this.memoryPettyCash[idx].notes ? `${this.memoryPettyCash[idx].notes}\n` : '') + `[سبب الرفض: ${reason}]`,
      };
      updatedObj = this.memoryPettyCash[idx];
      this.saveToLocal();
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
    }

    try {
      const res = await fetch(`/api/procurement/petty-cash/${id}/reject`, {
        method: 'POST',
        headers: this.getHeaders(actor),
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        const serverUpdated = await res.json();
        this.updateLocalPC(serverUpdated);
        updatedObj = serverUpdated;
      }
    } catch (err) {
      console.warn('Backend reject petty cash failed, local change preserved:', err);
    }

    if (updatedObj) {
      if (updatedObj.requesterId) {
        db.sendNotification({
          userId: updatedObj.requesterId,
          titleAr: 'تم رفض سند النثريات ⚠️',
          titleEn: 'Petty Cash Rejected',
          messageAr: `تم رفض سند النثريات (${updatedObj.requestNumber}). السبب: ${reason}`,
          messageEn: `Petty Cash (${updatedObj.requestNumber}) was rejected: ${reason}`,
          type: 'alert',
          actionUrl: 'procurement',
        });
      }
      return updatedObj;
    }
    throw new Error('Failed to reject petty cash');
  }

  public async returnPettyCash(id: string, comment: string, actor?: User): Promise<PettyCashRequest> {
    let updatedObj: PettyCashRequest | null = null;

    const idx = this.memoryPettyCash.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.memoryPettyCash[idx] = {
        ...this.memoryPettyCash[idx],
        status: 'returned_for_changes',
        updatedAt: new Date().toISOString(),
        notes: (this.memoryPettyCash[idx].notes ? `${this.memoryPettyCash[idx].notes}\n` : '') + `[توجيهات التعديل: ${comment}]`,
      };
      updatedObj = this.memoryPettyCash[idx];
      this.saveToLocal();
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
    }

    try {
      const res = await fetch(`/api/procurement/petty-cash/${id}/return`, {
        method: 'POST',
        headers: this.getHeaders(actor),
        body: JSON.stringify({ comment }),
      });
      if (res.ok) {
        const serverUpdated = await res.json();
        this.updateLocalPC(serverUpdated);
        updatedObj = serverUpdated;
      }
    } catch (err) {
      console.warn('Backend return petty cash failed, local change preserved:', err);
    }

    if (updatedObj) {
      if (updatedObj.requesterId) {
        db.sendNotification({
          userId: updatedObj.requesterId,
          titleAr: 'إرجاع سند النثريات للتعديل 🔄',
          titleEn: 'Petty Cash Returned for Changes',
          messageAr: `تم إرجاع سند النثريات (${updatedObj.requestNumber}) للتعديل: ${comment}`,
          messageEn: `Petty Cash (${updatedObj.requestNumber}) returned: ${comment}`,
          type: 'warning',
          actionUrl: 'procurement',
        });
      }
      return updatedObj;
    }
    throw new Error('Failed to return petty cash');
  }

  public async recordDisbursement(id: string, details: Partial<PettyCashDisbursement>): Promise<PettyCashRequest> {
    const res = await fetch(`/api/procurement/petty-cash/${id}/disburse`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(details),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to disburse cash');
    }
    const updated = await res.json();
    this.updateLocalPC(updated);
    if (updated.requesterId) {
      db.sendNotification({
        userId: updated.requesterId,
        titleAr: 'تم صرف مبلغ النثريات 💸',
        titleEn: 'Petty Cash Disbursed',
        messageAr: `تم صرف مبلغ سند النثريات (${updated.requestNumber}). يرجى رفع الفواتير بعد إتمام الشراء.`,
        messageEn: `Cash disbursed for (${updated.requestNumber}). Please upload receipts.`,
        type: 'info',
        actionUrl: 'procurement',
      });
    }
    return updated;
  }

  public async uploadReceipt(id: string, details: Partial<PettyCashReceipt>): Promise<PettyCashRequest> {
    const res = await fetch(`/api/procurement/petty-cash/${id}/upload-receipt`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(details),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to upload receipt');
    }
    const updated = await res.json();
    this.updateLocalPC(updated);
    db.sendNotificationToAdmins({
      titleAr: 'تم رفع فواتير وإيصالات النثريات 🧾',
      titleEn: 'Petty Cash Receipts Uploaded',
      messageAr: `قام ${updated.requesterName} برفع إيصالات سند النثريات (${updated.requestNumber}).`,
      messageEn: `${updated.requesterName} uploaded receipts for (${updated.requestNumber}).`,
      type: 'info',
      actionUrl: 'procurement',
    });
    return updated;
  }

  public async recordReconciliation(id: string, reconciliation: Partial<PettyCashReconciliation>): Promise<PettyCashRequest> {
    const res = await fetch(`/api/procurement/petty-cash/${id}/reconcile`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(reconciliation),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to record reconciliation');
    }
    const updated = await res.json();
    this.updateLocalPC(updated);
    if (updated.requesterId) {
      db.sendNotification({
        userId: updated.requesterId,
        titleAr: 'تمت مطابقة وإغلاق سند النثريات ⚖️',
        titleEn: 'Petty Cash Reconciled',
        messageAr: `تمت تسوية ومطابقة سند النثريات (${updated.requestNumber}) بنجاح.`,
        messageEn: `Petty Cash (${updated.requestNumber}) has been reconciled.`,
        type: 'success',
        actionUrl: 'procurement',
      });
    }
    return updated;
  }

  public async closePettyCash(id: string): Promise<PettyCashRequest> {
    const res = await fetch(`/api/procurement/petty-cash/${id}/close`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to close petty cash');
    }
    const updated = await res.json();
    this.updateLocalPC(updated);
    return updated;
  }

  public async cancelPettyCash(id: string, actor?: User): Promise<PettyCashRequest> {
    let updatedObj: PettyCashRequest | null = null;

    // 1. Immediately perform local cancellation
    const idx = this.memoryPettyCash.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.memoryPettyCash[idx] = {
        ...this.memoryPettyCash[idx],
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      };
      updatedObj = this.memoryPettyCash[idx];
      this.saveToLocal();
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('jbc-procurement-updated'));
    }

    // 2. Sync with backend
    try {
      const res = await fetch(`/api/procurement/petty-cash/${id}/cancel`, {
        method: 'POST',
        headers: this.getHeaders(actor),
      });
      if (res.ok) {
        const serverUpdated = await res.json();
        this.updateLocalPC(serverUpdated);
        return serverUpdated;
      }
    } catch (err) {
      console.warn('Backend cancel petty cash failed, local change preserved:', err);
    }

    if (updatedObj) return updatedObj;
    throw new Error('Failed to cancel petty cash');
  }

  private updateLocalPC(updated: PettyCashRequest) {
    const idx = this.memoryPettyCash.findIndex((p) => p.id === updated.id);
    if (idx !== -1) {
      this.memoryPettyCash[idx] = updated;
    } else {
      this.memoryPettyCash.unshift(updated);
    }
    this.saveToLocal();
  }

  // ==========================================
  // CATEGORIES & SIMILARITY CHECK
  // ==========================================

  public getCategories(): ProcurementCategory[] {
    return this.memoryCategories;
  }

  public normalizeText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[يى]/g, 'ي')
      .replace(/[ة]/g, 'ه')
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'؛،]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  public async checkSimilarRequests(params: {
    itemDescription?: string;
    category?: string;
    equipmentId?: string;
    taskId?: string;
    excludeId?: string;
  }): Promise<SimilarMatchResult> {
    try {
      const res = await fetch('/api/procurement/check-duplicates', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // client fallback
    }

    // Client fallback check
    const queryNorm = this.normalizeText(params.itemDescription || '');
    const words = queryNorm.split(' ').filter((w) => w.length > 2);
    const matches: SimilarMatchResult['matches'] = [];

    for (const pr of this.memoryPurchases) {
      if (pr.deleted || pr.status === 'cancelled' || pr.status === 'closed') continue;
      if (params.excludeId && pr.id === params.excludeId) continue;

      const reasons: string[] = [];
      const targetNorm = this.normalizeText(pr.itemDescription);

      if (queryNorm && targetNorm.includes(queryNorm)) {
        reasons.push('تطابق مباشر في وصف المادة');
      } else {
        let matched = 0;
        for (const w of words) {
          if (targetNorm.includes(w)) matched++;
        }
        if (words.length > 0 && matched / words.length >= 0.6) {
          reasons.push('تطابق كلمات رئيسية بنسبة عالية');
        }
      }

      if (params.category && pr.category === params.category && reasons.length > 0) {
        reasons.push('تطابق التصنيف الفني للمشتريات');
      }
      if (params.equipmentId && pr.relatedEquipmentId === params.equipmentId) {
        reasons.push('طلب شراء لنفس المعدة قيد التنفيذ');
      }
      if (params.taskId && pr.relatedTaskId === params.taskId) {
        reasons.push('طلب شراء لنفس أمر العمل / المهمة');
      }

      if (reasons.length > 0) {
        matches.push({
          request: pr,
          type: 'purchase',
          matchReasons: reasons,
        });
      }
    }

    return {
      hasSimilar: matches.length > 0,
      matches,
    };
  }

  public async getAuditLogs(entityId?: string): Promise<any[]> {
    try {
      const url = entityId
        ? `/api/procurement/audit-logs?entityId=${encodeURIComponent(entityId)}`
        : '/api/procurement/audit-logs';
      const res = await fetch(url, { headers: this.getHeaders() });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback to db
    }
    const all = db.getAuditLogs();
    if (entityId) {
      return all.filter((a) => a.entityId === entityId);
    }
    return all.filter((a) => a.entity === 'PurchaseRequest' || a.entity === 'PettyCash');
  }
}

export const procurementService = new ProcurementService();
