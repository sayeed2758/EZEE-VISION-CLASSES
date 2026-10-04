import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export function watchAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, profile: null, error: null });
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists()) {
        callback({ user, profile: null, error: 'ROLE_NOT_ASSIGNED' });
        return;
      }
      const profile = { id: snap.id, ...snap.data() };
      if (profile.active === false) {
        callback({ user, profile: null, error: 'ACCOUNT_DISABLED' });
        return;
      }
      callback({ user, profile, error: null });
    } catch (error) {
      callback({ user, profile: null, error });
    }
  });
}

export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const snap = await getDoc(doc(db, 'users', credential.user.uid));
  if (!snap.exists()) {
    await signOut(auth);
    const error = new Error('ROLE_NOT_ASSIGNED');
    error.code = 'ROLE_NOT_ASSIGNED';
    throw error;
  }
  const profile = { id: snap.id, ...snap.data() };
  if (profile.active === false) {
    await signOut(auth);
    const error = new Error('ACCOUNT_DISABLED');
    error.code = 'ACCOUNT_DISABLED';
    throw error;
  }
  return { user: credential.user, profile };
}

export function logoutUser() {
  return signOut(auth);
}
