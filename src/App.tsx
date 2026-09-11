import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, Lock } from 'lucide-react';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './services/authContext';
import { Header } from './components/common/Header';
import { BottomNav, TabType } from './components/common/BottomNav';
import { SubNav } from './components/common/SubNav';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { NotificationsModal } from './components/common/NotificationsModal';
import { QRCodeModal } from './components/common/QRCodeModal';
import { QRScannerModal } from './components/common/QRScannerModal';
import { LoginScreen } from './components/auth/LoginScreen';

// Dashboards
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { EmployeeDashboard } from './components/dashboard/EmployeeDashboard';

// Modules
import { TasksModule } from './components/tasks/TasksModule';
import { MaintenanceModule } from './components/maintenance/MaintenanceModule';
import { EquipmentModule } from './components/equipment/EquipmentModule';
import { PMSchedulesModule } from './components/pm/PMSchedulesModule';
import { RequestsModule } from './components/requests/RequestsModule';
import { ProcurementModule } from './components/procurement/ProcurementModule';
import { DocumentsModule } from './components/documents/DocumentsModule';
import { ReportsModule } from './components/reports/ReportsModule';
import { AuditLogsModule } from './components/audit/AuditLogsModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { UserManagementModule } from './components/admin/UserManagementModule';

import { Equipment } from './types';
import { db } from './services/db';
import { firestoreSync } from './services/firestoreSync';

