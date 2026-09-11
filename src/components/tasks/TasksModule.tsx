import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Trash2,
  Lock,
  UserPlus,
  ShieldCheck,
  Printer,
  Edit3,
  RotateCcw,
  Award,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { db } from '../../services/db';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { TimeInputHHHMM, hoursFloatToHHHMM, minutesToHHHMM } from '../common/TimeInputHHHMM';
import { printTask, printTaskReport } from '../../utils/printUtils';

export const TasksModule: React.FC = () => {
  const { isArabic, t } = useLanguage();
  const { currentUser, canCreateTasks, canDeleteTasks, isAdmin, isSuperAdmin } = useAuth();
  const allowDelete = Boolean(isAdmin || isSuperAdmin || canDeleteTasks);

  const [tasks, setTasks] = useState<Task[]>(() => db.getTasks());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Delete Task state
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [taskDeleteAlert, setTaskDeleteAlert] = useState<string | null>(null);

  // Task Completion dialog state (requires actual hours in HHH:MM and completion notes)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionActualMinutes, setCompletionActualMinutes] = useState<number>(60);
  const [completionActualFormatted, setCompletionActualFormatted] = useState<string>('001:00');
  const [completionNotesInput, setCompletionNotesInput] = useState('');

  // Admin Approve / Close task state
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [adminApprovalNotesInput, setAdminApprovalNotesInput] = useState('');

  // Admin Reopen task state
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenReasonInput, setReopenReasonInput] = useState('');

  // Admin Edit task state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitleAr, setEditTitleAr] = useState('');
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editDescAr, setEditDescAr] = useState('');
  const [editDescEn, setEditDescEn] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editEstHours, setEditEstHours] = useState<number>(2);
  const [editChecklistItems, setEditChecklistItems] = useState<string[]>([]);

  // Admin Reassign Technician state
  const [reassignUserId, setReassignUserId] = useState<string>('');
  const [reassignAlert, setReassignAlert] = useState<string | null>(null);

  const allUsers = db.getUsers();

  // New task form state
  const [newTitleAr, setNewTitleAr] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newDescAr, setNewDescAr] = useState('');
  const [newDescEn, setNewDescEn] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newAssignedTo, setNewAssignedTo] = useState<string>(() => {
    const users = db.getUsers();
    return users[0]?.id || 'usr-admin';
  });
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [newEstHours, setNewEstHours] = useState<number>(2);
  const [checklistItems, setChecklistItems] = useState<string[]>(['']);

  const refreshTasks = () => {
    setTasks(db.getTasks());
    if (selectedTask) {
      const fresh = db.getTaskById(selectedTask.id);
      if (fresh) setSelectedTask(fresh);
      else setSelectedTask(null);
    }
  };

  React.useEffect(() => {
    const handleUpdate = () => refreshTasks();
    window.addEventListener('jbc-data-updated', handleUpdate);
    window.addEventListener('jbc-task-deleted', handleUpdate);
    return () => {
      window.removeEventListener('jbc-data-updated', handleUpdate);
      window.removeEventListener('jbc-task-deleted', handleUpdate);
    };
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      task.taskCode.toLowerCase().includes(query) ||
      task.titleAr.toLowerCase().includes(query) ||
      task.titleEn.toLowerCase().includes(query) ||
      (task.assignedToName && task.assignedToName.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleAr.trim()) return;

    const assignedUser = allUsers.find((u) => u.id === newAssignedTo);

    const checklist = checklistItems
      .filter((text) => text.trim().length > 0)
      .map((text, idx) => ({
        id: `chk-${Date.now()}-${idx}`,
        textAr: text,
        textEn: text,
        completed: false,
      }));

    db.createTask(
      {
        titleAr: newTitleAr,
        titleEn: newTitleEn || newTitleAr,
        descriptionAr: newDescAr,
        descriptionEn: newDescEn || newDescAr,
        assignedToUserId: newAssignedTo,
        assignedToName: assignedUser ? assignedUser.nameAr : undefined,
        assignedByUserId: currentUser?.id || 'usr-admin',
        status: 'pending',
        priority: newPriority,
        dueDate: newDueDate,
        estimatedHours: newEstHours,
        checklist,
        attachments: [],
      },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'Admin'
    );

    setShowCreateModal(false);
    // Reset
    setNewTitleAr('');
    setNewTitleEn('');
    setNewDescAr('');
    setNewDescEn('');
    setChecklistItems(['']);
    refreshTasks();
  };

  // Strict assignee enforcement: only the assigned technician/user or admin can perform/close a task
  const isTaskAssignedToMe = Boolean(
    selectedTask &&
    currentUser &&
    ((selectedTask.assignedToUserId && selectedTask.assignedToUserId === currentUser.id) ||
      (selectedTask.assignedToName && currentUser.nameAr && selectedTask.assignedToName.includes(currentUser.nameAr)) ||
      (selectedTask.assignedToName && currentUser.nameEn && selectedTask.assignedToName.includes(currentUser.nameEn)))
  );
  const canOperateOnTask = isTaskAssignedToMe || Boolean(isAdmin);

  const handleToggleChecklist = (taskId: string, checkId: string) => {
    const task = db.getTaskById(taskId);
    if (!task) return;

    // Check ownership
    const isAssigned = Boolean(
      currentUser &&
      ((task.assignedToUserId && task.assignedToUserId === currentUser.id) ||
        (task.assignedToName && currentUser.nameAr && task.assignedToName.includes(currentUser.nameAr)) ||
        (task.assignedToName && currentUser.nameEn && task.assignedToName.includes(currentUser.nameEn)))
    );
    if (!isAssigned && !isAdmin) {
      alert(isArabic ? 'عذراً، هذه المهمة موكولة لزميل آخر.' : 'This task is assigned to another user.');
      return;
    }

    const updatedChecklist = task.checklist.map((item) =>
      item.id === checkId ? { ...item, completed: !item.completed } : item
    );

    db.updateTask(
      taskId,
      { checklist: updatedChecklist },
      currentUser?.id || 'usr-1',
      currentUser?.nameAr || 'User'
    );
    refreshTasks();
  };

  const handleStartTask = (taskId: string) => {
    const task = db.getTaskById(taskId);
    if (!task) return;

    const isAssigned = Boolean(
      currentUser &&
      ((task.assignedToUserId && task.assignedToUserId === currentUser.id) ||
        (task.assignedToName && currentUser.nameAr && task.assignedToName.includes(currentUser.nameAr)) ||
        (task.assignedToName && currentUser.nameEn && task.assignedToName.includes(currentUser.nameEn)))
    );
    if (!isAssigned && !isAdmin) {
      alert(isArabic ? 'عذراً، لا يمكنك بدء مهمة موكولة لزميل آخر.' : 'Cannot start a task assigned to another user.');
      return;
    }

    db.updateTask(
      taskId,
      { status: 'in_progress' },
      currentUser?.id || 'usr-1',
      currentUser?.nameAr || 'User'
    );
    refreshTasks();
  };

  const handleConfirmCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!canOperateOnTask) {
      alert(isArabic ? 'عذراً، لا يمكنك إغلاق مهمة موكولة لزميل آخر. كل شخص موكول إليه مهمة يغلقها بنفسه.' : 'Only the assigned user can close this task.');
      return;
    }
    if (!completionNotesInput.trim()) return;

    const totalHoursFloat = Math.round((completionActualMinutes / 60) * 100) / 100;

    db.updateTask(
      selectedTask.id,
      {
        status: 'completed',
        actualHours: totalHoursFloat,
        actualHoursFormatted: completionActualFormatted,
        actualMinutes: completionActualMinutes,
        completionNotes: completionNotesInput.trim(),
      },
      currentUser?.id || 'usr-1',
      currentUser?.nameAr || 'User'
    );

    setShowCompleteDialog(false);
    setCompletionNotesInput('');
    refreshTasks();
  };

  const handleReassignTechnician = () => {
    if (!isAdmin || !selectedTask) return;
    if (!reassignUserId) {
      alert(isArabic ? 'الرجاء اختيار الفني أولاً.' : 'Please select a technician.');
      return;
    }
    const targetUser = allUsers.find((u) => u.id === reassignUserId);
    if (!targetUser) return;

    const updated = db.updateTaskTechnician(
      selectedTask.id,
      targetUser.id,
      targetUser.nameAr,
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'Admin'
    );

    if (updated) {
      setSelectedTask(updated);
      refreshTasks();
      setReassignAlert(
        isArabic
          ? `تم بنجاح تغيير الفني المكلف إلى (${targetUser.nameAr}) وتوثيقه في سجل التدقيق (Audit Log).`
          : `Technician successfully updated to (${targetUser.nameAr}) and recorded in Audit Log.`
      );
      setTimeout(() => setReassignAlert(null), 5000);
    }
  };

  const handleDeleteTask = (taskOrId: Task | string) => {
    if (!allowDelete) return;
    if (typeof taskOrId === 'string') {
      const found = tasks.find((t) => t.id === taskOrId) || (selectedTask?.id === taskOrId ? selectedTask : null);
      if (found) setTaskToDelete(found);
    } else {
      setTaskToDelete(taskOrId);
    }
  };

  const handleConfirmDeleteTask = () => {
    if (!taskToDelete || !allowDelete) return;
    setIsDeletingTask(true);
    try {
      const code = taskToDelete.taskCode;
      const title = isArabic ? taskToDelete.titleAr : taskToDelete.titleEn;
      const success = db.deleteTask(
        taskToDelete.id,
        currentUser?.id || 'usr-admin',
        currentUser?.nameAr || 'مدير النظام'
      );
      if (success) {
        if (selectedTask?.id === taskToDelete.id) {
          setSelectedTask(null);
        }
        setTaskToDelete(null);
        refreshTasks();
        setTaskDeleteAlert(
          isArabic
            ? `تم بنجاح شطب وحذف المهمة اليومية (${code}: ${title}) نهائياً من قاعدة بيانات المحطة.`
            : `Daily task (${code}: ${title}) has been permanently deleted from database.`
        );
        setTimeout(() => setTaskDeleteAlert(null), 5000);
      }
    } catch (err: any) {
      console.error(err);
      setTaskDeleteAlert(err?.message || (isArabic ? 'حدث خطأ أثناء محاولة حذف المهمة' : 'Error deleting task'));
      setTimeout(() => setTaskDeleteAlert(null), 5000);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleOpenEditModal = (task: Task) => {
    setEditTitleAr(task.titleAr || '');
    setEditTitleEn(task.titleEn || '');
    setEditDescAr(task.descriptionAr || '');
    setEditDescEn(task.descriptionEn || '');
    setEditPriority(task.priority || 'medium');
    setEditAssignedTo(task.assignedToUserId || '');
    setEditDueDate(task.dueDate || '');
    setEditEstHours(task.estimatedHours || 2);
    setEditChecklistItems(
      task.checklist && task.checklist.length > 0
        ? task.checklist.map((c) => c.textAr)
        : ['']
    );
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !isAdmin) return;
    if (!editTitleAr.trim()) return;

    const assignedUser = allUsers.find((u) => u.id === editAssignedTo);
    const updatedChecklist = editChecklistItems
      .filter((t) => t.trim().length > 0)
      .map((text, idx) => {
        const existing = selectedTask.checklist?.[idx];
        return {
          id: existing?.id || `chk-${Date.now()}-${idx}`,
          textAr: text,
          textEn: text,
          completed: existing ? existing.completed : false,
        };
      });

    const updated = db.updateTask(
      selectedTask.id,
      {
        titleAr: editTitleAr.trim(),
        titleEn: editTitleEn.trim() || editTitleAr.trim(),
        descriptionAr: editDescAr.trim(),
        descriptionEn: editDescEn.trim() || editDescAr.trim(),
        priority: editPriority,
        dueDate: editDueDate,
        estimatedHours: editEstHours,
        assignedToUserId: editAssignedTo,
        assignedToName: assignedUser ? assignedUser.nameAr : selectedTask.assignedToName,
        checklist: updatedChecklist,
      },
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'Admin'
    );

    if (updated) {
      setSelectedTask(updated);
    }
    setShowEditModal(false);
    refreshTasks();
  };

  const handleApproveClose = () => {
    if (!selectedTask || !isAdmin) return;
    const closed = db.closeTask(
      selectedTask.id,
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'Admin',
      adminApprovalNotesInput.trim() || undefined
    );
    if (closed) {
      setSelectedTask(closed);
    }
    setShowApproveDialog(false);
    setAdminApprovalNotesInput('');
    refreshTasks();
  };

  const handleReopenTask = () => {
    if (!selectedTask || !isAdmin) return;
    if (!reopenReasonInput.trim()) {
      alert(isArabic ? 'يرجى إدخال سبب إعادة فتح المهمة والتوجيهات للفني.' : 'Please enter a reason for reopening.');
      return;
    }
    const reopened = db.reopenTask(
      selectedTask.id,
      currentUser?.id || 'usr-admin',
      currentUser?.nameAr || 'Admin',
      reopenReasonInput.trim()
    );
    if (reopened) {
      setSelectedTask(reopened);
    }
    setShowReopenDialog(false);
    setReopenReasonInput('');
    refreshTasks();
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-950 text-rose-300 border-rose-600/40';
      case 'high':
        return 'bg-amber-950 text-amber-300 border-amber-600/40';
      case 'medium':
        return 'bg-blue-950 text-blue-300 border-blue-600/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'closed':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500/60 font-bold';
      case 'completed':
        return 'bg-sky-950 text-sky-300 border-sky-600/40 font-bold';
      case 'in_progress':
        return 'bg-amber-950 text-amber-300 border-amber-600/40';
      case 'cancelled':
        return 'bg-rose-950 text-rose-300 border-rose-600/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return isArabic ? 'قيد الانتظار' : 'Pending';
      case 'in_progress':
        return isArabic ? 'قيد التنفيذ' : 'In Progress';
      case 'completed':
        return isArabic ? 'مكتملة (بانتظار الاعتماد)' : 'Completed (Pending Approval)';
      case 'closed':
        return isArabic ? 'معتمدة ومغلقة ✅' : 'Closed & Approved';
      case 'cancelled':
        return isArabic ? 'ملغاة' : 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* Module Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/30">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">{t('navTasks')}</h2>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'إدارة وجدولة وتوثيق مهام التشغيل والصيانة اليومية'
                : 'Schedule and track daily plant operations tasks'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => printTaskReport(filteredTasks)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-sm transition"
            title={isArabic ? 'طباعة كشف المهام الحالي' : 'Print Tasks Report'}
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>{isArabic ? 'طباعة كشف المهام' : 'Print Tasks Report'}</span>
          </button>

          {canCreateTasks && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isArabic ? 'إنشاء مهمة جديدة' : 'New Task'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Delete / Operation Alert Banner */}
      {taskDeleteAlert && (
        <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold">{taskDeleteAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setTaskDeleteAlert(null)}
            className="p-1 rounded-lg hover:bg-rose-900/60 text-rose-400 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
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
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['all', 'pending', 'in_progress', 'completed', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'all'
                ? t('all')
                : st === 'pending'
                ? t('taskPending')
                : st === 'in_progress'
                ? t('taskInProgress')
                : st === 'completed'
                ? (isArabic ? 'بانتظار الاعتماد' : 'Pending Approval')
                : (isArabic ? 'معتمدة ومغلقة' : 'Closed & Approved')}
            </button>
          ))}
        </div>
      </div>

      {/* Task List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">{isArabic ? 'لا توجد مهام مطابقة' : 'No tasks found'}</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const completedChecklist = task.checklist.filter((c) => c.completed).length;
            const totalChecklist = task.checklist.length;

            return (
              <div
                key={task.id}
                onClick={() => {
                  setSelectedTask(task);
                  setReassignUserId(task.assignedToUserId || '');
                }}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer flex flex-col justify-between space-y-3 group shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {task.taskCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(
                          task.status
                        )}`}
                      >
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition line-clamp-2">
                    {isArabic ? task.titleAr : task.titleEn}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {isArabic ? task.descriptionAr : task.descriptionEn}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  {/* Progress bar for checklist if any */}
                  {totalChecklist > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{t('checklist')}</span>
                        <span className="font-mono">
                          {completedChecklist}/{totalChecklist}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{
                            width: `${(completedChecklist / totalChecklist) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                      {Boolean(
                        currentUser &&
                        ((task.assignedToUserId && task.assignedToUserId === currentUser.id) ||
                         (task.assignedToName && currentUser.nameAr && task.assignedToName.includes(currentUser.nameAr.slice(0, 8))))
                      ) ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                          <UserCheck className="w-2.5 h-2.5" />
                          <span>{isArabic ? 'مكلف بي' : 'My task'}</span>
                        </span>
                      ) : !isAdmin ? (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                          <Lock className="w-2.5 h-2.5 shrink-0 text-amber-500/70" />
                          <span className="truncate">{task.assignedToName || 'Unassigned'}</span>
                        </span>
                      ) : (
                        <span className="truncate text-[11px]">{task.assignedToName || 'Unassigned'}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {task.status === 'completed' && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30" title={isArabic ? 'الساعات الفعلية المستغرقة' : 'Actual Time'}>
                          {task.actualHoursFormatted || hoursFloatToHHHMM(task.actualHours || 0)}
                        </span>
                      )}
                      <span className="font-mono text-[11px]">{task.dueDate}</span>

                      {allowDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task);
                          }}
                          className="ms-1 p-1 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/35 text-[11px] font-bold transition flex items-center gap-1 active:scale-95 shadow-xs shrink-0"
                          title={isArabic ? 'شطب وحذف هذه المهمة نهائياً (صلاحية الأدمن)' : 'Delete Task (Admin)'}
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

      {/* Task Details Drawer / Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 animate-fade-in">
          <div className="w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl overflow-y-auto space-y-4 text-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {selectedTask.taskCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(
                      selectedTask.priority
                    )}`}
                  >
                    {selectedTask.priority}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(
                      selectedTask.status
                    )}`}
                  >
                    {getStatusLabel(selectedTask.status)}
                  </span>
                </div>
                <h3 className="text-base font-black text-white">
                  {isArabic ? selectedTask.titleAr : selectedTask.titleEn}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => printTask(selectedTask)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 transition"
                  title={isArabic ? 'طباعة بطاقة المهمة' : 'Print Task Card'}
                >
                  <Printer className="w-4 h-4" />
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(selectedTask)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700 transition"
                    title={isArabic ? 'تعديل تفاصيل المهمة' : 'Edit Task'}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {allowDelete && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(selectedTask)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition"
                    title={isArabic ? 'شطب وحذف المهمة نهائياً (صلاحية الأدمن)' : 'Delete Task (Admin)'}
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lock Banner when task is assigned to another user */}
            {!canOperateOnTask && (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold">
                    {isArabic ? 'مهمة مسندة إلى موظف آخر (عرض للقراءة فقط)' : 'Assigned to another team member (Read-Only)'}
                  </div>
                  <div className="text-[11px] text-amber-300/80 mt-0.5">
                    {isArabic
                      ? `هذه المهمة موكولة إلى الزميل: (${selectedTask.assignedToName || 'موظف آخر'}). وفق ضوابط العمل، يجب على كل شخص موكول إليه مهمة أن يقوم بتنفيذها وإغلاقها بنفسه ولا يحق لغيره إغلاقها.`
                      : `Assigned to (${selectedTask.assignedToName || 'another user'}). Strict policy dictates that only the assignee can execute and close their assigned tasks.`}
                  </div>
                </div>
              </div>
            )}

            {/* Closed Status Banner */}
            {selectedTask.status === 'closed' && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>{isArabic ? 'مهمة معتمدة ومغلقة رسمياً من قبل الإدارة ✅' : 'Officially Approved & Closed by Management'}</span>
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-500/40">
                    {selectedTask.actualHoursFormatted || hoursFloatToHHHMM(selectedTask.actualHours || 0)} (HHH:MM)
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-emerald-900/40">
                  <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                    <span>{isArabic ? `معتمد ومغلق بواسطة: ${selectedTask.closedByName || 'المدير'}` : `Approved by: ${selectedTask.closedByName || 'Admin'}`}</span>
                    {selectedTask.closedAt && (
                      <span className="font-mono text-slate-400 text-[10px]">
                        {new Date(selectedTask.closedAt).toLocaleDateString(isArabic ? 'ar-JO' : 'en-US')}
                      </span>
                    )}
                  </div>
                  {selectedTask.adminApprovalNotes && (
                    <div className="text-xs text-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">{isArabic ? 'ملاحظات وتوجيهات الإدارة:' : 'Admin Notes:'}</span>
                      {selectedTask.adminApprovalNotes}
                    </div>
                  )}
                  {selectedTask.completionNotes && (
                    <div className="text-xs text-slate-300 pt-1 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-bold">{t('completionNotes')}:</span>
                      {selectedTask.completionNotes}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowReopenDialog(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'إعادة فتح المهمة' : 'Reopen Task'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Completed (Pending Approval) Status Banner */}
            {selectedTask.status === 'completed' && (
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>{isArabic ? 'تم إنجاز المهمة وبانتظار اعتماد وإغلاق الإدارة' : 'Completed - Pending Admin Closure'}</span>
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-900/60 text-sky-200 border border-sky-500/40">
                    {isArabic ? 'الساعات الفعلية: ' : 'Actual Time: '}
                    {selectedTask.actualHoursFormatted || hoursFloatToHHHMM(selectedTask.actualHours || 0)} (HHH:MM)
                  </span>
                </div>
                <div className="text-xs text-slate-200 bg-slate-950/70 p-2.5 rounded-xl border border-sky-900/40">
                  <span className="text-[10px] text-sky-400 font-bold block mb-0.5">{t('completionNotes')}:</span>
                  {selectedTask.completionNotes || '—'}
                </div>
                {isAdmin && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowApproveDialog(true)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
                    >
                      <Award className="w-4 h-4" />
                      <span>{isArabic ? 'اعتماد وإغلاق المهمة رسمياً' : 'Approve & Close Task'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReopenDialog(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-950 text-amber-300 border border-slate-700 hover:border-amber-600/40 font-bold text-xs transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'طلب إعادة العمل / فتح المهمة' : 'Reopen Task'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('taskDescription')}
              </span>
              <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {isArabic ? selectedTask.descriptionAr : selectedTask.descriptionEn}
              </p>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t('assignedTo')}</span>
                <span className="font-bold text-white truncate block">
                  {selectedTask.assignedToName || '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t('dueDate')}</span>
                <span className="font-mono font-bold text-white">{selectedTask.dueDate}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block">{t('estimatedHours')}</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedTask.estimatedHours} {t('hours')}
                </span>
              </div>
            </div>

            {/* Admin Only: Reassign Technician (Available in ANY status) */}
            {isAdmin && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{isArabic ? 'صلاحية الإدارة: تغيير الفني المكلف بالمهمة' : 'Admin: Change Assigned Technician'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isArabic ? 'متاح لجميع الحالات وموثق بسجل العمليات' : 'Available in all statuses & logged'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={reassignUserId}
                    onChange={(e) => setReassignUserId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">{isArabic ? '-- اختر الفني الجديد --' : '-- Select Technician --'}</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nameAr} ({u.jobTitleAr || u.role})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleReassignTechnician}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'تأكيد الإسناد' : 'Reassign'}</span>
                  </button>
                </div>

                {reassignAlert && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{reassignAlert}</span>
                  </div>
                )}
              </div>
            )}

            {/* Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>{t('checklist')}</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedTask.checklist.filter((c) => c.completed).length} /{' '}
                  {selectedTask.checklist.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {selectedTask.checklist.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">
                    {isArabic ? 'لا توجد خطوات تدقيقية إضافية' : 'No checklist items'}
                  </p>
                ) : (
                  selectedTask.checklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => canOperateOnTask && handleToggleChecklist(selectedTask.id, item.id)}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition ${
                        canOperateOnTask ? 'cursor-pointer hover:border-slate-700' : 'cursor-not-allowed opacity-75'
                      } ${
                        item.completed
                          ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200 line-through'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 pointer-events-none"
                      />
                      <span className="text-xs">{isArabic ? item.textAr : item.textEn}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <div>
                {allowDelete && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(selectedTask)}
                    className="p-2 px-3.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
                    title={isArabic ? 'شطب وحذف المهمة نهائياً (صلاحية الأدمن)' : 'Delete Task'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isArabic ? 'شطب المهمة نهائياً' : 'Delete Task'}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canOperateOnTask && selectedTask.status === 'pending' && (
                  <button
                    onClick={() => handleStartTask(selectedTask.id)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition"
                  >
                    {isArabic ? 'بدء العمل على المهمة' : 'Start Task'}
                  </button>
                )}

                {canOperateOnTask && selectedTask.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      const estMin = Math.round((selectedTask.estimatedHours || 1) * 60);
                      setCompletionActualMinutes(estMin);
                      setCompletionActualFormatted(minutesToHHHMM(estMin));
                      setShowCompleteDialog(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                  >
                    {isArabic ? 'إتمام المهمة وتوثيق الساعات' : 'Complete Task'}
                  </button>
                )}

                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Dialog (requires actual hours in HHH:MM and completion notes) */}
      {showCompleteDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{isArabic ? 'توثيق إنجاز المهمة' : 'Complete Task'}</span>
            </h3>

            <form onSubmit={handleConfirmCompletion} className="space-y-3">
              <div>
                <TimeInputHHHMM
                  id="task-complete-actual-hours"
                  label={isArabic ? 'الساعات الفعلية المستغرقة' : 'Actual Time Spent'}
                  totalMinutes={completionActualMinutes}
                  initialFormatted={completionActualFormatted}
                  isArabic={isArabic}
                  required
                  onChange={(totMin, formatted) => {
                    setCompletionActualMinutes(totMin);
                    setCompletionActualFormatted(formatted);
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('completionNotes')} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={completionNotesInput}
                  onChange={(e) => setCompletionNotesInput(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'وثق الإجراء المتخذ، القياسات المأخوذة، وحالة المنظومة...'
                      : 'Enter operational notes, measured values...'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteDialog(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
                >
                  {isArabic ? 'تأكيد وإتمام المهمة' : 'Confirm & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Approve & Close Task Dialog */}
      {showApproveDialog && selectedTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>{isArabic ? 'اعتماد وإغلاق المهمة رسمياً' : 'Approve & Close Task'}</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isArabic
                ? `سيتم اعتماد إنجاز المهمة [${selectedTask.taskCode}] وإغلاقها رسمياً ونقلها إلى سجل المهام المكتملة والمغلقة.`
                : `Task [${selectedTask.taskCode}] will be approved, officially closed, and moved to history.`}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'ملاحظات وتوجيهات الإدارة (اختياري)' : 'Admin Approval Notes (Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={adminApprovalNotesInput}
                  onChange={(e) => setAdminApprovalNotesInput(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'أدخل أي توصيات أو ملاحظات اعتماد ختامية للفني...'
                      : 'Enter closing approval remarks or recommendations...'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApproveDialog(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleApproveClose}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  {isArabic ? 'تأكيد الاعتماد والإغلاق' : 'Confirm & Close Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reopen Task Dialog */}
      {showReopenDialog && selectedTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              <span>{isArabic ? 'إعادة فتح المهمة للمراجعة والتدقيق' : 'Reopen Task for Re-work'}</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isArabic
                ? `سيتم إعادة المهمة [${selectedTask.taskCode}] إلى حالة (قيد التنفيذ) وإرسال إشعار فوري للفني المكلف لاستكمال العمل وفق التوجيهات.`
                : `Task [${selectedTask.taskCode}] will be reopened to In Progress and the technician notified.`}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'سبب إعادة الفتح والتوجيهات للفني *' : 'Reason for Reopening & Instructions *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReasonInput}
                  onChange={(e) => setReopenReasonInput(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'يرجى توضيح النواقص أو التعديلات المطلوبة من الفني بالتفصيل...'
                      : 'Specify required adjustments or uncompleted items...'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReopenDialog(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleReopenTask}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md"
                >
                  {isArabic ? 'تأكيد إعادة الفتح' : 'Confirm Reopen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>{isArabic ? `تعديل تفاصيل المهمة [${selectedTask.taskCode}]` : `Edit Task [${selectedTask.taskCode}]`}</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'عنوان المهمة (بالعربية) *' : 'Task Title (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  value={editTitleAr}
                  onChange={(e) => setEditTitleAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'وصف المهمة (بالعربية)' : 'Task Description (Arabic)'}
                </label>
                <textarea
                  rows={2}
                  value={editDescAr}
                  onChange={(e) => setEditDescAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('priority')}
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="low">{isArabic ? 'منخفضة' : 'Low'}</option>
                    <option value="medium">{isArabic ? 'متوسطة' : 'Medium'}</option>
                    <option value="high">{isArabic ? 'مرتفعة' : 'High'}</option>
                    <option value="urgent">{isArabic ? 'عاجلة جداً' : 'Urgent'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('assignedTo')}
                  </label>
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nameAr} ({u.jobTitleAr || u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('dueDate')}
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('estimatedHours')}
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={editEstHours}
                    onChange={(e) => setEditEstHours(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Checklist editor */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  {t('checklist')}
                </label>
                {editChecklistItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const copy = [...editChecklistItems];
                        copy[index] = e.target.value;
                        setEditChecklistItems(copy);
                      }}
                      placeholder={`الخطوة رقم ${index + 1}`}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    {editChecklistItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditChecklistItems(editChecklistItems.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setEditChecklistItems([...editChecklistItems, ''])}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'إضافة بند تدقيقي' : 'Add checklist step'}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  {isArabic ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">
                {isArabic ? 'إنشاء مهمة ميدانية جديدة' : 'Create New Field Task'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'عنوان المهمة (بالعربية) *' : 'Task Title (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  value={newTitleAr}
                  onChange={(e) => setNewTitleAr(e.target.value)}
                  placeholder="مثال: قياس نسب الغاز في خلايا الطمر"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isArabic ? 'عنوان المهمة (بالإنجليزية)' : 'Task Title (English)'}
                </label>
                <input
                  type="text"
                  value={newTitleEn}
                  onChange={(e) => setNewTitleEn(e.target.value)}
                  placeholder="e.g. Gas sampling on wellheads"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('taskDescription')}
                </label>
                <textarea
                  rows={2}
                  value={newDescAr}
                  onChange={(e) => setNewDescAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('assignedTo')}
                  </label>
                  <select
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {isArabic ? u.nameAr : u.nameEn} ({u.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('priority')}
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="low">{t('priorityLow')}</option>
                    <option value="medium">{t('priorityMedium')}</option>
                    <option value="high">{t('priorityHigh')}</option>
                    <option value="urgent">{t('priorityUrgent')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('dueDate')}
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {t('estimatedHours')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={newEstHours}
                    onChange={(e) => setNewEstHours(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Checklist items builder */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  {t('checklist')}
                </label>
                {checklistItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const copy = [...checklistItems];
                        copy[index] = e.target.value;
                        setChecklistItems(copy);
                      }}
                      placeholder={`الخطوة رقم ${index + 1}`}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    {checklistItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setChecklistItems(checklistItems.filter((_, i) => i !== index));
                        }}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setChecklistItems([...checklistItems, ''])}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'إضافة بند تدقيقي' : 'Add checklist step'}</span>
                </button>
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
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal (Strictly Admin / Super Admin) */}
      {taskToDelete && allowDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-2xl bg-rose-950 border border-rose-500/40">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isArabic ? 'تأكيد شطب وحذف المهمة اليومية' : 'Confirm Task Deletion'}
                </h3>
                <span className="text-xs font-mono font-bold text-rose-300">
                  {taskToDelete.taskCode} • {isArabic ? taskToDelete.titleAr : taskToDelete.titleEn}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-xs text-rose-200 leading-relaxed space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  {isArabic
                    ? 'صلاحية الأدمن الحصرية: سيتم شطب هذه المهمة نهائياً من قاعدة البيانات'
                    : 'Exclusive Admin Permission: Task will be permanently deleted'}
                </span>
              </p>
              <p className="text-[11px] text-slate-300">
                {isArabic
                  ? 'لن تظهر هذه المهمة بعد الآن لأي فني أو موظف أو مسؤول، وسيتم توثيق العملية في سجل التدقيق (Audit Log) وإرسال إشعار فوري لمديري النظام.'
                  : 'This task will be completely purged from all lists. Action will be logged in the Audit Trail.'}
              </p>
              <div className="pt-1.5 text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1 border-t border-rose-500/20">
                <span>{isArabic ? 'المكلف بها:' : 'Assigned to:'} <strong className="text-slate-200">{taskToDelete.assignedToName || '—'}</strong></span>
                <span>{isArabic ? 'تاريخ الاستحقاق:' : 'Due date:'} <strong className="text-slate-200">{taskToDelete.dueDate}</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingTask}
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                {isArabic ? 'إلغاء والتراجع' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingTask}
                onClick={handleConfirmDeleteTask}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isDeletingTask ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>
                  {isDeletingTask
                    ? isArabic
                      ? 'جاري الحذف...'
                      : 'Deleting...'
                    : isArabic
                    ? 'تأكيد الحذف نهائياً'
                    : 'Confirm Permanent Delete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
