import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let appInstance: ReturnType<typeof initializeApp> | null = null;
let firestoreInstance: Firestore | null = null;
let isConnected = false;

export function getFirebaseApp() {
  if (!appInstance) {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      appInstance = initializeApp(firebaseConfig as any);
    }
  }
  return appInstance;
}

export function getFirebaseDb(): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    const dbId = (firebaseConfig as any).firestoreDatabaseId;
    const targetDbId = dbId && dbId !== '(default)' ? dbId : undefined;
    try {
      firestoreInstance = initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
        },
        targetDbId
      );
    } catch {
      try {
        firestoreInstance = getFirestore(app, targetDbId);
      } catch {
        firestoreInstance = getFirestore(app);
      }
    }
  }
  return firestoreInstance;
}

// Test connectivity as per guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    // ping test doc from server
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    isConnected = true;
    return true;
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn('Firestore offline or unreachable, local fallback active.');
      isConnected = false;
      return false;
    }
    // Any permission or document not found error implies server reachable
    isConnected = true;
    return true;
  }
}

export function isFirestoreOnline(): boolean {
  return isConnected;
}
