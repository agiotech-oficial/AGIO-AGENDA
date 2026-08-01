import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

let _db: Firestore | null = null;
export const getDb = (): Firestore => {
  if (!_db) {
    const databaseId = (firebaseConfig as any).firestoreDatabaseId;
    _db = (databaseId && databaseId !== '(default)')
      ? getFirestore(app, databaseId)
      : getFirestore(app);
  }
  return _db;
};

let _auth: Auth | null = null;
export const getFirebaseAuth = (): Auth => {
  if (!_auth) {
    _auth = getAuth(app);
  }
  return _auth;
};

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getFirebaseAuth();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export { app, analytics };
