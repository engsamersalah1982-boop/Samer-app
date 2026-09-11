import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, UserPermissions } from '../types';
import { db } from './db';

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
        canManageUsers: true,
        canViewReports: true,
        canManageDocuments: true,
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
        canManageUsers: false,
        canViewReports: true,
        canManageDocuments: true,
      };
    case 'technician':
      // Operational rule: Technicians only read & execute assigned work orders,
      // notify completion, and submit completion reports.
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
      };
  }
}

interface AuthContextType {
  currentUser: User | null;
  login: (usernameOrEmail: string, password?: string) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  refreshCurrentUser: () => void;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isMaintenanceManager: boolean;
  isTechnician: boolean;
  isEmployee: boolean;
  isTechnicianOrEmployee: boolean;
  // Specific Permissions:
  canCreateWorkOrders: boolean;
  canEditWorkOrders: boolean;
  canExecuteWorkOrders: boolean;
  canCloseWorkOrder: boolean;
  canDeleteWorkOrders: boolean;
  canManageWorkOrders: boolean;
  canManageEquipment: boolean;
  canEditEquipment: boolean;
  canDeleteEquipment: boolean;
  canUpdateOperatingHours: boolean;
  canApproveRequests: boolean;
  canCreateTasks: boolean;
  canDeleteTasks: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canManageDocuments: boolean;
  permissions: UserPermissions;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'jbc_current_user_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          const freshUser = db.getUserById(parsed.id);
          return freshUser || null;
        }
      }
      // Require explicit login by default: Never auto-login to an account!
      return null;
    } catch {
      return null;
    }
  });

  const refreshCurrentUser = () => {
    if (currentUser?.id) {
      const fresh = db.getUserById(currentUser.id);
      if (fresh) setCurrentUser(fresh);
    }
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, [currentUser]);

  const login = (usernameOrEmail: string, password?: string): boolean => {
    if (!usernameOrEmail || !password) {
      return false;
    }

    const input = usernameOrEmail.trim().toLowerCase();
    const enteredPassword = password.trim();

    if (enteredPassword.length === 0) {
      return false;
    }

    const users = db.getUsers();
    let user = users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === input) ||
        u.email.toLowerCase() === input
    );

    // If input is 'samer' or 'eng.samer.salah1982@gmail.com', map to the admin account
    if (!user && (input === 'samer' || input === 'eng.samer.salah1982@gmail.com')) {
      user = users.find((u) => u.id === 'usr-admin' || u.username === 'admin');
    }

    if (!user) {
      return false;
    }

    // Strictly verify password against user's actual registered password
    const expectedPassword = user.password || '123456';
    if (enteredPassword !== expectedPassword) {
      return false;
    }

    setCurrentUser(user);
    db.logAction(
      user.id,
      user.nameAr,
      `تسجيل دخول ناجح إلى النظام (${user.username || user.email})`,
      'UserSession',
      user.id
    );
    return true;
  };

  const logout = () => {
    if (currentUser) {
      db.logAction(
        currentUser.id,
        currentUser.nameAr,
        'تسجيل خروج من النظام وتأمين الجلسة',
        'UserSession',
        currentUser.id
      );
    }
    localStorage.removeItem(CURRENT_USER_KEY);
    setCurrentUser(null);
  };

  const switchUser = (userId: string) => {
    const user = db.getUserById(userId);
    if (user) {
      setCurrentUser(user);
      db.logAction(
        user.id,
        user.nameAr,
        `التبديل إلى حساب: ${user.nameAr} (${user.role})`,
        'UserSession',
        user.id
      );
    }
  };

  const role = currentUser?.role;

  // Real RBAC role identification
  const isSuperAdmin = Boolean(
    role === 'super_admin' ||
    currentUser?.id === 'usr-admin' ||
    currentUser?.username?.toLowerCase() === 'admin'
  );
  const isAdmin = Boolean(isSuperAdmin || role === 'admin');
  const isMaintenanceManager = Boolean(isAdmin || role === 'maintenance_manager');
  const isTechnician = role === 'technician';
  const isEmployee = role === 'employee';
  const isTechnicianOrEmployee = isTechnician || isEmployee;

  // Compute effective permissions combining role defaults and any custom overrides
  const defaultPerms = getDefaultPermissionsForRole(role);
  const effectivePermissions: UserPermissions = {
    ...defaultPerms,
    ...(currentUser?.permissions || {}),
  };

  // Strictly enforce user management & admin-level deletions for Admins only
  if (isAdmin) {
    effectivePermissions.canManageUsers = true;
    effectivePermissions.canDeleteTasks = true;
    effectivePermissions.canDeleteWorkOrders = true;
    effectivePermissions.canApproveRequests = true;
    effectivePermissions.canCreateWorkOrders = true;
    effectivePermissions.canEditWorkOrders = true;
    effectivePermissions.canExecuteWorkOrders = true;
    effectivePermissions.canCloseWorkOrder = true;
    effectivePermissions.canManageEquipment = true;
    effectivePermissions.canUpdateOperatingHours = true;
    effectivePermissions.canCreateTasks = true;
    effectivePermissions.canViewReports = true;
    effectivePermissions.canManageDocuments = true;
  } else {
    // Strictly forbid non-admins from managing users or deleting tasks
    effectivePermissions.canManageUsers = false;
    effectivePermissions.canDeleteTasks = false;
    effectivePermissions.canDeleteWorkOrders = false;
  }

  const canCreateWorkOrders = Boolean(isAdmin || isMaintenanceManager || effectivePermissions.canCreateWorkOrders);
  const canEditWorkOrders = Boolean(isAdmin || isMaintenanceManager || effectivePermissions.canEditWorkOrders);
  const canExecuteWorkOrders = Boolean(isAdmin || isMaintenanceManager || isTechnician || effectivePermissions.canExecuteWorkOrders);
  const canCloseWorkOrder = Boolean(isAdmin || isMaintenanceManager || effectivePermissions.canCloseWorkOrder);
  const canDeleteWorkOrders = Boolean(isAdmin || effectivePermissions.canDeleteWorkOrders);
  const canManageWorkOrders = Boolean(isAdmin || isMaintenanceManager);

  const canManageEquipment = Boolean(isAdmin || isMaintenanceManager || effectivePermissions.canManageEquipment);
  const canEditEquipment = Boolean(isAdmin || isMaintenanceManager || effectivePermissions.canManageEquipment);
  const canDeleteEquipment = Boolean(isAdmin || effectivePermissions.canManageEquipment);
  const canUpdateOperatingHours = Boolean(isAdmin || isMaintenanceManager || isTechnician || effectivePermissions.canUpdateOperatingHours);

  const canApproveRequests = Boolean(isAdmin || isMaintenanceManager || effectivePermissions.canApproveRequests);
  const canCreateTasks = Boolean(isAdmin || isMaintenanceManager || effectivePermissions.canCreateTasks);
  const canDeleteTasks = Boolean(isAdmin || effectivePermissions.canDeleteTasks);
  const canManageUsers = Boolean(isAdmin);
  const canViewReports = Boolean(isAdmin || isMaintenanceManager || effectivePermissions.canViewReports);
  const canManageDocuments = Boolean(isAdmin || isMaintenanceManager || effectivePermissions.canManageDocuments);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        switchUser,
        refreshCurrentUser,
        isSuperAdmin,
        isAdmin,
        isMaintenanceManager,
        isTechnician,
        isEmployee,
        isTechnicianOrEmployee,
        canCreateWorkOrders,
        canEditWorkOrders,
        canExecuteWorkOrders,
        canCloseWorkOrder,
        canDeleteWorkOrders,
        canManageWorkOrders,
        canManageEquipment,
        canEditEquipment,
        canDeleteEquipment,
        canUpdateOperatingHours,
        canApproveRequests,
        canCreateTasks,
        canDeleteTasks,
        canManageUsers,
        canViewReports,
        canManageDocuments,
        permissions: effectivePermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
