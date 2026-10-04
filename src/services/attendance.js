import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const collectionRef = collection(db, 'attendance');
const docIdFor = (key) => encodeURIComponent(key);

export function subscribeAttendance(onData, onError) {
  return onSnapshot(collectionRef, (snapshot) => {
    const records = {};
    snapshot.forEach((item) => {
      const data = item.data();
      if (!data?.date || !data?.className || !data?.batch) return;
      const key = `${data.date}|${data.className}|${data.batch}`;
      records[key] = data.records && typeof data.records === 'object' ? data.records : {};
    });
    onData(records);
  }, onError);
}

export async function saveAttendanceCloud({ date, className, batch, records }, userId) {
  const key = `${date}|${className}|${batch}`;
  await setDoc(doc(db, 'attendance', docIdFor(key)), {
    date,
    className,
    batch,
    records: records || {},
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
