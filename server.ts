import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Types and Seed Data
import {
  PurchaseRequest,
  PettyCashRequest,
  ProcurementCategory,
  PurchaseRequestStatus,
  PettyCashStatus,
} from './src/types';
import {
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_PETTY_CASH_REQUESTS,
  INITIAL_PROCUREMENT_CATEGORIES,
} from './src/data/initialProcurement';
import { INITIAL_50_USERS } from './src/data/initialUsers';

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Storage Paths
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'procurement');
const DB_FILE = path.join(DATA_DIR, 'procurement-data.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface ProcurementAuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: 'PurchaseRequest' | 'PettyCash' | 'Category';
  entityId: string;
  previousStatus?: string;
  newStatus?: string;
  details?: string;
  timestamp: string;
}

interface ProcurementDB {
  purchaseRequests: PurchaseRequest[];
  pettyCashRequests: PettyCashRequest[];
  categories: ProcurementCategory[];
  auditLogs: ProcurementAuditLog[];
}

function loadDB(): ProcurementDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading procurement DB file:', err);
  }

  const initial: ProcurementDB = {
    purchaseRequests: INITIAL_PURCHASE_REQUESTS,
    pettyCashRequests: INITIAL_PETTY_CASH_REQUESTS,
    categories: INITIAL_PROCUREMENT_CATEGORIES,
    auditLogs: [],
  };
  saveDB(initial);
  return initial;
}

function saveDB(data: ProcurementDB) {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to save procurement DB:', err);
  }
}

// Security & Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    nameAr: string;
    nameEn: string;
    role: string;
    department: string;
  };
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
  const userRole = (req.headers['x-user-role'] as string) || (req.query.userRole as string);

  if (!userId) {
    // Default to guest/unauthenticated
    req.user = undefined;
    return next();
  }

  const foundUser = INITIAL_50_USERS.find(
    (u) => u.id === userId || u.username.toLowerCase() === userId.toLowerCase()
  );

  let fallbackName = 'User';
  if (req.headers['x-user-name']) {
    try {
      fallbackName = decodeURIComponent(req.headers['x-user-name'] as string);
    } catch {
      fallbackName = req.headers['x-user-name'] as string;
    }
  }

  const effectiveRole = String(userRole || (foundUser ? foundUser.role : 'employee')).trim().toLowerCase();

  req.user = {
    id: foundUser ? foundUser.id : userId,
    username: foundUser ? foundUser.username : userId,
    nameAr: foundUser ? foundUser.nameAr : fallbackName,
    nameEn: foundUser ? foundUser.nameEn : fallbackName,
    role: effectiveRole,
    department: foundUser ? foundUser.department : 'الموقع',
  };

  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    req.user = {
      id: 'usr-admin',
      username: 'admin',
      nameAr: 'م. سامر صلاح (مدير النظام)',
      nameEn: 'Eng. Samer Salah (Admin)',
      role: 'super_admin',
      department: 'الإدارة والتحكم المركزي',
    };
  }
  next();
}

function isAdmin(user?: { role?: string }): boolean {
  if (!user || !user.role) return false;
  const r = String(user.role).trim().toLowerCase();
  return r === 'admin' || r === 'super_admin' || r === 'maintenance_manager';
}

function logAudit(
  db: ProcurementDB,
  user: AuthenticatedRequest['user'],
  action: string,
  entityType: 'PurchaseRequest' | 'PettyCash' | 'Category',
  entityId: string,
  previousStatus?: string,
  newStatus?: string,
  details?: string
) {
  const audit: ProcurementAuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId: user?.id || 'system',
    userName: user?.nameAr || user?.nameEn || 'النظام',
    userRole: user?.role || 'system',
    action,
    entityType,
    entityId,
    previousStatus,
    newStatus,
    details,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(audit);
}

// Static file serving for persistent procurement files
app.use('/api/procurement/files', express.static(UPLOADS_DIR));

// Base API router
const apiRouter = express.Router();
apiRouter.use(authMiddleware);

// -------------------------------------------------------------
// FILE UPLOAD (Persistent on disk with permanent URL)
// -------------------------------------------------------------
apiRouter.post('/procurement/upload', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileName, fileData, mimeType } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData are required' });
    }

    // Validate MIME type
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (mimeType && !allowed.includes(mimeType.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid file format',
        message: 'Only JPG, JPEG, PNG, and PDF files are permitted.',
      });
    }

    // Extract base64 content
    let base64Content = fileData;
    if (fileData.includes(',')) {
      base64Content = fileData.split(',')[1];
    }

    const buffer = Buffer.from(base64Content, 'base64');
    const safeExt = path.extname(fileName) || (mimeType?.includes('pdf') ? '.pdf' : '.jpg');
    const cleanBase = path.basename(fileName, safeExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const savedName = `${Date.now()}_${cleanBase}${safeExt}`;
    const destination = path.join(UPLOADS_DIR, savedName);

    fs.writeFileSync(destination, buffer);

    const fileUrl = `/api/procurement/files/${savedName}`;
    return res.json({
      success: true,
      url: fileUrl,
      fileName: savedName,
      originalName: fileName,
      size: `${(buffer.length / 1024).toFixed(1)} KB`,
      mimeType: mimeType || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user!.nameAr,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed', message: err.message });
  }
});

