import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const testsRef = collection(db, 'tests');

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
  return value;
}

function normalizeTest(snapshot) {
  return clean({ id: snapshot.id, ...snapshot.data() });
}

export function subscribeTests(onData, onError) {
  return onSnapshot(testsRef, (snapshot) => {
    const next = snapshot.docs
      .map(normalizeTest)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    onData(next);
  }, onError);
}

export async function getTestCloud(testId) {
  if (!testId) return null;
  const snap = await getDoc(doc(db, 'tests', testId));
  if (!snap.exists()) return null;
  return normalizeTest(snap);
}

export async function saveTestCloud(test, uid) {
  if (!test?.id) throw new Error('Test id is required.');
  const payload = {
    ...test,
    published: true,
    publicAccess: true,
    createdBy: test.createdBy || uid || null,
    updatedBy: uid || null,
    createdAt: test.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: test.publishedAt || serverTimestamp(),
  };
  await setDoc(doc(db, 'tests', test.id), payload, { merge: true });
  return test;
}

export async function deleteTestCloud(testId) {
  if (!testId) return;
  await deleteDoc(doc(db, 'tests', testId));
}
