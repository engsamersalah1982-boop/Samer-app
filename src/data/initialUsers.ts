import { User, Employee } from '../types';

export const INITIAL_50_USERS: User[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'admin123',
    nameAr: 'م. سامر صلاح (مدير النظام - الأدمن)',
    nameEn: 'Eng. Samer Salah (System Administrator)',
    email: 'admin@jordanbiogas.com',
    role: 'super_admin',
    department: 'الإدارة والتحكم المركزي',
    jobTitleAr: 'المدير التنفيذي ومدير النظام',
    jobTitleEn: 'Executive Director & System Administrator',
    phone: '+962 7 9000 1122',
    employeeId: 'JBC-EMP-001',
    permissions: {
      canCreateWorkOrders: true,
      canEditWorkOrders: true,
      canExecuteWorkOrders: true,
      canCloseWorkOrder: true,
      canManageEquipment: true,
      canUpdateOperatingHours: true,
      canApproveRequests: true,
      canCreateTasks: true,
      canDeleteTasks: true,
      canDeleteWorkOrders: true,
      canManageUsers: true,
      canViewReports: true,
      canManageDocuments: true,
    },
  },
];

// Matching Employee list for leave balances & personnel records (Admin only)
export const INITIAL_50_EMPLOYEES: Employee[] = INITIAL_50_USERS.map((u, idx) => ({
  id: u.employeeId || `emp-${idx + 1}`,
  userId: u.id,
  code: u.employeeId || `JBC-EMP-${String(idx + 1).padStart(3, '0')}`,
  nameAr: u.nameAr,
  nameEn: u.nameEn,
  jobTitleAr: u.jobTitleAr,
  jobTitleEn: u.jobTitleEn,
  department: u.department,
  phone: u.phone || '+962 7 9000 0000',
  annualLeaveBalance: 21,
  sickLeaveBalance: 14,
  permissionHoursBalance: 8,
  status: 'active',
}));
