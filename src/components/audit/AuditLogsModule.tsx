import React, { useState } from 'react';
import {
  History,
  Shield,
  Search,
  Filter,
  User,
  Clock,
  Database,
  ArrowRight,
} from 'lucide-react';
import { db } from '../../services/db';
import { AuditLog } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

export const AuditLogsModule: React.FC = () => {
  const { isArabic, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const auditLogs = db.getAuditLogs();

  const filteredLogs = auditLogs.filter((log) => {
    if (entityFilter !== 'all' && log.entity !== entityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.userName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-14 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-500/30">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{t('navAudit')}</h2>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'سجل التتبع والتدقيق الأمني لجميع العمليات والتعديلات في النظام'
                : 'Security audit trail logging all actions, role changes and state transitions'}
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-purple-400 bg-purple-950/60 border border-purple-500/30 px-3 py-1.5 rounded-xl self-start sm:self-center">
          {auditLogs.length} {isArabic ? 'سجل غير قابل للتعديل' : 'immutable log entries'}
        </span>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isArabic ? 'بحث في السجلات باسم المستخدم أو الإجراء...' : 'Search logs by user or action...'}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl ps-9 pe-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="all">{isArabic ? 'جميع الكيانات والأنظمة' : 'All System Entities'}</option>
          <option value="work_orders">{isArabic ? 'أوامر الصيانة (Work Orders)' : 'Work Orders'}</option>
          <option value="tasks">{isArabic ? 'المهام (Tasks)' : 'Tasks'}</option>
          <option value="leave_requests">{isArabic ? 'طلبات الإجازات' : 'Leave Requests'}</option>
          <option value="permission_requests">{isArabic ? 'أذونات المغادرة' : 'Permission Requests'}</option>
          <option value="users">{isArabic ? 'المستخدمين والجلسات' : 'Users & Sessions'}</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 shadow-xl overflow-x-auto">
        <table className="w-full text-xs text-start border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
              <th className="py-2.5 px-3 text-start">{t('timestamp')}</th>
              <th className="py-2.5 px-3 text-start">{t('user')}</th>
              <th className="py-2.5 px-3 text-start">{t('action')}</th>
              <th className="py-2.5 px-3 text-start">{t('entity')}</th>
              <th className="py-2.5 px-3 text-start">{t('details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString(isArabic ? 'ar-JO' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    day: 'numeric',
                    month: 'short',
                  })}
                </td>
                <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                  {log.userName}
                </td>
                <td className="py-2.5 px-3 font-semibold text-emerald-400">
                  {log.action}
                </td>
                <td className="py-2.5 px-3 font-mono text-purple-300 text-[11px]">
                  {log.entity}
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                  {log.newValue ? (
                    <span className="font-mono text-slate-300">{log.newValue}</span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
