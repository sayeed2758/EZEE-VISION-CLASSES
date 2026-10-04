import { collection, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

function cleanStudent(student) {
  const { createdAt, updatedAt, createdBy, updatedBy, ...safe } = student || {};
  return safe;
}

function normalizeDoc(snapshot) {
  return cleanStudent({ id: snapshot.id, ...snapshot.data() });
}

export function subscribeStudents(onData, onError) {
  const studentsRef = collection(db, 'students');
  return onSnapshot(studentsRef, (snapshot) => {
    const next = snapshot.docs
      .map(normalizeDoc)
      .sort((a, b) => String(b.joined || '').localeCompare(String(a.joined || '')));
    onData(next);
  }, onError);
}

export async function createStudent(student, uid) {
  const payload = cleanStudent(student);
  await setDoc(doc(db, 'students', payload.id), {
    ...payload,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedBy: uid,
    updatedAt: serverTimestamp()
  });
  return payload;
}

export async function updateStudentInCloud(student, uid) {
  const payload = cleanStudent(student);
  await setDoc(doc(db, 'students', payload.id), {
    ...payload,
    updatedBy: uid,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return payload;
}

export async function deleteStudentInCloud(studentId) {
  await deleteDoc(doc(db, 'students', studentId));
}