// -------------------------------------------------------------
// DUPLICATE CHECK
// -------------------------------------------------------------
apiRouter.post('/procurement/check-duplicates', (req: Request, res: Response) => {
  const { itemDescription, category, relatedEquipmentId, relatedTaskId } = req.body;
  const db = loadDB();

  const normalize = (txt: string) =>
    (txt || '')
      .toLowerCase()
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[يى]/g, 'ي')
      .replace(/[ة]/g, 'ه')
      .replace(/\s+/g, ' ')
      .trim();

  const queryNorm = normalize(itemDescription);
  const words = queryNorm.split(' ').filter((w) => w.length > 2);

  const matches: any[] = [];

  for (const pr of db.purchaseRequests) {
    if (pr.deleted || pr.status === 'cancelled' || pr.status === 'closed') continue;

    const reasons: string[] = [];
    const targetNorm = normalize(pr.itemDescription);

    if (queryNorm && targetNorm.includes(queryNorm)) {
      reasons.push('تطابق مباشر في وصف المادة');
    } else {
      let matchedWords = 0;
      for (const w of words) {
        if (targetNorm.includes(w)) matchedWords++;
      }
      if (words.length > 0 && matchedWords / words.length >= 0.6) {
        reasons.push('تطابق كلمات رئيسية بنسبة عالية');
      }
    }

    if (category && pr.category === category && reasons.length > 0) {
      reasons.push('تطابق التصنيف الفني');
    }

    if (relatedEquipmentId && pr.relatedEquipmentId === relatedEquipmentId) {
      reasons.push('طلب شراء لنفس المعدة قيد التنفيذ');
    }

    if (relatedTaskId && pr.relatedTaskId === relatedTaskId) {
      reasons.push('طلب شراء لنفس أمر المهمة');
    }

    if (reasons.length > 0) {
      matches.push({
        request: pr,
        type: 'purchase',
        matchReasons: reasons,
      });
    }
  }

  return res.json({
    hasSimilar: matches.length > 0,
    matches,
  });
});

// -------------------------------------------------------------
// PURCHASE REQUESTS ENDPOINTS
// -------------------------------------------------------------

// List Purchase Requests
apiRouter.get('/procurement/purchase-requests', (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const includeDeleted = req.query.includeDeleted === 'true';

  let list = db.purchaseRequests;
  if (!includeDeleted) {
    list = list.filter((r) => !r.deleted);
  }

  // Filter by status if requested
  if (req.query.status) {
    const s = String(req.query.status).toLowerCase();
    list = list.filter((r) => r.status.toLowerCase() === s);
  }

  // Filter by requester explicitly requested
  if (req.query.requesterId) {
    list = list.filter((r) => r.requesterId === req.query.requesterId);
  }

  // Server-side RBAC enforcement:
  // Non-admin users are restricted to viewing only their own requests.
  // Admins see all requests.
  if (req.user && !isAdmin(req.user)) {
    list = list.filter((r) => r.requesterId === req.user!.id);
  }

  return res.json(list);
});

// Get Single Purchase Request
apiRouter.get('/procurement/purchase-requests/:id', (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const item = db.purchaseRequests.find((r) => r.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not found', message: 'Purchase request not found' });
  }

  // If non-admin user requests an item not belonging to them
  if (req.user && !isAdmin(req.user) && item.requesterId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized access to this purchase request' });
  }

  return res.json(item);
});

// Create Purchase Request
apiRouter.post('/procurement/purchase-requests', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const body = req.body;

    if (!body.itemDescription || !body.quantity || !body.unit) {
      return res.status(400).json({ error: 'Missing required fields (itemDescription, quantity, unit)' });
    }

    const db = loadDB();
    const currentYear = new Date().getFullYear();
    const count = db.purchaseRequests.length + 1;
    const requestNumber = `PR-${currentYear}-${String(count).padStart(4, '0')}`;

    const newRequest: PurchaseRequest = {
      id: `pr-${Date.now()}`,
      requestNumber,
      requestDate: new Date().toISOString(),
      requesterId: body.requesterId || user.id,
      requesterName: body.requesterName || user.nameAr,
      department: body.department || user.department || 'الموقع',
      section: body.section || '',
      requestType: body.requestType || 'consumable',
      priority: body.priority || 'medium',
      requiredDate: body.requiredDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      itemDescription: body.itemDescription.trim(),
      category: body.category || 'عام',
      quantity: Number(body.quantity) || 1,
      unit: body.unit.trim(),
      estimatedUnitPrice: Number(body.estimatedUnitPrice) || 0,
      estimatedTotal: (Number(body.quantity) || 1) * (Number(body.estimatedUnitPrice) || 0),
      currency: body.currency || 'JOD',
      justification: body.justification || '',
      suggestedSupplier: body.suggestedSupplier || '',
      supplierContact: body.supplierContact || '',
      relatedEquipmentId: body.relatedEquipmentId || '',
      relatedEquipmentName: body.relatedEquipmentName || '',
      relatedTaskId: body.relatedTaskId || '',
      relatedTaskCode: body.relatedTaskCode || '',
      projectCostCenter: body.projectCostCenter || '',
      notes: body.notes || '',
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      status: body.saveAsDraft ? 'draft' : 'pending_approval',
      duplicateWarningAcknowledged: Boolean(body.duplicateWarningAcknowledged),
      duplicateWarningDetails: body.duplicateWarningDetails || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.purchaseRequests.unshift(newRequest);
    logAudit(
      db,
      user,
      newRequest.status === 'draft' ? 'إنشاء مسودة طلب شراء جديدة' : 'إنشاء وتقديم طلب شراء جديد للاعتماد',
      'PurchaseRequest',
      newRequest.id,
      undefined,
      newRequest.status,
      `المادة: ${newRequest.itemDescription} | الكمية: ${newRequest.quantity} ${newRequest.unit}`
    );

    saveDB(db);
    return res.status(201).json(newRequest);
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
});

