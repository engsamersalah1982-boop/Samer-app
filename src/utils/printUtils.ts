import {
  WorkOrder,
  Equipment,
  LeaveRequest,
  PermissionRequest,
  Employee,
  PurchaseRequest,
  PettyCashRequest,
  Task,
} from '../types';

/**
 * Robust print helper: attempts dedicated window first; if blocked by iframe or browser popup blocker,
 * injects into an invisible frame and executes print smoothly.
 */
function executePrint(html: string) {
  try {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (printWindow && printWindow.document) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      return;
    }
  } catch (err) {
    console.warn('Popup print blocked or not permitted, using iframe fallback:', err);
  }

  // Fallback: render into hidden iframe
  try {
    let iframe = document.getElementById('print-iframe-helper') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe-helper';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 400);
      return;
    }
  } catch (err2) {
    console.warn('Iframe print error, falling back to window.print():', err2);
  }

  window.print();
}

/**
 * Creates and triggers a professional printable document in a dedicated print window
 * with the official Jordan Biogas Company header, official borders, and signature boxes.
 */
export function printWorkOrder(wo: WorkOrder, equipment?: Equipment) {
  const partsTotal = (wo.sparePartsUsed || []).reduce(
    (sum, p) => sum + (p.totalCostJOD || p.unitCostJOD * p.quantity || 0),
    0
  );

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>أمر صيانة فني - ${wo.workOrderNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm 15mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'Cairo';
      background-color: #ffffff;
      color: #111827;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #059669;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .company-title {
      font-size: 17px;
      font-weight: 800;
      color: #064e3b;
      margin: 0 0 3px 0;
    }
    .company-subtitle {
      font-size: 11px;
      color: #4b5563;
      margin: 0;
      font-weight: 600;
    }
    .doc-badge {
      background-color: #f0fdf4;
      border: 2px solid #059669;
      color: #065f46;
      padding: 6px 14px;
      border-radius: 8px;
      text-align: center;
    }
    .doc-badge h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
    }
    .doc-badge span {
      font-size: 11px;
      font-family: monospace;
      font-weight: bold;
    }
    .section-title {
      background-color: #f1f5f9;
      border-right: 4px solid #059669;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 8px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .info-table th, .info-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      font-size: 11px;
      text-align: right;
    }
    .info-table th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #334155;
      width: 22%;
    }
    .parts-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    .parts-table th, .parts-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      font-size: 11px;
      text-align: center;
    }
    .parts-table th {
      background-color: #f8fafc;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 10px;
    }
    .badge-closed { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-progress { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-completed { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .loto-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 8px;
      background-color: #fafafa;
    }
    .loto-item {
      display: inline-block;
      margin-left: 15px;
      font-size: 11px;
    }
    .signatures {
      margin-top: 26px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }
    .sig-box {
      flex: 1;
      border: 1px dashed #94a3b8;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      min-height: 85px;
    }
    .sig-box h4 {
      margin: 0 0 6px 0;
      font-size: 11px;
      font-weight: bold;
      color: #475569;
    }
    .sig-line {
      margin-top: 35px;
      border-top: 1px solid #64748b;
      padding-top: 4px;
      font-size: 10px;
      color: #64748b;
    }
    .footer-note {
      margin-top: 20px;
      font-size: 9px;
      color: #64748b;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="company-title">شركة الغاز الحيوي الأردنية (ذ.م.م)</h1>
      <p class="company-subtitle">Jordan Biogas Company L.L.C. - محطة توليد الكهرباء من الغاز الحيوي (الغباوي)</p>
      <p class="company-subtitle" style="margin-top: 2px;">نظام إدارة الصيانة والعمليات الميدانية (CMMS/MWM)</p>
    </div>
    <div class="doc-badge">
      <h2>سند أمر صيانة رسمي</h2>
      <span>${wo.workOrderNumber}</span>
    </div>
  </div>

  <table class="info-table">
    <tr>
      <th>رقم أمر الصيانة:</th>
      <td style="font-family: monospace; font-weight: bold;">${wo.workOrderNumber}</td>
      <th>تاريخ ووقت الإصدار:</th>
      <td style="direction: ltr; text-align: right;">${new Date(wo.createdAt).toLocaleString('ar-JO')}</td>
    </tr>
    <tr>
      <th>نوع الصيانة:</th>
      <td>
        <strong>${wo.type === 'preventive' ? 'وقائية دورية (Preventive)' : wo.type === 'emergency' ? 'طارئة حرجة (Emergency)' : 'تصحيحية علاجية (Corrective)'}</strong>
      </td>
      <th>درجة الأولوية:</th>
      <td>
        <strong>${wo.priority === 'urgent' ? 'حرجة جداً (Urgent)' : wo.priority === 'high' ? 'عالية (High)' : 'متوسطة (Medium)'}</strong>
      </td>
    </tr>
    <tr>
      <th>كود ورمز المعدة:</th>
      <td style="font-family: monospace; font-weight: bold; color: #065f46;">${wo.equipmentCode || equipment?.code || '—'}</td>
      <th>اسم المعدة / الأصل:</th>
      <td><strong>${equipment ? equipment.nameAr : wo.equipmentCode || 'معدة المحطة'}</strong></td>
    </tr>
    <tr>
      <th>موقع المعدة بالمحطة:</th>
      <td>${equipment?.location || 'محطة الغباوي - قطاع التوليد'}</td>
      <th>ساعات التشغيل المسجلة:</th>
      <td style="font-family: monospace;">${equipment?.operatingHours ? `${equipment.operatingHours.toLocaleString()} ساعة` : '—'}</td>
    </tr>
    <tr>
      <th>الفني المسؤول:</th>
      <td><strong>${wo.assignedTechnicianName || 'فني الصيانة المناوب'}</strong></td>
      <th>حالة أمر الصيانة:</th>
      <td>
        <span class="badge ${wo.status === 'closed' ? 'badge-closed' : wo.status === 'completed' ? 'badge-completed' : 'badge-progress'}">
          ${wo.status === 'closed' ? 'مغلق ومعتمد رسمياً' : wo.status === 'completed' ? 'منجز بانتظار الاعتماد' : wo.status === 'in_progress' ? 'قيد التنفيذ' : 'جديد'}
        </span>
      </td>
    </tr>
  </table>

  <div class="section-title">وصف العطل أو المشكلة الفنية المطلوب معالجتها:</div>
  <div style="border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background-color: #ffffff; font-size: 11px;">
    ${wo.problemDescription}
  </div>

  <div class="section-title">إجراءات السلامة العامة والعزل (LOTO Checklist):</div>
  <div class="loto-box">
    ${(wo.safetyChecklist || [])
      .map(
        (c) => `
      <div class="loto-item">
        <span style="font-weight: bold; color: ${c.checked ? '#15803d' : '#b45309'};">
          ${c.checked ? '☑ معتمد ومفحوص: ' : '☐ بانتظار الفحص: '}
        </span>
        ${c.labelAr}
      </div>
    `
      )
      .join('')}
  </div>

  ${
    wo.actionTaken || wo.completionNotes
      ? `
  <div class="section-title">الإجراء الفني المنفذ والتقرير الختامي للفني:</div>
  <div style="border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background-color: #ffffff; font-size: 11px;">
    ${wo.actionTaken || wo.completionNotes || '—'}
    ${wo.rootCause ? `<br><strong>السبب الجذري للعطل:</strong> ${wo.rootCause}` : ''}
    <div style="margin-top: 6px; font-size: 10px; color: #475569;">
      <strong>زمن التوقف (Downtime):</strong> ${wo.downtimeHours || 0} ساعة &nbsp;|&nbsp;
      <strong>ساعات العمل الفعلية:</strong> ${(wo as any).actualHoursFormatted ? `${(wo as any).actualHoursFormatted} (HHH:MM)` : `${wo.actualHours || 0} ساعة`}
    </div>
  </div>
  `
      : ''
  }

  <div class="section-title">قطع الغيار والمستهلكات المستخدمة في الصيانة:</div>
  ${
    (wo.sparePartsUsed || []).length > 0
      ? `
    <table class="parts-table">
      <thead>
        <tr>
          <th>#</th>
          <th>اسم القطعة</th>
          <th>رقم القطعة (Part No)</th>
          <th>الكمية</th>
          <th>سعر الوحدة (JOD)</th>
          <th>الإجمالي (JOD)</th>
        </tr>
      </thead>
      <tbody>
        ${wo.sparePartsUsed
          .map(
            (p, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="text-align: right; font-weight: 600;">${p.nameAr || p.nameEn}</td>
            <td style="font-family: monospace;">${p.partNumber || '—'}</td>
            <td>${p.quantity}</td>
            <td style="font-family: monospace;">${p.unitCostJOD.toFixed(2)} د.أ</td>
            <td style="font-family: monospace; font-weight: bold;">${p.totalCostJOD.toFixed(2)} د.أ</td>
          </tr>
        `
          )
          .join('')}
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="5" style="text-align: left; padding-left: 15px;">المجموع الكلي لقيمة قطع الغيار:</td>
          <td style="font-family: monospace; color: #065f46; font-size: 12px;">${partsTotal.toFixed(2)} دينار أردني</td>
        </tr>
      </tbody>
    </table>
  `
      : `<p style="color: #64748b; font-size: 11px; margin: 4px 0;">لم يتم تسجيل استهلاك أي قطع غيار لهذا الأمر.</p>`
  }

  <div class="signatures">
    <div class="sig-box">
      <h4>1. فني الصيانة المنفذ</h4>
      <p style="font-size: 11px; font-weight: 600; margin: 4px 0 0 0;">${wo.assignedTechnicianName || 'فني المحطة المنفذ'}</p>
      <div style="font-size: 10px; color: #475569; margin-top: 2px;">التوقيع: .......................................</div>
      <div style="font-size: 10px; color: #475569; margin-top: 4px;">التاريخ: ..... / ..... / 202... م</div>
      <div class="sig-line">توقيع فني الصيانة المنفذ</div>
    </div>
    <div class="sig-box">
      <h4>2. مهندس / مسؤول الصيانة</h4>
      <p style="font-size: 11px; font-weight: 600; margin: 4px 0 0 0;">مهندس / مسؤول الصيانة</p>
      <div style="font-size: 10px; color: #475569; margin-top: 2px;">التوقيع: .......................................</div>
      <div style="font-size: 10px; color: #475569; margin-top: 4px;">التاريخ: ..... / ..... / 202... م</div>
      <div class="sig-line">توقيع مهندس / مسؤول الصيانة</div>
    </div>
    <div class="sig-box" style="border-color: #059669; background: #f0fdf4;">
      <h4 style="color: #065f46;">3. المصادقة الرسمية</h4>
      <p style="font-size: 12px; font-weight: bold; color: #065f46; margin: 2px 0 0 0;">المدير العام</p>
      <p style="font-size: 11px; font-weight: 700; color: #1e293b; margin: 0;">م. سامر صلاح</p>
      <div style="font-size: 10px; color: #475569; margin-top: 2px;">التوقيع: .......................................</div>
      <div style="font-size: 10px; color: #475569; margin-top: 4px;">التاريخ: ..... / ..... / 202... م</div>
      <div class="sig-line" style="border-color: #059669; color: #065f46;">المصادقة والاعتماد النهائي</div>
    </div>
  </div>

  <div class="footer-note">
    سند صيانة داخلي معتمد صادر إلكترونياً من نظام شركة الغاز الحيوي الأردنية JBC • رمز المستند: JBC-MNT-DOC-${wo.id} • طُبع بتاريخ: ${new Date().toLocaleDateString('ar-JO')}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
`;

  executePrint(html);
}

/**
 * Print leave or exit permission official slip (قسيمة إجازة أو إذن مغادرة رسمي لبوابة المحطة)
 */
export function printRequestSlip(
  req: LeaveRequest | PermissionRequest,
  emp: Employee,
  type: 'leave' | 'permission'
) {
  const isLeave = type === 'leave';
  const leave = isLeave ? (req as LeaveRequest) : null;
  const perm = !isLeave ? (req as PermissionRequest) : null;

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${isLeave ? 'إشعار إجازة رسمي' : 'إذن مغادرة رسمي'} - ${emp.nameAr}</title>
  <style>
    @page { size: A5 landscape; margin: 10mm; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      margin: 0; padding: 15px; color: #111827; font-size: 12px;
    }
    .card {
      border: 2px solid #059669;
      border-radius: 12px;
      padding: 16px;
      background: #ffffff;
    }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;
    }
    h2 { margin: 0; font-size: 15px; color: #065f46; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; text-align: right; }
    th { background: #f8fafc; font-weight: 600; width: 25%; }
    .status-stamp {
      display: inline-block; padding: 4px 12px; border-radius: 6px;
      font-weight: 800; font-size: 11px;
      background: #dcfce7; color: #166534; border: 1.5px solid #22c55e;
    }
    .signatures { display: flex; justify-content: space-between; margin-top: 25px; gap: 20px; }
    .sig { flex: 1; border-top: 1px dashed #64748b; padding-top: 6px; text-align: center; font-size: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h3 style="margin: 0; font-size: 13px; color: #047857;">شركة الغاز الحيوي الأردنية (JBC)</h3>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">إدارة الموارد البشرية والعمليات</p>
      </div>
      <div style="text-align: center;">
        <h2>${isLeave ? 'نموذج إشعار إجازة معتمد' : 'تصريح إذن مغادرة بوابة المحطة'}</h2>
        <span class="status-stamp">معتمد رسمياً ✓</span>
      </div>
    </div>

    <table>
      <tr>
        <th>اسم الموظف:</th>
        <td><strong>${emp.nameAr}</strong> (${emp.code})</td>
        <th>المسمى الوظيفي والقسم:</th>
        <td>${emp.jobTitleAr} — ${emp.department}</td>
      </tr>
      ${
        isLeave
          ? `
      <tr>
        <th>نوع الإجازة:</th>
        <td>${leave?.leaveType === 'annual' ? 'إجازة سنوية' : leave?.leaveType === 'sick' ? 'إجازة مرضية' : 'إجازة عارضة'}</td>
        <th>المدة بالأيام:</th>
        <td><strong>${leave?.daysCount} أيام</strong> (من ${leave?.startDate} إلى ${leave?.endDate})</td>
      </tr>
      <tr>
        <th>السبب:</th>
        <td colspan="3">${leave?.reason}</td>
      </tr>
      `
          : `
      <tr>
        <th>تاريخ المغادرة:</th>
        <td><strong>${perm?.date}</strong></td>
        <th>ساعات وتوقيت المغادرة:</th>
        <td>من ${perm?.startTime} إلى ${perm?.endTime} (<strong>${perm?.durationHours} ساعة</strong>)</td>
      </tr>
      <tr>
        <th>نوع وسبب المغادرة:</th>
        <td colspan="3">${perm?.reasonType === 'official' ? 'مهمة عمل رسمية' : 'مغادرة شخصية'}: ${perm?.reason}</td>
      </tr>
      `
      }
      <tr>
        <th>المسؤول المعتمد:</th>
        <td>${(isLeave ? leave?.approvedByName : perm?.approvedByName) || 'مدير المحطة'}</td>
        <th>تاريخ الاعتماد:</th>
        <td>${new Date().toLocaleDateString('ar-JO')}</td>
      </tr>
    </table>

    <div class="signatures" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 18px;">
      <div class="sig" style="border: 1px dashed #94a3b8; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 3px; color: #1e293b;">1. الموظف</div>
        <div style="font-size: 10px; color: #334155;">${emp.nameAr}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 8px;">التوقيع: ....................................</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">التاريخ: ..... / ..... / 202... م</div>
      </div>
      <div class="sig" style="border: 1px dashed #94a3b8; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 3px; color: #1e293b;">2. المسؤول المباشر</div>
        <div style="font-size: 10px; color: #334155;">المسؤول المباشر</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 8px;">التوقيع: ....................................</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">التاريخ: ..... / ..... / 202... م</div>
      </div>
      <div class="sig" style="border: 1px solid #059669; border-radius: 8px; padding: 10px; text-align: center; background: #f0fdf4;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 2px; color: #065f46;">3. المدير العام</div>
        <div style="font-size: 11px; font-weight: 700; color: #1e293b;">م. سامر صلاح</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 6px;">التوقيع: ....................................</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">التاريخ: ..... / ..... / 202... م</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
`;

  executePrint(html);
}

export function printPurchaseRequest(pr: PurchaseRequest, isAdmin = false) {
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>نموذج طلب شراء داخلي - ${pr.requestNumber}</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0; padding: 15px; color: #0f172a; background: #fff; font-size: 11pt; line-height: 1.5;
    }
    .page-container {
      max-width: 800px; margin: 0 auto; border: 2px solid #047857; border-radius: 8px; padding: 20px;
    }
    .header {
      display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 15px;
    }
    .badge {
      display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11px;
    }
    .badge-approved { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-pending { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .badge-received { background: #e0f2fe; color: #075985; border: 1px solid #7dd3fc; }
    table {
      width: 100%; border-collapse: collapse; margin-bottom: 14px;
    }
    th, td {
      border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 10pt; text-align: right;
    }
    th {
      background: #f1f5f9; color: #334155; font-weight: 600; width: 22%;
    }
    .section-title {
      font-size: 11pt; font-weight: bold; color: #065f46; margin: 12px 0 6px 0; border-right: 4px solid #059669; padding-right: 8px;
    }
    .signatures {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 24px;
    }
    .sig-box {
      border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px; text-align: center; background: #f8fafc; font-size: 9.5pt;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <div>
        <div style="font-size: 15pt; font-weight: 800; color: #065f46;">شركة الغاز الحيوي الأردنية (JBC)</div>
        <div style="font-size: 9pt; color: #64748b;">Jordan Biogas Company - محطة مكب الغباوي الهندسي</div>
        <div style="font-size: 12pt; font-weight: bold; margin-top: 4px; color: #1e293b;">نموذج طلب شراء داخلي (Purchase Requisition)</div>
      </div>
      <div style="text-align: left; direction: ltr;">
        <div style="font-family: monospace; font-size: 13pt; font-weight: 800; color: #047857;">${pr.requestNumber}</div>
        <div style="font-size: 9pt; color: #64748b;">Date: ${new Date(pr.requestDate).toLocaleDateString('en-GB')}</div>
        <div style="margin-top: 4px;">
          <span class="badge ${pr.status === 'approved' || pr.status === 'purchased' || pr.status === 'received' ? 'badge-approved' : 'badge-pending'}">
            الحالة: ${pr.status === 'approved' ? 'معتمد' : pr.status === 'purchased' ? 'تم الشراء' : pr.status === 'received' ? 'تم الاستلام' : 'قيد المتابعة'}
          </span>
        </div>
      </div>
    </div>

    <div class="section-title">1. بيانات مقدم الطلب والأولويات</div>
    <table>
      <tr>
        <th>مقدم الطلب:</th>
        <td><strong>${pr.requesterName}</strong></td>
        <th>الدائرة / القسم:</th>
        <td>${pr.department} ${pr.section ? ` - ${pr.section}` : ''}</td>
      </tr>
      <tr>
        <th>درجة الأولوية:</th>
        <td><strong>${pr.priority === 'urgent' ? 'طارئة جداً (عاجل)' : pr.priority === 'high' ? 'عالية' : pr.priority === 'medium' ? 'متوسطة' : 'عادية'}</strong></td>
        <th>التاريخ المطلوب للتوريد:</th>
        <td>${pr.requiredDate}</td>
      </tr>
      <tr>
        <th>المعدة / الأصل المرتبط:</th>
        <td>${pr.relatedEquipmentName || pr.relatedEquipmentId || 'غير محدد (مستلزمات عامة)'}</td>
        <th>مهمة الصيانة المرتبطة:</th>
        <td>${pr.relatedTaskCode || pr.relatedTaskId || 'لا يوجد'}</td>
      </tr>
    </table>

    <div class="section-title">2. تفاصيل المادة أو الخدمة المطلوبة</div>
    <table>
      <tr>
        <th>اسم المادة / الوصف:</th>
        <td colspan="3"><strong style="font-size: 11pt; color: #0f172a;">${pr.itemDescription}</strong></td>
      </tr>
      <tr>
        <th>التصنيف الفني:</th>
        <td>${pr.category}</td>
        <th>الكمية والوحدة:</th>
        <td><strong>${pr.quantity} ${pr.unit}</strong></td>
      </tr>
      <tr>
        <th>السعر التقديري للوحدة:</th>
        <td>${pr.estimatedUnitPrice} ${pr.currency}</td>
        <th>إجمالي القيمة التقديرية:</th>
        <td><strong style="color: #047857; font-size: 11.5pt;">${pr.estimatedTotal.toLocaleString()} ${pr.currency}</strong></td>
      </tr>
      <tr>
        <th>مبررات الطلب والجدوى:</th>
        <td colspan="3">${pr.justification}</td>
      </tr>
      ${
        isAdmin && pr.suggestedSupplier
          ? `
      <tr>
        <th>المورد المقترح:</th>
        <td>${pr.suggestedSupplier}</td>
        <th>بيانات اتصال المورد:</th>
        <td>${pr.supplierContact || '—'}</td>
      </tr>
      `
          : ''
      }
      ${
        pr.notes
          ? `
      <tr>
        <th>ملاحظات إضافية:</th>
        <td colspan="3">${pr.notes}</td>
      </tr>
      `
          : ''
      }
    </table>

    ${
      pr.purchaseDetails && isAdmin
        ? `
    <div class="section-title">3. بيانات أمر الشراء والتوريد الفعلي (للإدارة والمشتريات)</div>
    <table>
      <tr>
        <th>المورد المعتمد:</th>
        <td>${pr.purchaseDetails.supplier}</td>
        <th>رقم أمر الشراء (PO):</th>
        <td>${pr.purchaseDetails.poNumber || '—'}</td>
      </tr>
      <tr>
        <th>تاريخ الشراء:</th>
        <td>${pr.purchaseDetails.purchaseDate ? new Date(pr.purchaseDetails.purchaseDate).toLocaleDateString('ar-JO') : '—'}</td>
        <th>القيمة الفعلية الإجمالية:</th>
        <td><strong>${pr.purchaseDetails.actualTotal} ${pr.purchaseDetails.currency}</strong></td>
      </tr>
    </table>
    `
        : ''
    }

    ${
      pr.receivingDetails
        ? `
    <div class="section-title">4. محضر استلام وفحص المواد</div>
    <table>
      <tr>
        <th>تاريخ الاستلام:</th>
        <td>${new Date(pr.receivingDetails.receivedDate).toLocaleDateString('ar-JO')}</td>
        <th>المستلم الفعلي:</th>
        <td>${pr.receivingDetails.receivedByName}</td>
      </tr>
      <tr>
        <th>الكمية المستلمة:</th>
        <td>${pr.receivingDetails.quantityReceived} ${pr.unit} (${pr.receivingDetails.isPartial ? 'استلام جزئي' : 'استلام كامل ومطابق'})</td>
        <th>الحالة الفنية عند الاستلام:</th>
        <td><strong>${pr.receivingDetails.condition === 'excellent' ? 'ممتازة ومطابقة للمواصفة' : pr.receivingDetails.condition === 'acceptable' ? 'مقبولة' : 'تحت الفحص'}</strong></td>
      </tr>
      ${pr.receivingDetails.notes ? `<tr><th>ملاحظات الاستلام:</th><td colspan="3">${pr.receivingDetails.notes}</td></tr>` : ''}
    </table>
    `
        : ''
    }

    ${
      pr.invoiceDetails
        ? `
    <div class="section-title">5. بيانات الفاتورة الضريبية وسند الشراء</div>
    <table>
      <tr>
        <th>رقم الفاتورة:</th>
        <td><strong>${pr.invoiceDetails.invoiceNumber}</strong></td>
        <th>تاريخ الفاتورة:</th>
        <td>${new Date(pr.invoiceDetails.invoiceDate).toLocaleDateString('ar-JO')}</td>
      </tr>
      <tr>
        <th>المورد:</th>
        <td>${pr.invoiceDetails.supplier}</td>
        <th>مبلغ الفاتورة:</th>
        <td><strong style="color: #065f46;">${pr.invoiceDetails.invoiceAmount} ${pr.invoiceDetails.currency}</strong></td>
      </tr>
      ${pr.invoiceDetails.notes ? `<tr><th>ملاحظات:</th><td colspan="3">${pr.invoiceDetails.notes}</td></tr>` : ''}
    </table>
    `
        : ''
    }

    ${
      pr.reconciliation
        ? `
    <div class="section-title">6. محضر المطابقة والتسوية المالية</div>
    <table>
      <tr>
        <th>تاريخ التسوية:</th>
        <td>${new Date(pr.reconciliation.reconciledDate).toLocaleDateString('ar-JO')}</td>
        <th>المسؤول عن المطابقة:</th>
        <td>${pr.reconciliation.reconciledByName}</td>
      </tr>
      <tr>
        <th>المبلغ المقدر:</th>
        <td>${pr.reconciliation.estimatedTotal} ${pr.currency}</td>
        <th>المبلغ الفعلي:</th>
        <td>${pr.reconciliation.actualTotal} ${pr.currency}</td>
      </tr>
      <tr>
        <th>فارق المطابقة (Variance):</th>
        <td colspan="3"><strong style="color: ${pr.reconciliation.variance > 0 ? '#b91c1c' : '#047857'};">${pr.reconciliation.variance} ${pr.currency}</strong></td>
      </tr>
      ${pr.reconciliation.notes ? `<tr><th>ملاحظات التسوية:</th><td colspan="3">${pr.reconciliation.notes}</td></tr>` : ''}
    </table>
    `
        : ''
    }

    ${
      pr.approval
        ? `
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px; margin-top: 10px; font-size: 10pt;">
      <strong>بيانات الاعتماد:</strong> معتمد بواسطة <strong>${pr.approval.approvedByName || 'المدير العام'}</strong> بتاريخ ${pr.approval.approvalDate ? new Date(pr.approval.approvalDate).toLocaleDateString('ar-JO') : '—'} 
      ${pr.approval.approvalNotes ? ` - ملاحظات: ${pr.approval.approvalNotes}` : ''}
    </div>
    `
        : ''
    }

    <div class="signatures">
      <div class="sig-box">
        <div style="font-weight: 700; color: #1e293b;">1. مقدم الطلب (إعداد)</div>
        <div style="margin: 6px 0; color: #334155;">${pr.requesterName}</div>
        <div style="color: #64748b; margin-top: 14px;">التوقيع: ............................</div>
      </div>
      <div class="sig-box">
        <div style="font-weight: 700; color: #1e293b;">2. تدقيق المشتريات والمالية</div>
        <div style="margin: 6px 0; color: #334155;">قسم المحاسبة والمستودعات</div>
        <div style="color: #64748b; margin-top: 14px;">التوقيع: ............................</div>
      </div>
      <div class="sig-box" style="border: 1px solid #059669; background: #f0fdf4;">
        <div style="font-weight: 700; color: #065f46;">3. اعتماد المدير العام / المفوض</div>
        <div style="margin: 6px 0; font-weight: 700; color: #1e293b;">م. سامر صلاح</div>
        <div style="color: #64748b; margin-top: 14px;">التوقيع: ............................</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
`;
  executePrint(html);
}

export function printPettyCashRequest(pc: PettyCashRequest, isAdmin = false) {
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>سند صرف نثريات - ${pc.requestNumber}</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 14mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0; padding: 15px; color: #0f172a; background: #fff; font-size: 11pt; line-height: 1.5;
    }
    .page-container {
      max-width: 780px; margin: 0 auto; border: 2px solid #0284c7; border-radius: 8px; padding: 22px;
    }
    .header {
      display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;
    }
    table {
      width: 100%; border-collapse: collapse; margin-bottom: 15px;
    }
    th, td {
      border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 10pt; text-align: right;
    }
    th {
      background: #f8fafc; color: #334155; font-weight: 600; width: 24%;
    }
    .section-title {
      font-size: 11pt; font-weight: bold; color: #0369a1; margin: 12px 0 6px 0; border-right: 4px solid #0284c7; padding-right: 8px;
    }
    .amount-box {
      background: #f0f9ff; border: 1.5px dashed #0284c7; border-radius: 8px; padding: 12px; text-align: center; margin: 12px 0;
    }
    .signatures {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 24px;
    }
    .sig-box {
      border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px; text-align: center; background: #f8fafc; font-size: 9.5pt;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <div>
        <div style="font-size: 15pt; font-weight: 800; color: #0369a1;">شركة الغاز الحيوي الأردنية (JBC)</div>
        <div style="font-size: 9pt; color: #64748b;">Jordan Biogas Company - محطة مكب الغباوي الهندسي</div>
        <div style="font-size: 12.5pt; font-weight: bold; margin-top: 4px; color: #0f172a;">سند طلب وصرف نثريات (Petty Cash Voucher)</div>
      </div>
      <div style="text-align: left; direction: ltr;">
        <div style="font-family: monospace; font-size: 13pt; font-weight: 800; color: #0284c7;">${pc.requestNumber}</div>
        <div style="font-size: 9pt; color: #64748b;">Date: ${new Date(pc.requestDate).toLocaleDateString('en-GB')}</div>
      </div>
    </div>

    <div class="amount-box">
      <div style="font-size: 10pt; color: #0369a1; font-weight: 600;">المبلغ المطلوب صرفه نقداً:</div>
      <div style="font-size: 18pt; font-weight: 800; color: #0f172a; margin-top: 2px;">
        ${pc.amount.toFixed(2)} ${pc.currency}
      </div>
    </div>

    <div class="section-title">بيانات الطلب والغاية</div>
    <table>
      <tr>
        <th>الموظف المستفيد:</th>
        <td><strong>${pc.requesterName}</strong></td>
        <th>الدائرة / الموقع:</th>
        <td>${pc.department}</td>
      </tr>
      <tr>
        <th>الغاية من الصرف:</th>
        <td colspan="3"><strong style="color: #0f172a;">${pc.purpose}</strong></td>
      </tr>
      <tr>
        <th>تصنيف المصروف:</th>
        <td>${pc.expenseCategory}</td>
        <th>المعدة / المهمة المرتبطة:</th>
        <td>${pc.relatedEquipmentName || pc.relatedTaskCode || 'عام / موقع'}</td>
      </tr>
      ${pc.notes ? `<tr><th>ملاحظات:</th><td colspan="3">${pc.notes}</td></tr>` : ''}
    </table>

    ${
      pc.disbursement
        ? `
    <div class="section-title">بيانات الصرف المالي الفعلي</div>
    <table>
      <tr>
        <th>تاريخ الصرف:</th>
        <td>${new Date(pc.disbursement.disbursedDate).toLocaleDateString('ar-JO')}</td>
        <th>أمين الصندوق / القائم بالصرف:</th>
        <td>${pc.disbursement.disbursedByName}</td>
      </tr>
      <tr>
        <th>المبلغ المصروف فعلياً:</th>
        <td><strong>${pc.disbursement.actualAmount} ${pc.currency}</strong></td>
        <th>رقم سند الصرف:</th>
        <td>${pc.disbursement.paymentRef || 'نقداً من الصندوق'}</td>
      </tr>
    </table>
    `
        : ''
    }

    ${
      pc.receipt
        ? `
    <div class="section-title">بيانات فواتير وإيصالات المشتريات المرفقة</div>
    <table>
      <tr>
        <th>رقم الإيصال / الفاتورة:</th>
        <td><strong>${pc.receipt.receiptNumber}</strong></td>
        <th>تاريخ الفاتورة:</th>
        <td>${new Date(pc.receipt.receiptDate).toLocaleDateString('ar-JO')}</td>
      </tr>
      <tr>
        <th>المورد / المحل:</th>
        <td>${pc.receipt.supplier}</td>
        <th>المبلغ الإجمالي بالفاتورة:</th>
        <td><strong style="color: #0369a1;">${pc.receipt.receiptAmount} ${pc.receipt.currency}</strong></td>
      </tr>
      ${pc.receipt.notes ? `<tr><th>ملاحظات:</th><td colspan="3">${pc.receipt.notes}</td></tr>` : ''}
    </table>
    `
        : ''
    }

    ${
      pc.reconciliation
        ? `
    <div class="section-title">محضر التسوية وإرجاع الفواتير (Reconciliation)</div>
    <table>
      <tr>
        <th>تاريخ التسوية:</th>
        <td>${new Date(pc.reconciliation.reconciledDate).toLocaleDateString('ar-JO')}</td>
        <th>المبلغ المصروف بموجب فواتير:</th>
        <td><strong>${pc.reconciliation.spentAmount} ${pc.currency}</strong></td>
      </tr>
      <tr>
        <th>المبلغ المرجع للصندوق:</th>
        <td><strong>${pc.reconciliation.returnedAmount} ${pc.currency}</strong></td>
        <th>رقم الفاتورة الضريبية:</th>
        <td>${pc.reconciliation.receiptNumber || 'مرفق طي السند'}</td>
      </tr>
    </table>
    `
        : ''
    }

    <div class="signatures">
      <div class="sig-box">
        <div style="font-weight: 700; color: #1e293b;">1. مستلم السلفة (الموظف)</div>
        <div style="margin: 6px 0; color: #334155;">${pc.requesterName}</div>
        <div style="color: #64748b; margin-top: 14px;">التوقيع: ............................</div>
      </div>
      <div class="sig-box">
        <div style="font-weight: 700; color: #1e293b;">2. أمين الصندوق</div>
        <div style="margin: 6px 0; color: #334155;">المحاسبة والمالية</div>
        <div style="color: #64748b; margin-top: 14px;">التوقيع: ............................</div>
      </div>
      <div class="sig-box" style="border: 1px solid #0284c7; background: #f0f9ff;">
        <div style="font-weight: 700; color: #0369a1;">3. اعتماد الصرف (المدير)</div>
        <div style="margin: 6px 0; font-weight: 700; color: #1e293b;">م. سامر صلاح</div>
        <div style="color: #64748b; margin-top: 14px;">التوقيع: ............................</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>
`;
  executePrint(html);
}

/**
 * Prints an official single Task card/sheet
 */
export function printTask(task: Task) {
  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتملة (بانتظار الاعتماد)',
    closed: 'معتمدة ومغلقة رسمياً',
    cancelled: 'ملغاة',
  };

  const priorityLabels: Record<string, string> = {
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية',
    urgent: 'طبيعة عاجلة جداً',
  };

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>بطاقة مهمة تشغيلية - ${task.taskCode}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #fff;
    }
    .sheet {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #0284c7;
      border-radius: 8px;
      padding: 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 20px;
      font-weight: bold;
      color: #0369a1;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
    }
    .code-badge {
      font-size: 16px;
      font-weight: 700;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0284c7;
      padding: 6px 14px;
      border-radius: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 9px 12px;
      font-size: 14px;
      text-align: right;
    }
    th {
      background: #f8fafc;
      width: 25%;
      font-weight: 600;
      color: #334155;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #0284c7;
      margin: 16px 0 8px;
      border-right: 4px solid #0284c7;
      padding-right: 8px;
    }
    .checklist-item {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .checkbox {
      width: 16px;
      height: 16px;
      border: 1.5px solid #64748b;
      display: inline-block;
      text-align: center;
      line-height: 14px;
      font-size: 12px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 36px;
    }
    .sig-box {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      font-size: 13px;
    }
    @media print {
      body { padding: 0; }
      .sheet { border: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="title">شركة الغاز الحيوي الأردنية</div>
        <div class="subtitle">محطة توليد الكهرباء من الغاز الحيوي - موقع الغباوي</div>
      </div>
      <div>
        <div class="code-badge">${task.taskCode}</div>
      </div>
    </div>

    <div class="section-title">بيانات المهمة التشغيلية</div>
    <table>
      <tr>
        <th>عنوان المهمة:</th>
        <td colspan="3"><strong>${task.titleAr}</strong> (${task.titleEn})</td>
      </tr>
      <tr>
        <th>الحالة الراهنة:</th>
        <td><strong>${statusLabels[task.status] || task.status}</strong></td>
        <th>درجة الأولوية:</th>
        <td>${priorityLabels[task.priority] || task.priority}</td>
      </tr>
      <tr>
        <th>المكلف بالتنفيذ:</th>
        <td><strong>${task.assignedToName || 'غير محدد'}</strong></td>
        <th>تاريخ الاستحقاق:</th>
        <td>${task.dueDate}</td>
      </tr>
      <tr>
        <th>الساعات المقدرة:</th>
        <td>${task.estimatedHours} ساعة</td>
        <th>الساعات الفعلية:</th>
        <td><strong>${task.actualHoursFormatted || (task.actualHours ? task.actualHours + ' ساعة' : 'لم تحدد')}</strong></td>
      </tr>
      <tr>
        <th>وصف المهمة:</th>
        <td colspan="3">${task.descriptionAr || 'لا يوجد وصف تفصيلي'}</td>
      </tr>
      ${task.completionNotes ? `<tr><th>ملاحظات الإنجاز:</th><td colspan="3" style="color: #0369a1;">${task.completionNotes}</td></tr>` : ''}
      ${task.adminApprovalNotes ? `<tr><th>ملاحظات اعتماد الإدارة:</th><td colspan="3" style="color: #059669;">${task.adminApprovalNotes} (المعتمد: ${task.closedByName || 'الإدارة'})</td></tr>` : ''}
    </table>

    ${task.checklist && task.checklist.length > 0 ? `
    <div class="section-title">قائمة بنود الفحص والإنجاز (Checklist)</div>
    <div>
      ${task.checklist.map((item) => `
        <div class="checklist-item">
          <span class="checkbox">${item.completed ? '✓' : ''}</span>
          <span>${item.textAr}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="signatures">
      <div class="sig-box">
        <div><strong>المكلف بالتنفيذ</strong></div>
        <div style="margin: 6px 0;">${task.assignedToName || 'الفني المسؤول'}</div>
        <div style="margin-top: 24px; color: #64748b;">التوقيع: ............................</div>
      </div>
      <div class="sig-box" style="border-color: #0284c7; background: #f8fafc;">
        <div><strong style="color: #0369a1;">اعتماد مهندس الموقع / الإدارة</strong></div>
        <div style="margin: 6px 0;">${task.closedByName || 'م. سامر صلاح (مدير الموقع)'}</div>
        <div style="margin-top: 24px; color: #64748b;">التوقيع: ............................</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 400); };
  </script>
</body>
</html>
  `;
  executePrint(html);
}

/**
 * Prints a summary report of daily operational tasks
 */
export function printTaskReport(tasks: Task[]) {
  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتملة',
    closed: 'معتمدة ومغلقة',
    cancelled: 'ملغاة',
  };

  const totalEst = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalActMin = tasks.reduce((sum, t) => sum + (t.actualMinutes || (t.actualHours ? t.actualHours * 60 : 0)), 0);
  const actHours = Math.floor(totalActMin / 60);
  const actMins = totalActMin % 60;
  const actFormatted = `${String(actHours).padStart(3, '0')}:${String(actMins).padStart(2, '0')}`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير المهام اليومية والتشغيلية</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title { font-size: 20px; font-weight: bold; color: #0369a1; }
    .subtitle { font-size: 13px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
    th { background: #f1f5f9; color: #334155; }
    .summary-box {
      display: flex;
      gap: 16px;
      margin: 16px 0;
      font-size: 13px;
    }
    .summary-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 6px;
      flex: 1;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
    .sig { width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 13px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">شركة الغاز الحيوي الأردنية المساهمة الخاصة المحدودة</div>
      <div class="subtitle">محطة توليد الكهرباء من الغاز الحيوي - موقع الغباوي | تقرير متابعة المهام التشغيلية</div>
    </div>
    <div style="font-size: 12px; color: #64748b; text-align: left;">
      تاريخ استخراج التقرير:<br><strong>${new Date().toLocaleDateString('ar-JO')}</strong>
    </div>
  </div>

  <div class="summary-box">
    <div class="summary-item">إجمالي المهام بالتقرير: <strong>${tasks.length} مهمة</strong></div>
    <div class="summary-item">مجموع الساعات التقديرية: <strong>${totalEst} ساعة</strong></div>
    <div class="summary-item">مجموع الساعات الفعلية المنفذة: <strong>${actFormatted}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 10%;">رمز المهمة</th>
        <th style="width: 25%;">عنوان المهمة</th>
        <th style="width: 18%;">الفني المكلف</th>
        <th style="width: 12%;">الأولوية</th>
        <th style="width: 12%;">تاريخ الاستحقاق</th>
        <th style="width: 13%;">الساعات (فعلية/مقدرة)</th>
        <th style="width: 10%;">الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${tasks.map((t) => `
        <tr>
          <td><strong>${t.taskCode}</strong></td>
          <td>${t.titleAr}</td>
          <td>${t.assignedToName || 'غير محدد'}</td>
          <td>${t.priority}</td>
          <td>${t.dueDate}</td>
          <td>${t.actualHoursFormatted || (t.actualHours ? t.actualHours + ' س' : '-')} / ${t.estimatedHours} س</td>
          <td><strong>${statusLabels[t.status] || t.status}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig">إعداد مسؤول العمليات والتشغيل</div>
    <div class="sig">اعتماد مدير الموقع: <strong>م. سامر صلاح</strong></div>
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 400); };
  </script>
</body>
</html>
  `;
  executePrint(html);
}

/**
 * Prints a summary report of procurement purchase requests
 */
export function printProcurementReport(purchases: PurchaseRequest[]) {
  const statusLabels: Record<string, string> = {
    draft: 'مسودة',
    pending_approval: 'بانتظار الاعتماد',
    approved: 'معتمد وموافق عليه',
    rejected: 'مرفوض',
    returned_for_edit: 'معاد للاستكمال',
    purchase_in_progress: 'جاري الشراء والتعميد',
    items_received: 'تم استلام المواد',
    invoice_uploaded: 'تم إرفاق الفاتورة',
    reconciled: 'تمت التسوية والمطابقة',
    closed: 'مغلق ومحفوظ بالأرشيف',
    cancelled: 'ملغي',
  };

  const totalValue = purchases.reduce((sum, p) => sum + (p.estimatedTotal || 0), 0);

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير طلبات الشراء والمشتريات</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #0f172a; margin: 0; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; }
    .title { font-size: 20px; font-weight: bold; color: #0369a1; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
    th { background: #f8fafc; color: #334155; }
    .sig { width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 13px; margin-top: 36px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">شركة الغاز الحيوي الأردنية - كشف طلبات الشراء والمشتريات</div>
      <div style="font-size: 13px; color: #64748b;">محطة توليد الكهرباء من الغاز الحيوي - موقع الغباوي</div>
    </div>
    <div style="font-size: 12px; color: #64748b; text-align: left;">
      تاريخ التقرير: <strong>${new Date().toLocaleDateString('ar-JO')}</strong>
    </div>
  </div>

  <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 12px; border-radius: 6px; margin-bottom: 14px; font-size: 14px;">
    عدد الطلبات: <strong>${purchases.length}</strong> | القيمة الإجمالية المقدرة: <strong>${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} JOD</strong>
  </div>

  <table>
    <thead>
      <tr>
        <th>رقم الطلب</th>
        <th>التاريخ</th>
        <th>المادة المطلوبة</th>
        <th>مقدم الطلب</th>
        <th>الكمية</th>
        <th>القيمة المقدرة</th>
        <th>الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${purchases.map((p) => `
        <tr>
          <td><strong>${p.requestNumber}</strong></td>
          <td>${new Date(p.requestDate).toLocaleDateString('ar-JO')}</td>
          <td>${p.itemDescription}</td>
          <td>${p.requesterName}</td>
          <td>${p.quantity} ${p.unit}</td>
          <td>${p.estimatedTotal} ${p.currency}</td>
          <td><strong>${statusLabels[p.status] || p.status}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between;">
    <div class="sig">مسؤول المشتريات والمستودعات</div>
    <div class="sig">اعتماد الإدارة: <strong>م. سامر صلاح</strong></div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
</body>
</html>
  `;
  executePrint(html);
}

/**
 * Prints a summary report of petty cash expenditures
 */
export function printPettyCashReport(pettyCashList: PettyCashRequest[]) {
  const statusLabels: Record<string, string> = {
    draft: 'مسودة',
    pending_approval: 'بانتظار الاعتماد',
    approved: 'معتمد للصرف',
    rejected: 'مرفوض',
    disbursed: 'تم صرف المبلغ',
    receipt_uploaded: 'أرفقت الفاتورة',
    reconciled: 'تمت التسوية',
    closed: 'مغلق ومحفوظ',
    cancelled: 'ملغي',
  };

  const totalAmount = pettyCashList.reduce((sum, pc) => sum + (pc.amount || 0), 0);

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف سندات سلفة النثريات</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #0f172a; margin: 0; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; }
    .title { font-size: 20px; font-weight: bold; color: #0369a1; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
    th { background: #f8fafc; color: #334155; }
    .sig { width: 45%; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 13px; margin-top: 36px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">شركة الغاز الحيوي الأردنية - كشف سندات سلفة النثريات والمصروفات النثرية</div>
      <div style="font-size: 13px; color: #64748b;">محطة توليد الكهرباء من الغاز الحيوي - موقع الغباوي</div>
    </div>
    <div style="font-size: 12px; color: #64748b; text-align: left;">
      تاريخ الكشف: <strong>${new Date().toLocaleDateString('ar-JO')}</strong>
    </div>
  </div>

  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; margin-bottom: 14px; font-size: 14px;">
    إجمالي السندات: <strong>${pettyCashList.length}</strong> | مجموع مبالغ السلف: <strong>${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} JOD</strong>
  </div>

  <table>
    <thead>
      <tr>
        <th>رقم السند</th>
        <th>التاريخ</th>
        <th>الغاية من السلفة</th>
        <th>المستفيد / الطالب</th>
        <th>المبلغ</th>
        <th>الحالة</th>
      </tr>
    </thead>
    <tbody>
      ${pettyCashList.map((pc) => `
        <tr>
          <td><strong>${pc.requestNumber}</strong></td>
          <td>${new Date(pc.requestDate).toLocaleDateString('ar-JO')}</td>
          <td>${pc.purpose}</td>
          <td>${pc.requesterName}</td>
          <td><strong>${pc.amount} ${pc.currency}</strong></td>
          <td><strong>${statusLabels[pc.status] || pc.status}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between;">
    <div class="sig">أمين الصندوق والمحاسبة</div>
    <div class="sig">اعتماد الصرف (المدير): <strong>م. سامر صلاح</strong></div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
</body>
</html>
  `;
  executePrint(html);
}

