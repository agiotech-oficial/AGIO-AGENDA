import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const storage = getStorage(app);

export const googleAuthProvider = new GoogleAuthProvider();
// We add Google Drive scope
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const setCachedAccessToken = (token: string) => {
  cachedAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setIsSigningIn = (val: boolean) => {
  isSigningIn = val;
};
