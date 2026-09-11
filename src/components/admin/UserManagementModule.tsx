import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Key,
  Edit2,
  Trash2,
  Share2,
  ShieldCheck,
  Wrench,
  UserCheck,
  Check,
  AlertTriangle,
  X,
  Lock,
  Phone,
  Mail,
  Building,
  Briefcase,
  Eye,
  EyeOff,
  Copy,
  Download,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../services/authContext';
import { db } from '../../services/db';
import { User, UserRole } from '../../types';
import { WhatsAppInviteModal } from '../common/WhatsAppInviteModal';

export const UserManagementModule: React.FC = () => {
  const { isArabic } = useLanguage();
  const { currentUser, isSuperAdmin, isAdmin } = useAuth();
  const allowUserManagement = Boolean(isAdmin || isSuperAdmin);

  const [usersList, setUsersList] = useState<User[]>(() => db.getUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [whatsAppUser, setWhatsAppUser] = useState<User | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form states for Add / Edit
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    password: '',
    nameAr: '',
    nameEn: '',
    role: 'employee',
    department: 'Operations',
    jobTitleAr: '',
    jobTitleEn: '',
    phone: '+962 7 9',
    email: '',
  });

  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshUsers = () => {
    setUsersList(db.getUsers());
  };

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setNotificationMsg({ type, text });
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Filtered users
  const filteredUsers = usersList.filter((user) => {
    const matchesSearch =
      user.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.jobTitleAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm));

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesDept = departmentFilter === 'all' || user.department === departmentFilter;

    return matchesSearch && matchesRole && matchesDept;
  });

  // Unique departments for filter
  const departments = Array.from(new Set(usersList.map((u) => u.department)));

  // Role stats
  const superAdminCount = usersList.filter((u) => u.role === 'super_admin').length;
  const adminCount = usersList.filter((u) => u.role === 'admin' || u.role === 'maintenance_manager').length;
  const techCount = usersList.filter((u) => u.role === 'technician').length;
  const empCount = usersList.filter((u) => u.role === 'employee').length;

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    if (!allowUserManagement) {
      showFeedback(isArabic ? 'صلاحية إضافة مستخدمين محصورة بمدير النظام (الأدمن) فقط' : 'Admin only', 'error');
      return;
    }
    setModalError(null);
    const nextEmpCode = `JBC-E${String(usersList.length + 1).padStart(3, '0')}`;
    setFormData({
      username: '',
      password: 'user123',
      nameAr: '',
      nameEn: '',
      role: 'technician',
      department: 'الصيانة الميكانيكية',
      jobTitleAr: 'فني صيانة وتشغيل',
      jobTitleEn: 'Maintenance Technician',
      phone: '+962 7 9',
      email: '',
      employeeId: nextEmpCode,
    });
    setIsAddModalOpen(true);
  };

  // Submit Add
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!allowUserManagement) {
      setModalError(isArabic ? 'صلاحية إضافة مستخدمين محصورة بمدير النظام (الأدمن) فقط' : 'Admin only');
      return;
    }

    const rawUsername = formData.username?.trim();
    if (!rawUsername) {
      setModalError(isArabic ? 'يرجى إدخال اسم المستخدم' : 'Please enter a username');
      return;
    }
    if (rawUsername.length < 3) {
      setModalError(isArabic ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Username must be at least 3 characters');
      return;
    }
    if (!formData.nameAr?.trim()) {
      setModalError(isArabic ? 'يرجى إدخال الاسم الكامل للمستخدم باللغة العربية' : 'Please enter full name in Arabic');
      return;
    }
    if (formData.password && formData.password.trim().length < 4) {
      setModalError(isArabic ? 'كلمة المرور يجب أن تكون 4 خانات على الأقل' : 'Password must be at least 4 characters');
      return;
    }

    try {
      db.createUser(
        {
          username: rawUsername,
          password: formData.password?.trim() || 'user123',
          nameAr: formData.nameAr.trim(),
          nameEn: formData.nameEn?.trim() || formData.nameAr.trim(),
          role: (formData.role as UserRole) || 'employee',
          department: formData.department?.trim() || 'Operations',
          jobTitleAr: formData.jobTitleAr?.trim() || 'موظف محطة',
          jobTitleEn: formData.jobTitleEn?.trim() || 'Plant Staff',
          phone: formData.phone?.trim() || '+962 7 9000 0000',
          email: formData.email?.trim() || `${rawUsername.toLowerCase()}@jordanbiogas.com`,
          employeeId: formData.employeeId,
        },
        currentUser?.id || 'usr-admin',
        currentUser?.nameAr || 'المشرف'
      );

      refreshUsers();
      setIsAddModalOpen(false);
      showFeedback(
        isArabic
          ? `تمت إضافة المستخدم (@${rawUsername}) بنجاح وحفظه في قاعدة البيانات!`
          : `User (@${rawUsername}) added successfully!`
      );
    } catch (err: any) {
      const errMsg = err?.message || (isArabic ? 'فشل إضافة المستخدم' : 'Failed to create user');
      setModalError(errMsg);
      showFeedback(errMsg, 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: User) => {
    if (!allowUserManagement) {
      showFeedback(isArabic ? 'صلاحية تعديل المستخدمين محصورة بمدير النظام (الأدمن) فقط' : 'Admin only', 'error');
      return;
    }
    setModalError(null);
    setEditingUser(user);
    setFormData({ ...user });
  };

  // Submit Edit
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!allowUserManagement) {
      setModalError(isArabic ? 'صلاحية تعديل المستخدمين محصورة بمدير النظام (الأدمن) فقط' : 'Admin only');
      return;
    }

    if (!editingUser) return;
    const rawUsername = formData.username?.trim();
    if (!rawUsername) {
      setModalError(isArabic ? 'يرجى إدخال اسم المستخدم' : 'Please enter a username');
      return;
    }
    if (rawUsername.length < 3) {
      setModalError(isArabic ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Username must be at least 3 characters');
      return;
    }
    if (!formData.nameAr?.trim()) {
      setModalError(isArabic ? 'يرجى إدخال الاسم الكامل باللغة العربية' : 'Please enter Arabic full name');
      return;
    }

    try {
      db.updateUser(
        {
          ...editingUser,
          ...formData,
          username: rawUsername,
          nameAr: formData.nameAr.trim(),
          nameEn: formData.nameEn?.trim() || formData.nameAr.trim(),
          department: formData.department?.trim() || editingUser.department,
          jobTitleAr: formData.jobTitleAr?.trim() || editingUser.jobTitleAr,
          jobTitleEn: formData.jobTitleEn?.trim() || editingUser.jobTitleEn,
          phone: formData.phone?.trim() || editingUser.phone,
          email: formData.email?.trim() || editingUser.email,
        } as User,
        currentUser?.id || 'usr-admin',
        currentUser?.nameAr || 'المشرف'
      );

      refreshUsers();
      setEditingUser(null);
      showFeedback(
        isArabic
          ? `تم تحديث بيانات المستخدم (${formData.nameAr}) بنجاح!`
          : `User profile updated successfully!`
      );
    } catch (err: any) {
      const errMsg = err?.message || (isArabic ? 'فشل تعديل المستخدم' : 'Failed to update user');
      setModalError(errMsg);
      showFeedback(errMsg, 'error');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    if (!allowUserManagement) {
      setModalError(isArabic ? 'صلاحية شطب المستخدمين محصورة بمدير النظام (الأدمن) فقط' : 'Admin only');
      return;
    }
    setModalError(null);

    try {
      const success = db.deleteUser(
        deletingUser.id,
        currentUser?.id || 'usr-admin',
        currentUser?.nameAr || 'المشرف'
      );

      if (success) {
        refreshUsers();
        showFeedback(
          isArabic
            ? `تم شطب المستخدم (@${deletingUser.username}) نهائياً من النظام.`
            : `User (@${deletingUser.username}) deleted successfully.`
        );
        setDeletingUser(null);
      } else {
        const errMsg = isArabic
          ? 'لا يمكن حذف هذا المستخدم (مشرف رئيسي أو حسابك الحالي).'
          : 'Cannot delete this user (Super Admin or self).';
        setModalError(errMsg);
        showFeedback(errMsg, 'error');
      }
    } catch (err: any) {
      const errMsg = err?.message || (isArabic ? 'فشل شطب المستخدم' : 'Failed to delete user');
      setModalError(errMsg);
      showFeedback(errMsg, 'error');
    }
  };

  // Submit Password Reset
  const handleSubmitPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!allowUserManagement) {
      setModalError(isArabic ? 'صلاحية تغيير كلمات المرور محصورة بمدير النظام (الأدمن) فقط' : 'Admin only');
      return;
    }

    if (!resetPasswordUser || !newPasswordValue.trim()) return;
    if (newPasswordValue.trim().length < 4) {
      setModalError(isArabic ? 'كلمة المرور يجب أن تتكون من 4 خانات على الأقل' : 'Password must be at least 4 characters');
      return;
    }

    try {
      db.resetUserPassword(
        resetPasswordUser.id,
        newPasswordValue.trim(),
        currentUser?.id || 'usr-admin',
        currentUser?.nameAr || 'المشرف'
      );

      refreshUsers();
      showFeedback(
        isArabic
          ? `تم تغيير كلمة المرور للمستخدم (@${resetPasswordUser.username}) بنجاح!`
          : `Password updated for @${resetPasswordUser.username}!`
      );
      setResetPasswordUser(null);
      setNewPasswordValue('');
    } catch (err: any) {
      const errMsg = err?.message || (isArabic ? 'فشل تغيير كلمة المرور' : 'Failed to reset password');
      setModalError(errMsg);
      showFeedback(errMsg, 'error');
    }
  };

  // Export Users CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Username', 'Password', 'Name Ar', 'Name En', 'Role', 'Department', 'Job Title Ar', 'Phone', 'Email'];
    const rows = usersList.map((u) => [
      u.id,
      u.username,
      u.password || '',
      `"${u.nameAr}"`,
      `"${u.nameEn}"`,
      u.role,
      `"${u.department}"`,
      `"${u.jobTitleAr}"`,
      `"${u.phone || ''}"`,
      u.email,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jbc_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback(isArabic ? 'تم تصدير كشف المستخدمين بنجاح' : 'Exported users CSV successfully');
  };

  if (!allowUserManagement) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-lg mx-auto mt-10 shadow-2xl animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">
            {isArabic ? 'منطقة صلاحيات إدارية مقيدة' : 'Access Restricted'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {isArabic
              ? 'صلاحية الدخول على صفحة المستخدمين، وإضافة وتعديل وشطب المستخدمين محصورة بمدير النظام (الأدمن فقط). لا تملك الصلاحية للوصول إلى هذا القسم.'
              : 'User management access, additions, modifications, and deletions are strictly restricted to System Administrators.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Alert / Notification Bar */}
      {notificationMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-lg transition animate-slide-down ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header & Stats */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  <span>{isArabic ? 'إدارة المستخدمين وصلاحيات النظام' : 'User Management & Permissions'}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {usersList.length} {isArabic ? 'مستخدم' : 'Users'}
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isArabic
                    ? 'صلاحيات الأدمن الكاملة: إضافة، تعديل، شطب المستخدمين، وتعيين كلمات المرور، وإرسال روابط الدخول المباشرة عبر الواتساب'
                    : 'Admin control: Add, edit, delete users, manage passwords, and send WhatsApp direct login links'}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setWhatsAppUser(usersList[0]);
                setIsWhatsAppModalOpen(true);
              }}
              className="py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>{isArabic ? 'إرسال رابط النظام عبر واتساب' : 'Send WhatsApp Link'}</span>
            </button>

            {allowUserManagement && (
              <button
                onClick={handleOpenAddModal}
                className="py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-950 transition active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isArabic ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="py-2.5 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition"
              title={isArabic ? 'تصدير كشف المستخدمين CSV' : 'Export Users CSV'}
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">{isArabic ? 'تصدير CSV' : 'Export'}</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">{isArabic ? 'الإدارة والمدراء' : 'Admins & Exec'}</span>
              <span className="text-base font-black text-white">{superAdminCount + adminCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">{isArabic ? 'الفنيون والمهندسون' : 'Technicians'}</span>
              <span className="text-base font-black text-cyan-300">{techCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">{isArabic ? 'المشغلون والموظفون' : 'Field Operators'}</span>
              <span className="text-base font-black text-emerald-300">{empCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">{isArabic ? 'إجمالي الحسابات' : 'Total Accounts'}</span>
              <span className="text-base font-black text-amber-300">{usersList.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isArabic
                ? 'ابحث بالاسم، اسم المستخدم (@username)، المسمى الوظيفي، أو الهاتف...'
                : 'Search by name, @username, job title, phone...'
            }
            className="w-full py-2.5 px-10 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="all">{isArabic ? 'جميع الصلاحيات (All Roles)' : 'All Roles'}</option>
            <option value="super_admin">{isArabic ? 'مدير عام تنفيذي (Super Admin)' : 'Super Admin'}</option>
            <option value="admin">{isArabic ? 'مدير نظام / محطة (Admin)' : 'Admin'}</option>
            <option value="maintenance_manager">{isArabic ? 'رئيس قسم الصيانة' : 'Maintenance Head'}</option>
            <option value="technician">{isArabic ? 'فني صيانة وتشغيل (Technician)' : 'Technician'}</option>
            <option value="employee">{isArabic ? 'مشغل / موظف ميداني (Operator)' : 'Operator'}</option>
          </select>

          {/* Department filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium max-w-[180px]"
          >
            <option value="all">{isArabic ? 'جميع الأقسام' : 'All Departments'}</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Count Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          {isArabic
            ? `عرض ${filteredUsers.length} من أصل ${usersList.length} مستخدم مسجل في المحطة`
            : `Showing ${filteredUsers.length} of ${usersList.length} registered staff`}
        </span>
        <span className="text-[11px] text-amber-400 font-medium">
          {isArabic ? 'انقر على أيقونة الواتساب لأي موظف لإرسال بياناته ورابط الدخول' : 'Click WhatsApp on any row to send login credentials'}
        </span>
      </div>

      {/* Users Table / List */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right rtl:text-right ltr:text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">{isArabic ? 'الموظف / الاسم' : 'Employee'}</th>
                <th className="py-3 px-4">{isArabic ? 'اسم المستخدم' : 'Username'}</th>
                <th className="py-3 px-4">{isArabic ? 'كلمة المرور' : 'Password'}</th>
                <th className="py-3 px-4">{isArabic ? 'الصلاحية والوظيفة' : 'Role & Job'}</th>
                <th className="py-3 px-4">{isArabic ? 'القسم والهاتف' : 'Department & Phone'}</th>
                <th className="py-3 px-4 text-center">{isArabic ? 'إجراءات الأدمن' : 'Admin Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p>{isArabic ? 'لا يوجد مستخدمون يطابقون معايير البحث' : 'No users match your filter'}</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isVisible = showPasswords[user.id];
                  return (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition group">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                              user.role === 'super_admin'
                                ? 'bg-purple-950 text-purple-300 border-purple-500/40'
                                : user.role === 'admin' || user.role === 'maintenance_manager'
                                ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                                : user.role === 'technician'
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {user.nameAr.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{user.nameAr}</span>
                            <span className="text-[10px] text-slate-400 block">{user.nameEn}</span>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-bold">
                          @{user.username}
                        </span>
                      </td>

                      {/* Password */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 min-w-[75px]">
                            {isVisible ? user.password || 'pass123' : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="p-1 text-slate-400 hover:text-white rounded transition"
                            title={isVisible ? (isArabic ? 'إخفاء' : 'Hide') : isArabic ? 'إظهار' : 'Show'}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Role & Job */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              user.role === 'super_admin'
                                ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                                : user.role === 'admin'
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                : user.role === 'maintenance_manager'
                                ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                                : user.role === 'technician'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {user.role}
                          </span>
                          <span className="text-[11px] text-slate-300 block">{user.jobTitleAr}</span>
                        </div>
                      </td>

                      {/* Department & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="text-slate-300 font-medium block">{user.department}</span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {user.phone || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* WhatsApp Invite Button */}
                          <button
                            onClick={() => {
                              setWhatsAppUser(user);
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40 transition"
                            title={isArabic ? 'إرسال الرابط والبيانات عبر الواتساب' : 'Send login link via WhatsApp'}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          {allowUserManagement && (
                            <button
                              onClick={() => {
                                setResetPasswordUser(user);
                                setNewPasswordValue('');
                              }}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
                              title={isArabic ? 'تغيير كلمة المرور' : 'Reset Password'}
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit User */}
                          {allowUserManagement && (
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
                              title={isArabic ? 'تعديل بيانات المستخدم' : 'Edit User'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete User */}
                          {allowUserManagement &&
                            user.role !== 'super_admin' &&
                            user.id !== currentUser?.id &&
                            user.id !== 'usr-admin' &&
                            user.username.toLowerCase() !== 'admin' && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 hover:border-rose-700 transition"
                              title={isArabic ? 'شطب المستخدم' : 'Delete User'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>{isArabic ? 'إضافة مستخدم جديد للنظام (صلاحيات الأدمن)' : 'Add New User to System'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-3 text-xs">
              {modalError && (
                <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'اسم المستخدم (Username): *' : 'Username: *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="e.g. tareq_tech"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'كلمة المرور الأولية: *' : 'Password: *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="user123"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-teal-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'الاسم الكامل (عربي): *' : 'Full Name (Arabic): *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    placeholder="مثال: م. بلال الخوالدة"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'الاسم الكامل (إنجليزي):' : 'Full Name (English):'}
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="Eng. Bilal Khawaldeh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'صلاحية النظام (Role):' : 'Role:'}
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="employee">{isArabic ? 'مشغل / موظف (Operator)' : 'Employee'}</option>
                    <option value="technician">{isArabic ? 'فني صيانة وتشغيل (Technician)' : 'Technician'}</option>
                    <option value="maintenance_manager">{isArabic ? 'رئيس قسم الصيانة (Manager)' : 'Maintenance Manager'}</option>
                    <option value="admin">{isArabic ? 'مدير نظام (Admin)' : 'Admin'}</option>
                    {isSuperAdmin && <option value="super_admin">{isArabic ? 'مدير عام تنفيذي (Super Admin)' : 'Super Admin'}</option>}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'القسم (Department):' : 'Department:'}
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Mechanical / Electrical / Wellfield"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'المسمى الوظيفي (عربي):' : 'Job Title (Ar):'}
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitleAr}
                    onChange={(e) => setFormData({ ...formData, jobTitleAr: e.target.value })}
                    placeholder="فني ميكانيك أول"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'رقم الهاتف (الواتساب):' : 'Phone (WhatsApp):'}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+962 7 9000 1122"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg transition active:scale-95"
                >
                  {isArabic ? 'حفظ وإضافة المستخدم' : 'Save & Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                <span>{isArabic ? `تعديل بيانات المستخدم: ${editingUser.nameAr}` : `Edit User: ${editingUser.nameEn}`}</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-3 text-xs">
              {modalError && (
                <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'اسم المستخدم (Username): *' : 'Username: *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'كلمة المرور:' : 'Password:'}
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-teal-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'الاسم الكامل (عربي): *' : 'Full Name (Arabic): *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'صلاحية النظام (Role):' : 'Role:'}
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    disabled={editingUser.role === 'super_admin' && !isSuperAdmin}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-medium disabled:opacity-50"
                  >
                    <option value="employee">{isArabic ? 'مشغل / موظف (Operator)' : 'Employee'}</option>
                    <option value="technician">{isArabic ? 'فني صيانة وتشغيل (Technician)' : 'Technician'}</option>
                    <option value="maintenance_manager">{isArabic ? 'رئيس قسم الصيانة (Manager)' : 'Maintenance Manager'}</option>
                    <option value="admin">{isArabic ? 'مدير نظام (Admin)' : 'Admin'}</option>
                    {isSuperAdmin && <option value="super_admin">{isArabic ? 'مدير عام تنفيذي (Super Admin)' : 'Super Admin'}</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'القسم (Department):' : 'Department:'}
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'المسمى الوظيفي (عربي):' : 'Job Title (Ar):'}
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitleAr}
                    onChange={(e) => setFormData({ ...formData, jobTitleAr: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'الهاتف (Phone):' : 'Phone:'}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {isArabic ? 'البريد الإلكتروني:' : 'Email:'}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg transition active:scale-95"
                >
                  {isArabic ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Password */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>{isArabic ? 'تغيير كلمة المرور' : 'Reset Password'}</span>
              </h3>
              <button onClick={() => setResetPasswordUser(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {isArabic
                ? `تعيين كلمة مرور جديدة للمستخدم (${resetPasswordUser.nameAr} - @${resetPasswordUser.username}):`
                : `Set new password for @${resetPasswordUser.username}:`}
            </p>

            <form onSubmit={handleSubmitPasswordReset} className="space-y-3">
              {modalError && (
                <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold text-xs flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <input
                type="text"
                required
                autoFocus
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                placeholder={isArabic ? 'أدخل كلمة المرور الجديدة...' : 'New password...'}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono text-sm focus:outline-none focus:border-amber-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  {isArabic ? 'تحديث كلمة المرور' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-800 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isArabic ? 'تأكيد شطب المستخدم' : 'Confirm Delete User'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isArabic ? 'هذا الإجراء سيحذف حساب المستخدم من النظام نهائياً.' : 'This will remove the user permanently.'}
                </p>
              </div>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="font-bold text-white">{deletingUser.nameAr}</p>
              <p className="font-mono text-amber-300">@{deletingUser.username}</p>
              <p className="text-slate-400">{deletingUser.department} - {deletingUser.jobTitleAr}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950 transition active:scale-95"
              >
                {isArabic ? 'نعم، شطب المستخدم' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone WhatsApp Invite Modal */}
      <WhatsAppInviteModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setWhatsAppUser(null);
        }}
        initialUser={whatsAppUser}
      />
    </div>
  );
};