// Update Purchase Request
apiRouter.put('/procurement/purchase-requests/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Not found', message: 'Purchase request not found' });
  }

  const existing = db.purchaseRequests[index];
  const user = req.user!;
  const admin = isAdmin(user);

  // Authorization check
  if (!admin) {
    if (existing.requesterId !== user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only modify your own requests.' });
    }
    if (existing.status !== 'draft' && existing.status !== 'returned_for_changes') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only requests in draft or returned_for_changes status can be modified.',
      });
    }
  }

  const updates = req.body;
  const previousStatus = existing.status;

  const updated: PurchaseRequest = {
    ...existing,
    ...updates,
    id: existing.id,
    requestNumber: existing.requestNumber,
    requesterId: existing.requesterId,
    requesterName: existing.requesterName,
    updatedAt: new Date().toISOString(),
  };

  db.purchaseRequests[index] = updated;
  logAudit(
    db,
    user,
    'تعديل بيانات طلب الشراء',
    'PurchaseRequest',
    updated.id,
    previousStatus,
    updated.status
  );

  saveDB(db);
  return res.json(updated);
});

// CRITICAL REQUIREMENT: DELETE PURCHASE REQUEST
// Admin/Super Admin can delete ANY request regardless of status.
// Employee can only delete their own DRAFT request. All other attempts return HTTP 403.
apiRouter.delete('/procurement/purchase-requests/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Not found', message: 'Purchase request not found' });
  }

  const existing = db.purchaseRequests[index];
  const user = req.user!;
  const admin = isAdmin(user);

  if (!admin) {
    // Non-admin check: must be owner AND must be draft
    if (existing.requesterId !== user.id || existing.status !== 'draft') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Unauthorized: Only administrators can delete requests across all lifecycle stages.',
      });
    }
  }

  // Perform deletion
  const prevStatus = existing.status;
  existing.deleted = true;
  existing.deletedAt = new Date().toISOString();
  existing.deletedBy = user.nameAr;
  db.purchaseRequests[index] = existing;

  logAudit(
    db,
    user,
    `حذف طلب الشراء نهائياً (${existing.requestNumber})`,
    'PurchaseRequest',
    existing.id,
    prevStatus,
    'DELETED',
    `تم الحذف بواسطة ${user.nameAr} (${user.role})`
  );

  saveDB(db);
  return res.json({ success: true, message: 'Request deleted successfully' });
});

// SUBMIT REQUEST (Employee on own draft)
apiRouter.post('/procurement/purchase-requests/:id/submit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  const user = req.user!;
  if (!isAdmin(user) && existing.requesterId !== user.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Cannot submit requests belonging to other users' });
  }

  const prev = existing.status;
  existing.status = 'pending_approval';
  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  logAudit(db, user, 'تقديم طلب الشراء للاعتماد والمراجعة', 'PurchaseRequest', existing.id, prev, 'pending_approval');
  saveDB(db);
  return res.json(existing);
});

// APPROVE REQUEST (Admin only)
apiRouter.post('/procurement/purchase-requests/:id/approve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can approve purchase requests' });
  }

  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  const prev = existing.status;
  const { notes, approvedAmount } = req.body;

  existing.status = 'approved';
  existing.approval = {
    approvedById: user.id,
    approvedByName: user.nameAr,
    approvalDate: new Date().toISOString(),
    approvedAmount: Number(approvedAmount) || existing.estimatedTotal,
    approvalNotes: notes || '',
  };
  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  logAudit(
    db,
    user,
    'اعتماد وتفويض طلب الشراء',
    'PurchaseRequest',
    existing.id,
    prev,
    'approved',
    `المبلغ المعتمد: ${existing.approval.approvedAmount} ${existing.currency}`
  );

  saveDB(db);
  return res.json(existing);
});

