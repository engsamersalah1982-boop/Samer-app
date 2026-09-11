import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  FileSpreadsheet,
  CheckSquare,
  Wrench,
  Users,
  Clock,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { db } from '../../services/db';
import { useLanguage } from '../../i18n/LanguageContext';

export const ReportsModule: React.FC = () => {
  const { isArabic, t } = useLanguage();
  const [reportType, setReportType] = useState<'tasks' | 'maintenance' | 'attendance' | 'equipment'>('maintenance');
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'week'>('month');

  const tasks = db.getTasks();
  const workOrders = db.getWorkOrders();
  const employees = db.getEmployees();
  const equipment = db.getEquipment();

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'maintenance') {
      csvContent += 'Work Order Number,Equipment,Status,Priority,Problem,Spare Parts Cost (JOD),Date\r\n';
      workOrders.forEach((wo) => {
        const eq = equipment.find((e) => e.id === wo.equipmentId);
        const cost = (wo.sparePartsUsed || []).reduce((acc, p) => acc + p.totalCostJOD, 0);
        csvContent += `"${wo.workOrderNumber}","${eq?.code || ''}","${wo.status}","${wo.priority}","${wo.problemDescription.replace(/"/g, '""')}","${cost}","${wo.createdAt}"\r\n`;
      });
    } else if (reportType === 'tasks') {
      csvContent += 'Task Code,Title,Status,Priority,Due Date,Estimated Hours,Actual Hours\r\n';
      tasks.forEach((t) => {
        csvContent += `"${t.taskCode}","${t.titleAr}","${t.status}","${t.priority}","${t.dueDate}","${t.estimatedHours}","${t.actualHours || 0}"\r\n`;
      });
    } else if (reportType === 'attendance') {
      csvContent += 'Employee Code,Name,Job Title,Status,Annual Leave Remaining,Sick Leave Remaining\r\n';
      employees.forEach((e) => {
        csvContent += `"${e.code}","${e.nameAr}","${e.jobTitleAr}","${e.status}","${e.annualLeaveBalance}","${e.sickLeaveBalance}"\r\n`;
      });
    } else {
      csvContent += 'Code,Name,Status,Operating Hours,Model,Location\r\n';
      equipment.forEach((eq) => {
        csvContent += `"${eq.code}","${eq.nameAr}","${eq.status}","${eq.operatingHours}","${eq.model}","${eq.location}"\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JBC_Report_${reportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-14 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/30">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t('navReports')}</h2>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'تقارير أداء المحطة، سجلات الأعطال، وتكاليف قطع الغيار وساعات التشغيل'
                : 'Plant operational metrics, maintenance costs, and workforce analytics'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isArabic ? 'تصدير Excel (CSV)' : 'Export Excel'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>{isArabic ? 'طباعة التقرير' : 'Print PDF'}</span>
          </button>
        </div>
      </div>

      {/* Select Report Type Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setReportType('maintenance')}
          className={`p-3.5 rounded-xl border text-start transition ${
            reportType === 'maintenance'
              ? 'bg-amber-950/40 border-amber-500/50 text-white shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-5 h-5 mb-2 text-amber-400" />
          <span className="text-xs font-bold block text-slate-200">
            {isArabic ? 'سجل الصيانة والتكاليف' : 'Maintenance & Costs'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
            {workOrders.length} {isArabic ? 'أمر عمل' : 'orders'}
          </span>
        </button>

        <button
          onClick={() => setReportType('tasks')}
          className={`p-3.5 rounded-xl border text-start transition ${
            reportType === 'tasks'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-5 h-5 mb-2 text-emerald-400" />
          <span className="text-xs font-bold block text-slate-200">
            {isArabic ? 'إنجاز المهام الميدانية' : 'Field Tasks Execution'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
            {tasks.length} {isArabic ? 'مهمة' : 'tasks'}
          </span>
        </button>

        <button
          onClick={() => setReportType('equipment')}
          className={`p-3.5 rounded-xl border text-start transition ${
            reportType === 'equipment'
              ? 'bg-teal-950/40 border-teal-500/50 text-white shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-5 h-5 mb-2 text-teal-400" />
          <span className="text-xs font-bold block text-slate-200">
            {isArabic ? 'ساعات تشغيل الأصول' : 'Equipment Hours'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
            {equipment.length} {isArabic ? 'معدة' : 'assets'}
          </span>
        </button>

        <button
          onClick={() => setReportType('attendance')}
          className={`p-3.5 rounded-xl border text-start transition ${
            reportType === 'attendance'
              ? 'bg-blue-950/40 border-blue-500/50 text-white shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-2 text-blue-400" />
          <span className="text-xs font-bold block text-slate-200">
            {isArabic ? 'حضور وإجازات الكادر' : 'Staff & Leave Balances'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
            {employees.length} {isArabic ? 'موظف' : 'employees'}
          </span>
        </button>
      </div>

      {/* Report Data Table View */}
      <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-5 shadow-xl overflow-x-auto">
        <h3 className="text-sm font-bold text-white mb-3">
          {reportType === 'maintenance' && (isArabic ? 'تقرير أوامر الصيانة وقطع الغيار' : 'Work Order & Spare Parts Report')}
          {reportType === 'tasks' && (isArabic ? 'تقرير المهام الميدانية وساعات العمل' : 'Field Tasks Labor Report')}
          {reportType === 'equipment' && (isArabic ? 'تقرير جاهزية الأصول وساعات التشغيل' : 'Asset Readiness & Operating Hours')}
          {reportType === 'attendance' && (isArabic ? 'تقرير القوى العاملة ورصيد الإجازات' : 'Staff & Leave Quota Report')}
        </h3>

        {reportType === 'maintenance' && (
          <table className="w-full text-xs text-start border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3 text-start">WO #</th>
                <th className="py-2.5 px-3 text-start">{t('equipmentName')}</th>
                <th className="py-2.5 px-3 text-start">{t('problemDescription')}</th>
                <th className="py-2.5 px-3 text-start">{t('priority')}</th>
                <th className="py-2.5 px-3 text-start">{t('status')}</th>
                <th className="py-2.5 px-3 text-end">{isArabic ? 'تكلفة القطع (د.أ)' : 'Parts Cost (JOD)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {workOrders.map((wo) => {
                const eq = equipment.find((e) => e.id === wo.equipmentId);
                const cost = (wo.sparePartsUsed || []).reduce((acc, p) => acc + p.totalCostJOD, 0);
                return (
                  <tr key={wo.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{wo.workOrderNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{eq?.code}</td>
                    <td className="py-2.5 px-3 truncate max-w-[240px]">{wo.problemDescription}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold">{wo.priority}</td>
                    <td className="py-2.5 px-3 text-[11px]">{wo.status}</td>
                    <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-400">{cost} JOD</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {reportType === 'tasks' && (
          <table className="w-full text-xs text-start border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3 text-start">{isArabic ? 'رمز المهمة' : 'Code'}</th>
                <th className="py-2.5 px-3 text-start">{t('taskTitle')}</th>
                <th className="py-2.5 px-3 text-start">{t('status')}</th>
                <th className="py-2.5 px-3 text-start">{t('dueDate')}</th>
                <th className="py-2.5 px-3 text-start">{t('estimatedHours')}</th>
                <th className="py-2.5 px-3 text-start">{t('actualHours')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{t.taskCode}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{isArabic ? t.titleAr : t.titleEn}</td>
                  <td className="py-2.5 px-3">{t.status}</td>
                  <td className="py-2.5 px-3 font-mono">{t.dueDate}</td>
                  <td className="py-2.5 px-3 font-mono">{t.estimatedHours} h</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{t.actualHours || 0} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reportType === 'attendance' && (
          <table className="w-full text-xs text-start border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3 text-start">{t('employeeCode')}</th>
                <th className="py-2.5 px-3 text-start">{t('employeeName')}</th>
                <th className="py-2.5 px-3 text-start">{t('jobTitle')}</th>
                <th className="py-2.5 px-3 text-start">{t('status')}</th>
                <th className="py-2.5 px-3 text-end">{t('remainingAnnual')}</th>
                <th className="py-2.5 px-3 text-end">{t('remainingSick')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{emp.code}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{isArabic ? emp.nameAr : emp.nameEn}</td>
                  <td className="py-2.5 px-3">{emp.jobTitleAr}</td>
                  <td className="py-2.5 px-3">{emp.status}</td>
                  <td className="py-2.5 px-3 text-end font-mono text-emerald-400 font-bold">{emp.annualLeaveBalance} d</td>
                  <td className="py-2.5 px-3 text-end font-mono text-blue-400 font-bold">{emp.sickLeaveBalance} d</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reportType === 'equipment' && (
          <table className="w-full text-xs text-start border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3 text-start">{t('equipmentCode')}</th>
                <th className="py-2.5 px-3 text-start">{t('equipmentName')}</th>
                <th className="py-2.5 px-3 text-start">{t('status')}</th>
                <th className="py-2.5 px-3 text-start">{t('equipModel')}</th>
                <th className="py-2.5 px-3 text-start">{t('location')}</th>
                <th className="py-2.5 px-3 text-end">{t('operatingHours')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {equipment.map((eq) => (
                <tr key={eq.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono font-bold text-teal-400">{eq.code}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{isArabic ? eq.nameAr : eq.nameEn}</td>
                  <td className="py-2.5 px-3">{eq.status}</td>
                  <td className="py-2.5 px-3">{eq.model}</td>
                  <td className="py-2.5 px-3 text-slate-400">{eq.location}</td>
                  <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-400">
                    {eq.operatingHours.toLocaleString()} h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
