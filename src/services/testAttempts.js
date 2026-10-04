import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const attemptsRef = collection(db, 'testAttempts');

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
  return value;
}

export function subscribeTestAttempts(onData, onError) {
  return onSnapshot(attemptsRef, (snapshot) => {
    const next = snapshot.docs
      .map((item) => clean({ id: item.id, ...item.data() }))
      .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
    onData(next);
  }, onError);
}

export async function saveTestAttemptCloud(attempt, uid = null) {
  if (!attempt?.testId) throw new Error('Test id is required.');
  const payload = {
    ...attempt,
    createdBy: attempt.createdBy || uid || null,
    submittedAt: attempt.submittedAt || new Date().toISOString(),
    savedAt: serverTimestamp(),
    portalSubmission: true,
  };
  const ref = await addDoc(attemptsRef, payload);
  return { id: ref.id, ...attempt };
}

export async function savePublicScore(testId, result) {
  if (!testId) throw new Error('Test id is required.');
  const publicScoresRef = collection(db, 'tests', testId, 'publicScores');
  const ref = await addDoc(publicScoresRef, {
    score: Number(result.score || 0),
    totalMarks: Number(result.totalMarks || 0),
    percentage: Number(result.percentage || 0),
    submittedAt: result.submittedAt || new Date().toISOString(),
  });
  return ref.id;
}

export async function getPublicScores(testId) {
  if (!testId) return [];
  const ref = collection(db, 'tests', testId, 'publicScores');
  const snapshot = await getDocs(ref);
  return snapshot.docs
    .map((item) => clean({ id: item.id, ...item.data() }))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || String(a.submittedAt || '').localeCompare(String(b.submittedAt || '')));
}