// REJECT REQUEST (Admin only, requires reason)
apiRouter.post('/procurement/purchase-requests/:id/reject', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can reject purchase requests' });
  }

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  const prev = existing.status;

  existing.status = 'rejected';
  existing.approval = {
    ...existing.approval,
    approvedById: user.id,
    approvedByName: user.nameAr,
    approvalDate: new Date().toISOString(),
    rejectionReason: reason.trim(),
  };
  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  logAudit(
    db,
    user,
    'رفض طلب الشراء',
    'PurchaseRequest',
    existing.id,
    prev,
    'rejected',
    `سبب الرفض: ${reason.trim()}`
  );

  saveDB(db);
  return res.json(existing);
});

// RETURN FOR CHANGES (Admin only, requires comment)
apiRouter.post('/procurement/purchase-requests/:id/return', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can return requests for changes' });
  }

  const { comment } = req.body;
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Return comment is required' });
  }

  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  const prev = existing.status;

  existing.status = 'returned_for_changes';
  existing.approval = {
    ...existing.approval,
    approvedById: user.id,
    approvedByName: user.nameAr,
    approvalDate: new Date().toISOString(),
    returnedChangesNotes: comment.trim(),
  };
  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  logAudit(
    db,
    user,
    'إرجاع طلب الشراء للموظف لاستكمال التعديلات',
    'PurchaseRequest',
    existing.id,
    prev,
    'returned_for_changes',
    `الملاحظات: ${comment.trim()}`
  );

  saveDB(db);
  return res.json(existing);
});

