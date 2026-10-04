import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const bankRef = collection(db, 'questionBank');

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
  return value;
}

export function subscribeQuestionBank(onData, onError) {
  return onSnapshot(bankRef, (snapshot) => {
    const next = snapshot.docs
      .map((item) => clean({ id: item.id, ...item.data() }))
      .sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
    onData(next);
  }, onError);
}

export async function saveQuestionBankCloud(question, uid) {
  if (!question?.id) throw new Error('Question id is required.');
  await setDoc(doc(db, 'questionBank', question.id), {
    ...question,
    createdBy: question.createdBy || uid || null,
    updatedBy: uid || null,
    savedAt: question.savedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return question;
}

export async function deleteQuestionBankCloud(questionId) {
  if (!questionId) return;
  await deleteDoc(doc(db, 'questionBank', questionId));
}
