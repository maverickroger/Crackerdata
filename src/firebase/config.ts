import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with robust offline persistence support
let firestoreDb: Firestore;
try {
  const cacheSettings = {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  };
  firestoreDb = firebaseConfig.firestoreDatabaseId
    ? initializeFirestore(app, cacheSettings, firebaseConfig.firestoreDatabaseId)
    : initializeFirestore(app, cacheSettings);
} catch {
  // Fallback to standard firestore instance if already initialized or browser restricts indexedDB
  firestoreDb = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreDb;
export const storage = getStorage(app);

// Connection verification test per Firebase skill guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firestore is running in offline-cached mode.');
    }
    return false;
  }
}