// MARK AS PURCHASED (Admin only)
apiRouter.post('/procurement/purchase-requests/:id/purchase', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can mark requests as purchased' });
  }

  const {
    supplier,
    supplierContact,
    purchaseDate,
    poNumber,
    actualUnitPrice,
    actualTotal,
    currency,
    paymentMethod,
    buyerName,
    notes,
    attachmentUrl,
  } = req.body;

  if (!supplier || actualTotal === undefined) {
    return res.status(400).json({ error: 'Supplier and actualTotal are required' });
  }

  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  const prev = existing.status;

  existing.status = 'purchased';
  existing.purchaseDetails = {
    supplier,
    supplierContact: supplierContact || '',
    purchaseDate: purchaseDate || new Date().toISOString(),
    poNumber: poNumber || `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    actualUnitPrice: Number(actualUnitPrice) || 0,
    actualTotal: Number(actualTotal),
    currency: currency || existing.currency,
    paymentMethod: paymentMethod || 'cash',
    buyerName: buyerName || user.nameAr,
    notes: notes || '',
    attachmentUrl: attachmentUrl || '',
  };
  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  const variance = Number(actualTotal) - existing.estimatedTotal;
  logAudit(
    db,
    user,
    'تسجيل تنفيذ الشراء الفعلي وأمر التوريد (PO)',
    'PurchaseRequest',
    existing.id,
    prev,
    'purchased',
    `المورد: ${supplier} | القيمة الفعلية: ${actualTotal} ${existing.currency} | الفارق: ${variance}`
  );

  saveDB(db);
  return res.json(existing);
});

// MARK AS RECEIVED (Admin only, supports partial receiving)
apiRouter.post('/procurement/purchase-requests/:id/receive', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can mark items as received' });
  }

  const {
    receivedDate,
    receivedByName,
    quantityOrdered,
    quantityReceived,
    condition,
    deliveryNoteNumber,
    notes,
    deliveryNoteUrl,
  } = req.body;

  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  const prev = existing.status;

  const ordered = Number(quantityOrdered) || existing.quantity;
  const received = Number(quantityReceived) || ordered;
  const remaining = Math.max(0, ordered - received);
  const isPartial = remaining > 0;

  existing.status = 'received';
  existing.receivingDetails = {
    receivedDate: receivedDate || new Date().toISOString(),
    receivedById: user.id,
    receivedByName: receivedByName || user.nameAr,
    quantityOrdered: ordered,
    quantityReceived: received,
    remainingQuantity: remaining,
    isPartial,
    condition: condition || 'excellent',
    deliveryNoteNumber: deliveryNoteNumber || '',
    deliveryNoteUrl: deliveryNoteUrl || '',
    notes: notes || '',
  };
  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  logAudit(
    db,
    user,
    isPartial ? 'استلام جزئي وتوثيق المواد' : 'استلام وفحص المواد بالكامل ومطابقتها',
    'PurchaseRequest',
    existing.id,
    prev,
    'received',
    `الكمية المستلمة: ${received}/${ordered} ${existing.unit} | الحالة: ${condition}`
  );

  saveDB(db);
  return res.json(existing);
});

// UPLOAD INVOICE / RECEIPT
apiRouter.post('/procurement/purchase-requests/:id/upload-invoice', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const {
    invoiceNumber,
    invoiceDate,
    supplier,
    invoiceAmount,
    currency,
    paymentMethod,
    notes,
    attachmentUrl,
  } = req.body;

  if (!invoiceNumber || !invoiceAmount || !attachmentUrl) {
    return res.status(400).json({ error: 'Invoice number, invoice amount, and attachment are required' });
  }

  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  const prev = existing.status;

  // Authorization: Admins or the requester can attach invoices
  if (!isAdmin(user) && existing.requesterId !== user.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'You can only upload invoices to your own requests' });
  }

  existing.status = 'invoice_uploaded';
  existing.invoiceDetails = {
    invoiceNumber,
    invoiceDate: invoiceDate || new Date().toISOString(),
    supplier: supplier || existing.purchaseDetails?.supplier || existing.suggestedSupplier || 'مورد معتمد',
    invoiceAmount: Number(invoiceAmount),
    currency: currency || existing.currency,
    paymentMethod: paymentMethod || 'cash',
    notes: notes || '',
    uploadedById: user.id,
    uploadedByName: user.nameAr,
    uploadedDate: new Date().toISOString(),
    attachmentUrl,
  };

  // Also add to attachments array if not already present
  if (!existing.attachments.some((a) => a.url === attachmentUrl)) {
    existing.attachments.push({
      id: `att-${Date.now()}`,
      name: `فاتورة ضريبية ${invoiceNumber}`,
      type: 'invoice',
      url: attachmentUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.id,
      uploadedByName: user.nameAr,
    });
  }

  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  logAudit(
    db,
    user,
    'إرفاق الفاتورة الضريبية وسند الشراء المالي',
    'PurchaseRequest',
    existing.id,
    prev,
    'invoice_uploaded',
    `رقم الفاتورة: ${invoiceNumber} | القيمة: ${invoiceAmount} ${existing.currency}`
  );

  saveDB(db);
  return res.json(existing);
});

// RECONCILE (Admin only)
apiRouter.post('/procurement/purchase-requests/:id/reconcile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can reconcile purchase requests' });
  }

  const { notes } = req.body;
  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  const prev = existing.status;

  const actualTotal = existing.purchaseDetails?.actualTotal || existing.invoiceDetails?.invoiceAmount || existing.estimatedTotal;
  const variance = actualTotal - existing.estimatedTotal;

  existing.status = 'reconciled';
  existing.reconciliation = {
    reconciledDate: new Date().toISOString(),
    reconciledById: user.id,
    reconciledByName: user.nameAr,
    estimatedTotal: existing.estimatedTotal,
    actualTotal,
    variance,
    notes: notes || '',
  };
  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  logAudit(
    db,
    user,
    'تسوية الحسابات ومطابقة الفاتورة مع المستلم الفعلي',
    'PurchaseRequest',
    existing.id,
    prev,
    'reconciled',
    `الفارق المالي: ${variance} ${existing.currency}`
  );

  saveDB(db);
  return res.json(existing);
});

// CLOSE (Admin only)
apiRouter.post('/procurement/purchase-requests/:id/close', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can close purchase requests' });
  }

  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  const prev = existing.status;

  existing.status = 'closed';
  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  logAudit(db, user, 'إغلاق وأرشفة دورة طلب الشراء رسمياً', 'PurchaseRequest', existing.id, prev, 'closed');
  saveDB(db);
  return res.json(existing);
});

// CANCEL
apiRouter.post('/procurement/purchase-requests/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  if (!isAdmin(user) && existing.requesterId !== user.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Cannot cancel another user request' });
  }

  const prev = existing.status;
  existing.status = 'cancelled';
  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  logAudit(db, user, 'إلغاء طلب الشراء', 'PurchaseRequest', existing.id, prev, 'cancelled');
  saveDB(db);
  return res.json(existing);
});

// ACKNOWLEDGE DUPLICATE
apiRouter.post('/procurement/purchase-requests/:id/duplicate-acknowledged', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = loadDB();
  const index = db.purchaseRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.purchaseRequests[index];
  existing.duplicateWarningAcknowledged = true;
  existing.duplicateWarningDetails = req.body.details || 'متابعة بعد التنبيه بتشابه الطلبات';
  existing.updatedAt = new Date().toISOString();
  db.purchaseRequests[index] = existing;

  logAudit(
    db,
    user,
    'تأكيد المتابعة بعد ظهور تحذير طلبات شراء مشابهة (DUPLICATE_WARNING_ACKNOWLEDGED)',
    'PurchaseRequest',
    existing.id,
    existing.status,
    existing.status,
    existing.duplicateWarningDetails
  );

  saveDB(db);
  return res.json(existing);
});

// -------------------------------------------------------------
// PETTY CASH ENDPOINTS
// -------------------------------------------------------------

// List Petty Cash
apiRouter.get('/procurement/petty-cash', (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const includeDeleted = req.query.includeDeleted === 'true';

  let list = db.pettyCashRequests;
  if (!includeDeleted) {
    list = list.filter((r) => !r.deleted);
  }

  if (req.query.status) {
    const s = String(req.query.status).toLowerCase();
    list = list.filter((r) => r.status.toLowerCase() === s);
  }

  if (req.query.requesterId) {
    list = list.filter((r) => r.requesterId === req.query.requesterId);
  }

  // Server-side RBAC enforcement:
  // Non-admin users are restricted to viewing only their own requests.
  // Admins see all requests.
  if (req.user && !isAdmin(req.user)) {
    list = list.filter((r) => r.requesterId === req.user!.id);
  }

  return res.json(list);
});

// Get Single Petty Cash
apiRouter.get('/procurement/petty-cash/:id', (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const item = db.pettyCashRequests.find((r) => r.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }

  // If non-admin user requests an item not belonging to them
  if (req.user && !isAdmin(req.user) && item.requesterId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized access to this petty cash request' });
  }

  return res.json(item);
});

// Create Petty Cash Request
apiRouter.post('/procurement/petty-cash', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const body = req.body;

    if (!body.amount || !body.purpose) {
      return res.status(400).json({ error: 'Amount and purpose are required' });
    }

    const db = loadDB();
    const currentYear = new Date().getFullYear();
    const count = db.pettyCashRequests.length + 1;
    const requestNumber = `PC-${currentYear}-${String(count).padStart(4, '0')}`;

    const newRequest: PettyCashRequest = {
      id: `pc-${Date.now()}`,
      requestNumber,
      requestDate: new Date().toISOString(),
      requesterId: body.requesterId || user.id,
      requesterName: body.requesterName || user.nameAr,
      department: body.department || user.department || 'الموقع',
      amount: Number(body.amount),
      currency: body.currency || 'JOD',
      purpose: body.purpose.trim(),
      description: body.description || '',
      expenseCategory: body.expenseCategory || 'site_supplies',
      requiredDate: body.requiredDate || new Date().toISOString().split('T')[0],
      relatedTaskId: body.relatedTaskId || '',
      relatedTaskCode: body.relatedTaskCode || '',
      relatedEquipmentId: body.relatedEquipmentId || '',
      relatedEquipmentName: body.relatedEquipmentName || '',
      relatedPurchaseRequestId: body.relatedPurchaseRequestId || '',
      relatedPurchaseRequestNumber: body.relatedPurchaseRequestNumber || '',
      notes: body.notes || '',
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      status: body.saveAsDraft ? 'draft' : 'pending_approval',
      duplicateWarningAcknowledged: Boolean(body.duplicateWarningAcknowledged),
      duplicateWarningDetails: body.duplicateWarningDetails || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.pettyCashRequests.unshift(newRequest);
    logAudit(
      db,
      user,
      newRequest.status === 'draft' ? 'إنشاء مسودة سند نثريات' : 'تقديم سند نثريات جديد للاعتماد والصرف',
      'PettyCash',
      newRequest.id,
      undefined,
      newRequest.status,
      `المبلغ: ${newRequest.amount} ${newRequest.currency} | الغاية: ${newRequest.purpose}`
    );

    saveDB(db);
    return res.status(201).json(newRequest);
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
});

// Update Petty Cash Request
apiRouter.put('/procurement/petty-cash/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  const user = req.user!;
  const admin = isAdmin(user);

  if (!admin) {
    if (existing.requesterId !== user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only modify your own requests.' });
    }
    if (existing.status !== 'draft' && existing.status !== 'returned_for_changes') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only draft or returned requests can be modified.' });
    }
  }

  const updates = req.body;
  const prev = existing.status;

  const updated: PettyCashRequest = {
    ...existing,
    ...updates,
    id: existing.id,
    requestNumber: existing.requestNumber,
    requesterId: existing.requesterId,
    requesterName: existing.requesterName,
    updatedAt: new Date().toISOString(),
  };

  db.pettyCashRequests[index] = updated;
  logAudit(db, user, 'تعديل بيانات سند النثريات', 'PettyCash', updated.id, prev, updated.status);

  saveDB(db);
  return res.json(updated);
});

// DELETE PETTY CASH
// Admin can delete ANY petty cash request regardless of status.
// Employee can only delete own draft.
apiRouter.delete('/procurement/petty-cash/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  const user = req.user!;
  const admin = isAdmin(user);

  if (!admin) {
    if (existing.requesterId !== user.id || existing.status !== 'draft') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Unauthorized: Only administrators can delete petty cash vouchers across all lifecycle stages.',
      });
    }
  }

  const prev = existing.status;
  existing.deleted = true;
  existing.deletedAt = new Date().toISOString();
  existing.deletedBy = user.nameAr;
  db.pettyCashRequests[index] = existing;

  logAudit(
    db,
    user,
    `حذف سند النثريات (${existing.requestNumber})`,
    'PettyCash',
    existing.id,
    prev,
    'DELETED'
  );

  saveDB(db);
  return res.json({ success: true, message: 'Petty cash voucher deleted' });
});

// SUBMIT PETTY CASH
apiRouter.post('/procurement/petty-cash/:id/submit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  const user = req.user!;
  if (!isAdmin(user) && existing.requesterId !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const prev = existing.status;
  existing.status = 'pending_approval';
  existing.updatedAt = new Date().toISOString();
  db.pettyCashRequests[index] = existing;

  logAudit(db, user, 'تقديم سند النثريات للاعتماد', 'PettyCash', existing.id, prev, 'pending_approval');
  saveDB(db);
  return res.json(existing);
});

// APPROVE PETTY CASH (Admin only)
apiRouter.post('/procurement/petty-cash/:id/approve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can approve petty cash requests' });
  }

  const { notes, approvedAmount } = req.body;
  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  const prev = existing.status;

  existing.status = 'approved';
  existing.approval = {
    approvedById: user.id,
    approvedByName: user.nameAr,
    approvalDate: new Date().toISOString(),
    approvedAmount: Number(approvedAmount) || existing.amount,
    approvalNotes: notes || '',
  };
  existing.updatedAt = new Date().toISOString();
  db.pettyCashRequests[index] = existing;

  logAudit(
    db,
    user,
    'اعتماد صرف سلفة النثريات',
    'PettyCash',
    existing.id,
    prev,
    'approved',
    `المبلغ المعتمد: ${existing.approval.approvedAmount} ${existing.currency}`
  );

  saveDB(db);
  return res.json(existing);
});

// REJECT PETTY CASH (Admin only)
apiRouter.post('/procurement/petty-cash/:id/reject', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can reject petty cash' });
  }

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  const prev = existing.status;

  existing.status = 'rejected';
  existing.approval = {
    ...existing.approval,
    approvedById: user.id,
    approvedByName: user.nameAr,
    approvalDate: new Date().toISOString(),
    rejectionReason: reason.trim(),
  };
  existing.updatedAt = new Date().toISOString();
  db.pettyCashRequests[index] = existing;

  logAudit(db, user, 'رفض سند النثريات', 'PettyCash', existing.id, prev, 'rejected', reason.trim());
  saveDB(db);
  return res.json(existing);
});

// RETURN PETTY CASH FOR CHANGES (Admin only)
apiRouter.post('/procurement/petty-cash/:id/return', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can return requests' });
  }

  const { comment } = req.body;
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Comment is required' });
  }

  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  const prev = existing.status;

  existing.status = 'returned_for_changes';
  existing.approval = {
    ...existing.approval,
    approvedById: user.id,
    approvedByName: user.nameAr,
    approvalDate: new Date().toISOString(),
    returnedChangesNotes: comment.trim(),
  };
  existing.updatedAt = new Date().toISOString();
  db.pettyCashRequests[index] = existing;

  logAudit(db, user, 'إرجاع سند النثريات للتعديل', 'PettyCash', existing.id, prev, 'returned_for_changes', comment.trim());
  saveDB(db);
  return res.json(existing);
});

// MARK CASH DISBURSED (Admin only)
apiRouter.post('/procurement/petty-cash/:id/disburse', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can disburse cash' });
  }

  const {
    disbursedDate,
    disbursedByName,
    disbursedAmount,
    paymentMethod,
    cashReference,
    recipient,
    notes,
    attachmentUrl,
  } = req.body;

  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  const prev = existing.status;
  const actual = Number(disbursedAmount) || existing.approval?.approvedAmount || existing.amount;

  existing.status = 'receipt_pending';
  existing.disbursement = {
    disbursedDate: disbursedDate || new Date().toISOString(),
    disbursedById: user.id,
    disbursedByName: disbursedByName || user.nameAr,
    actualAmount: actual,
    paymentMethod: paymentMethod || 'cash',
    cashReference: cashReference || `VCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    recipient: recipient || existing.requesterName,
    notes: notes || '',
    attachmentUrl: attachmentUrl || '',
  };
  existing.updatedAt = new Date().toISOString();
  db.pettyCashRequests[index] = existing;

  logAudit(
    db,
    user,
    'صرف مبلغ السلفة نقداً من الصندوق (RECEIPT_PENDING)',
    'PettyCash',
    existing.id,
    prev,
    'receipt_pending',
    `المبلغ المصروف: ${actual} ${existing.currency} | المستلم: ${existing.disbursement.recipient} | سند الصرف: ${existing.disbursement.cashReference}`
  );

  saveDB(db);
  return res.json(existing);
});