const MainApp: React.FC = () => {
  const { currentUser, isTechnicianOrEmployee, isAdmin, isSuperAdmin } = useAuth();
  const { isArabic } = useLanguage();
  const [, setSyncTick] = useState(0);

  // Re-render when remote Firestore data updates
  React.useEffect(() => {
    const handleUpdate = () => setSyncTick((prev) => prev + 1);
    window.addEventListener('jbc-data-updated', handleUpdate);
    return () => window.removeEventListener('jbc-data-updated', handleUpdate);
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dashboardViewMode, setDashboardViewMode] = useState<'admin' | 'employee'>(() =>
    isTechnicianOrEmployee ? 'employee' : 'admin'
  );

  // Modals state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [qrModalEquipment, setQrModalEquipment] = useState<Equipment | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  // In-app real-time notification banner
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    title: string;
    message: string;
    actionUrl?: string;
  } | null>(null);

  useEffect(() => {
    const handleNotification = (e: any) => {
      setSyncTick((prev) => prev + 1);
      const notif = e.detail;
      if (notif && (!notif.userId || notif.userId === currentUser?.id)) {
        setToastNotification({
          id: notif.id || String(Date.now()),
          title: notif.title || (isArabic ? 'إشعار جديد' : 'New Notification'),
          message: notif.message || '',
          actionUrl: notif.actionUrl,
        });
        setTimeout(() => {
          setToastNotification((curr) => (curr?.id === notif.id ? null : curr));
        }, 7000);
      }
    };
    window.addEventListener('jbc-notification-received', handleNotification);
    return () => window.removeEventListener('jbc-notification-received', handleNotification);
  }, [currentUser?.id, isArabic]);

  // Cross-module navigation context
  const [maintenanceInitialEquipmentId, setMaintenanceInitialEquipmentId] = useState<string | null>(null);
  const [maintenanceInitialWorkOrderId, setMaintenanceInitialWorkOrderId] = useState<string | null>(null);
  const [equipmentInitialId, setEquipmentInitialId] = useState<string | null>(null);
  const [requestsInitialType, setRequestsInitialType] = useState<string | undefined>(undefined);

  if (!currentUser) {
    return <LoginScreen />;
  }

  // Cross-module handlers
  const handleNavigateToMaintenanceWithEquipment = (equipmentId: string) => {
    setMaintenanceInitialEquipmentId(equipmentId);
    setMaintenanceInitialWorkOrderId(null);
    setActiveTab('maintenance');
  };

  const handleNavigateToWorkOrder = (woId: string) => {
    setMaintenanceInitialWorkOrderId(woId);
    setMaintenanceInitialEquipmentId(null);
    setActiveTab('maintenance');
  };

  const handleNavigateToEquipment = (equipmentId?: string) => {
    if (equipmentId) setEquipmentInitialId(equipmentId);
    setActiveTab('equipment');
  };

  const handleNavigateToNewRequest = (type: 'leave' | 'permission') => {
    setRequestsInitialType(type);
    setActiveTab('requests');
  };

  const handleQRScanSuccess = (decodedText: string) => {
    const query = decodedText.trim();
    // Check if matching equipment
    const eq = db.getEquipmentByCode(query);
    if (eq) {
      setEquipmentInitialId(`${eq.id}_${Date.now()}`);
      setActiveTab('equipment');
      return;
    }

    // Check if matching work order number
    const wo = db.getWorkOrders().find((w) => w.workOrderNumber.toLowerCase() === query.toLowerCase());
    if (wo) {
      setMaintenanceInitialWorkOrderId(wo.id);
      setActiveTab('maintenance');
      return;
    }

    // Fallback search equipment list
    const fallbackEq = db.getEquipment().find(
      (e) =>
        e.code.toLowerCase().includes(query.toLowerCase()) ||
        e.id === query ||
        e.qrCodeValue.toLowerCase() === query.toLowerCase()
    );
    if (fallbackEq) {
      setEquipmentInitialId(`${fallbackEq.id}_${Date.now()}`);
      setActiveTab('equipment');
      return;
    }

    alert(
      isArabic
        ? `تم مسح الرمز: ${decodedText} - لم يتم العثور على أصل مطابق في السجلات`
        : `Scanned code: ${decodedText} - No matching asset found in registry.`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white pb-16 lg:pb-6">
      {/* Top Header */}
      <Header
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenQRScanner={() => setQrScannerOpen(true)}
      />

      {/* Offline Status Banner */}
      <OfflineIndicator />

      {/* Desktop / Tablet Sub-navigation */}
      <SubNav activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 animate-fade-in">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* If supervisor/admin, allow toggling between Admin KPI overview & Personal technician view */}
            {!isTechnicianOrEmployee && (
              <div className="flex items-center justify-end gap-2 text-xs">
                <span className="text-slate-400">
                  {isArabic ? 'عرض لوحة المعلومات:' : 'Dashboard view:'}
                </span>
                <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
                  <button
                    onClick={() => setDashboardViewMode('admin')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      dashboardViewMode === 'admin'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isArabic ? 'مؤشرات المحطة (KPI)' : 'Plant KPIs'}
                  </button>
                  <button
                    onClick={() => setDashboardViewMode('employee')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      dashboardViewMode === 'employee'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isArabic ? 'مهامي اليومية' : 'My Day Schedule'}
                  </button>
                </div>
              </div>
            )}

            {dashboardViewMode === 'admin' && !isTechnicianOrEmployee ? (
              <AdminDashboard
                onNavigateToTasks={() => setActiveTab('tasks')}
                onNavigateToMaintenance={() => setActiveTab('maintenance')}
                onNavigateToRequests={() => setActiveTab('requests')}
                onNavigateToEquipment={() => setActiveTab('equipment')}
                onNavigateToReports={() => setActiveTab('reports')}
              />
            ) : (
              <EmployeeDashboard
                onNavigateToTasks={() => setActiveTab('tasks')}
                onNavigateToWorkOrders={() => setActiveTab('maintenance')}
                onOpenNewLeaveModal={() => handleNavigateToNewRequest('leave')}
                onOpenNewPermissionModal={() => handleNavigateToNewRequest('permission')}
              />
            )}
          </div>
        )}

        {/* TASKS MODULE */}
        {activeTab === 'tasks' && <TasksModule />}

        {/* MAINTENANCE MODULE */}
        {activeTab === 'maintenance' && (
          <MaintenanceModule
            initialEquipmentId={maintenanceInitialEquipmentId}
            initialWorkOrderId={maintenanceInitialWorkOrderId}
          />
        )}

        {/* EQUIPMENT & QR ASSETS MODULE */}
        {activeTab === 'equipment' && (
          <EquipmentModule
            initialEquipmentId={equipmentInitialId}
            onShowQR={(eq) => setQrModalEquipment(eq)}
            onOpenQRScanner={() => setQrScannerOpen(true)}
            onNavigateToMaintenanceWithEquipment={handleNavigateToMaintenanceWithEquipment}
          />
        )}

        {/* PREVENTIVE MAINTENANCE MODULE */}
        {activeTab === 'pm' && (
          <PMSchedulesModule onNavigateToWorkOrder={handleNavigateToWorkOrder} />
        )}

        {/* LEAVES & PERMISSIONS REQUESTS MODULE */}
        {activeTab === 'requests' && (
          <RequestsModule initialType={requestsInitialType} />
        )}

        {/* PROCUREMENT & PETTY CASH MODULE */}
        {activeTab === 'procurement' && <ProcurementModule />}

        {/* DOCUMENTS & ARCHIVE MODULE */}
        {activeTab === 'documents' && <DocumentsModule />}

        {/* REPORTS & ANALYTICS MODULE */}
        {activeTab === 'reports' && <ReportsModule />}

        {/* AUDIT LOGS MODULE */}
        {activeTab === 'audit' && <AuditLogsModule />}

        {/* USERS & ROLES MANAGEMENT MODULE - Admin Only */}
        {activeTab === 'users' && (
          (isAdmin || isSuperAdmin) ? (
            <UserManagementModule />
          ) : (
            <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl my-8 max-w-lg mx-auto shadow-2xl animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                {isArabic ? 'صفحة المستخدمين مقيدة بمدير النظام (الأدمن) فقط' : 'Users Page Restricted to Admin Only'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isArabic
                  ? 'صلاحية الدخول على صفحة المستخدمين وإدارتها وتعديل أو شطب الحسابات محصورة بحساب الأدمن فقط.'
                  : 'Access to user management and account administration is restricted exclusively to the Administrator.'}
              </p>
            </div>
          )
        )}

        {/* SETTINGS MODULE */}
        {activeTab === 'settings' && <SettingsModule />}
      </main>

      {/* Mobile Bottom Navigation Dock */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenQRScanner={() => setQrScannerOpen(true)}
      />

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNavigate={(actionUrl) => {
          if (actionUrl === 'maintenance') setActiveTab('maintenance');
          if (actionUrl === 'tasks') setActiveTab('tasks');
          if (actionUrl === 'requests') setActiveTab('requests');
          if (actionUrl === 'procurement') setActiveTab('procurement');
          if (actionUrl === 'pm') setActiveTab('pm');
        }}
      />

      {/* QR Code Printable Modal */}
      <QRCodeModal
        isOpen={!!qrModalEquipment}
        onClose={() => setQrModalEquipment(null)}
        equipment={qrModalEquipment}
      />

      {/* Field Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
      />

      {/* Real-time In-App Notification Toast */}
      {toastNotification && (
        <div className="fixed top-20 start-4 end-4 sm:start-auto sm:end-6 z-70 sm:max-w-sm w-auto bg-slate-900/95 border border-emerald-500/50 shadow-2xl rounded-2xl p-4 backdrop-blur-md animate-fade-in flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div
            className="flex-1 cursor-pointer"
            onClick={() => {
              if (toastNotification.actionUrl) {
                if (toastNotification.actionUrl === 'maintenance') setActiveTab('maintenance');
                if (toastNotification.actionUrl === 'tasks') setActiveTab('tasks');
                if (toastNotification.actionUrl === 'requests') setActiveTab('requests');
                if (toastNotification.actionUrl === 'procurement') setActiveTab('procurement');
                if (toastNotification.actionUrl === 'pm') setActiveTab('pm');
              } else {
                setNotificationsOpen(true);
              }
              setToastNotification(null);
            }}
          >
            <h4 className="text-xs font-bold text-white mb-0.5">{toastNotification.title}</h4>
            <p className="text-xs text-slate-300 leading-snug">{toastNotification.message}</p>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  React.useEffect(() => {
    firestoreSync.initSync();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}
