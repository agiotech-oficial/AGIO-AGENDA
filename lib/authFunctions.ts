import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';

export const loginWithEmail = async (email: string, pass: string) => {
  return await signInWithEmailAndPassword(auth, email, pass);
};

export const registerWithEmail = async (email: string, pass: string) => {
  return await createUserWithEmailAndPassword(auth, email, pass);
};

export const signOut = async () => {
  return await firebaseSignOut(auth);
};

export const sendResetPasswordEmail = async (email: string) => {
  return await sendPasswordResetEmail(auth, email);
};