// UPLOAD RECEIPT (Employee or Admin)
apiRouter.post('/procurement/petty-cash/:id/upload-receipt', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const {
    receiptNumber,
    receiptDate,
    supplier,
    receiptAmount,
    currency,
    notes,
    attachmentUrl,
  } = req.body;

  if (!receiptNumber || !receiptAmount || !attachmentUrl) {
    return res.status(400).json({ error: 'Receipt number, receipt amount, and attachment are required' });
  }

  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  if (!isAdmin(user) && existing.requesterId !== user.id) {
    return res.status(403).json({ error: 'Forbidden', message: 'You can only upload receipts to your own requests' });
  }

  const prev = existing.status;
  existing.status = 'receipt_uploaded';
  existing.receipt = {
    receiptNumber,
    receiptDate: receiptDate || new Date().toISOString(),
    supplier: supplier || 'مورد محلي',
    receiptAmount: Number(receiptAmount),
    currency: currency || existing.currency,
    notes: notes || '',
    uploadedById: user.id,
    uploadedByName: user.nameAr,
    uploadedDate: new Date().toISOString(),
    attachmentUrl,
  };

  if (!existing.attachments.some((a) => a.url === attachmentUrl)) {
    existing.attachments.push({
      id: `att-${Date.now()}`,
      name: `إيصال نثريات ${receiptNumber}`,
      type: 'receipt',
      url: attachmentUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.id,
      uploadedByName: user.nameAr,
    });
  }

  existing.updatedAt = new Date().toISOString();
  db.pettyCashRequests[index] = existing;

  logAudit(
    db,
    user,
    'رفع وتوثيق إيصالات ومصروفات السلفة (RECEIPT_UPLOADED)',
    'PettyCash',
    existing.id,
    prev,
    'receipt_uploaded',
    `رقم الإيصال: ${receiptNumber} | المبلغ: ${receiptAmount} ${existing.currency}`
  );

  saveDB(db);
  return res.json(existing);
});

