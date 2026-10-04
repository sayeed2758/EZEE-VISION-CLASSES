import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

const collectionRef = collection(db, 'feeRecords');

export function subscribeFeeRecords(onData, onError) {
  return onSnapshot(collectionRef, (snapshot) => {
    const records = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
    onData(records);
  }, onError);
}

export async function saveFeeRecordCloud(record, userId) {
  if (!record?.id) throw new Error('Fee record id is required.');
  await setDoc(doc(db, 'feeRecords', record.id), {
    ...record,
    createdBy: record.createdBy || userId || null,
    updatedBy: userId || null,
    createdAt: record.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteFeeRecordCloud(recordId) {
  if (!recordId) return;
  await deleteDoc(doc(db, 'feeRecords', recordId));
}

export async function deleteFeeRecordsForStudent(studentId) {
  if (!studentId) return;
  const snapshot = await getDocs(query(collectionRef, where('studentId', '==', studentId)));
  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
}
