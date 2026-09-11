import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export type SyncStatus = 'connecting' | 'synced' | 'offline' | 'error';

class FirestoreSyncService {
  private status: SyncStatus = 'connecting';
  private listeners: (() => void)[] = [];
  private isInitialized = false;

  public getStatus(): SyncStatus {
    return this.status;
  }

  private setStatus(newStatus: SyncStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      window.dispatchEvent(new CustomEvent('jbc-sync-status', { detail: { status: newStatus } }));
    }
  }

  /**
   * Initializes real-time sync with Firebase Firestore for all modules.
   */
  public async initSync() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const firestore = getFirebaseDb();

      // List of synced collections mapped to localStorage keys
      const SYNC_MAPPINGS = [
        { key: 'jbc_users_v7', storeName: 'users' },
        { key: 'jbc_employees_v5', storeName: 'employees' },
        { key: 'jbc_tasks_v2', storeName: 'tasks' },
        { key: 'jbc_work_orders_mwm_v3', storeName: 'work_orders' },
        { key: 'jbc_equipment_mwm_v3', storeName: 'equipment' },
        { key: 'jbc_pm_schedules_mwm_v3', storeName: 'pm_schedules' },
        { key: 'jbc_leaves_v2', storeName: 'leaves' },
        { key: 'jbc_permissions_v2', storeName: 'permissions' },
        { key: 'jbc_documents_v2', storeName: 'documents' },
        { key: 'jbc_audit_logs_v2', storeName: 'audit_logs' },
        { key: 'jbc_notifications_v2', storeName: 'notifications' },
        { key: 'jbc_plant_profile_v1', storeName: 'plant_profile' },
        { key: 'jbc_purchase_requests_v1', storeName: 'purchase_requests' },
        { key: 'jbc_petty_cash_requests_v1', storeName: 'petty_cash_requests' },
        { key: 'jbc_procurement_categories_v1', storeName: 'procurement_categories' },
      ];

      // Parallelize checking and seeding across all mappings
      await Promise.allSettled(
        SYNC_MAPPINGS.map(async (item) => {
          const docRef = doc(firestore, 'sync_store', item.storeName);

          // Check if doc exists in Firestore; if not and local data exists, seed Firestore
          try {
            const snapshot = await getDoc(docRef);
            if (!snapshot.exists()) {
              const localDataStr = localStorage.getItem(item.key);
              if (localDataStr) {
                const parsed = JSON.parse(localDataStr);
                await setDoc(docRef, {
                  data: parsed,
                  updatedAt: new Date().toISOString(),
                  device: navigator.userAgent,
                });
              }
            } else {
              // Document exists in Firestore, pull it into local storage
              const remoteData = snapshot.data();
              if (remoteData && remoteData.data !== undefined) {
                localStorage.setItem(item.key, JSON.stringify(remoteData.data));
                window.dispatchEvent(new CustomEvent('jbc-data-updated', { detail: { key: item.key } }));
              }
            }
          } catch (err: any) {
            console.warn(`Initial sync notice for ${item.storeName}:`, err?.message || err);
          }

          // Set up real-time onSnapshot listener for instant cross-device updates
          const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const dataObj = docSnap.data();
                if (dataObj && dataObj.data !== undefined) {
                  const currentLocal = localStorage.getItem(item.key);
                  const remoteStr = JSON.stringify(dataObj.data);
                  if (currentLocal !== remoteStr) {
                    localStorage.setItem(item.key, remoteStr);
                    window.dispatchEvent(
                      new CustomEvent('jbc-data-updated', { detail: { key: item.key, data: dataObj.data } })
                    );
                  }
                }
                this.setStatus('synced');
              }
            },
            (err) => {
              console.warn(`Sync listener warning for ${item.storeName}:`, err?.message || err);
              this.setStatus('offline');
            }
          );

          this.listeners.push(unsubscribe);
        })
      );

      this.setStatus('synced');
    } catch (error) {
      console.error('Firestore initSync error:', error);
      this.setStatus('offline');
    }
  }

  /**
   * Push an update to Firestore whenever data is written locally.
   */
  public async pushUpdate(key: string, data: any) {
    try {
      const firestore = getFirebaseDb();
      const KEY_TO_STORE: Record<string, string> = {
        jbc_users_v7: 'users',
        jbc_employees_v5: 'employees',
        jbc_tasks_v2: 'tasks',
        jbc_work_orders_mwm_v3: 'work_orders',
        jbc_equipment_mwm_v3: 'equipment',
        jbc_pm_schedules_mwm_v3: 'pm_schedules',
        jbc_leaves_v2: 'leaves',
        jbc_permissions_v2: 'permissions',
        jbc_documents_v2: 'documents',
        jbc_audit_logs_v2: 'audit_logs',
        jbc_notifications_v2: 'notifications',
        jbc_plant_profile_v1: 'plant_profile',
        jbc_purchase_requests_v1: 'purchase_requests',
        jbc_petty_cash_requests_v1: 'petty_cash_requests',
        jbc_procurement_categories_v1: 'procurement_categories',
      };

      const storeName = KEY_TO_STORE[key];
      if (!storeName) return;

      // Strip any undefined keys so Firestore doesn't throw unsupported field value error
      const sanitizedData = JSON.parse(JSON.stringify(data ?? null));

      const docRef = doc(firestore, 'sync_store', storeName);
      await setDoc(docRef, {
        data: sanitizedData,
        updatedAt: new Date().toISOString(),
        clientTimestamp: Date.now(),
      });

      this.setStatus('synced');
    } catch (err) {
      console.warn(`Failed to push update for ${key} to Firestore:`, err);
      this.setStatus('offline');
    }
  }

  public destroy() {
    this.listeners.forEach((unsub) => unsub());
    this.listeners = [];
    this.isInitialized = false;
  }
}

export const firestoreSync = new FirestoreSyncService();