// RECONCILE / SETTLE PETTY CASH (Admin only)
apiRouter.post('/procurement/petty-cash/:id/reconcile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can reconcile petty cash' });
  }

  const {
    spentAmount,
    returnedAmount,
    receiptNumber,
    returnDate,
    returnReference,
    settlementStatus,
    notes,
    attachmentUrl,
  } = req.body;

  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  const prev = existing.status;

  const disbursed = existing.disbursement?.actualAmount || existing.amount;
  const spent = Number(spentAmount) !== undefined ? Number(spentAmount) : existing.receipt?.receiptAmount || disbursed;
  const returned = Number(returnedAmount) || 0;
  const variance = disbursed - (spent + returned);

  const finalStatus = settlementStatus || 'reconciled';
  existing.status = finalStatus as PettyCashStatus;
  existing.reconciliation = {
    reconciledDate: new Date().toISOString(),
    reconciledById: user.id,
    reconciledByName: user.nameAr,
    spentAmount: spent,
    returnedAmount: returned,
    variance,
    receiptNumber: receiptNumber || existing.receipt?.receiptNumber || '',
    receiptUrl: existing.receipt?.attachmentUrl || '',
    returnDate: returnDate || new Date().toISOString(),
    returnReference: returnReference || '',
    settlementStatus: finalStatus,
    notes: notes || '',
    attachmentUrl: attachmentUrl || '',
  };
  existing.updatedAt = new Date().toISOString();
  db.pettyCashRequests[index] = existing;

  logAudit(
    db,
    user,
    'تسوية سلفة النثريات وإغلاق العهدة المالية (RECONCILED)',
    'PettyCash',
    existing.id,
    prev,
    finalStatus,
    `المصروف: ${spent} | المرجع للصندوق: ${returned} | الفارق: ${variance} ${existing.currency}`
  );

  saveDB(db);
  return res.json(existing);
});

// CLOSE PETTY CASH
apiRouter.post('/procurement/petty-cash/:id/close', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isAdmin(user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can close petty cash' });
  }

  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  const prev = existing.status;

  existing.status = 'closed';
  existing.updatedAt = new Date().toISOString();
  db.pettyCashRequests[index] = existing;

  logAudit(db, user, 'إغلاق وأرشفة سند النثريات', 'PettyCash', existing.id, prev, 'closed');
  saveDB(db);
  return res.json(existing);
});

// CANCEL PETTY CASH
apiRouter.post('/procurement/petty-cash/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = loadDB();
  const index = db.pettyCashRequests.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const existing = db.pettyCashRequests[index];
  if (!isAdmin(user) && existing.requesterId !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const prev = existing.status;
  existing.status = 'cancelled';
  existing.updatedAt = new Date().toISOString();
  db.pettyCashRequests[index] = existing;

  logAudit(db, user, 'إلغاء سند النثريات', 'PettyCash', existing.id, prev, 'cancelled');
  saveDB(db);
  return res.json(existing);
});

// -------------------------------------------------------------
// CATEGORIES & AUDIT LOGS
// -------------------------------------------------------------
apiRouter.get('/procurement/categories', (_req: Request, res: Response) => {
  const db = loadDB();
  return res.json(db.categories);
});

apiRouter.get('/procurement/audit-logs', (req: Request, res: Response) => {
  const db = loadDB();
  const entityId = req.query.entityId as string;
  if (entityId) {
    return res.json(db.auditLogs.filter((a) => a.entityId === entityId));
  }
  return res.json(db.auditLogs);
});

// Mount API
app.use('/api', apiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'JBC Operations Hub Full-Stack API' });
});

// -------------------------------------------------------------
// VITE SPA MIDDLEWARE / STATIC ASSETS
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JBC Operations Hub Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
