import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const testsRef = collection(db, 'tests');
function clean(value) { if (Array.isArray(value)) return value.map(clean); if (value && typeof value.toDate === 'function') return value.toDate().toISOString(); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clean(v)])); return value; }
function publicQuestion(q){
  const { correctOptionId, answer, explanation, ...safe } = q || {};
  return safe;
}
function normalizeTest(snapshot){ return clean({ id:snapshot.id, ...snapshot.data() }); }

export function subscribeTests(onData,onError){
  return onSnapshot(testsRef,snapshot=>onData(snapshot.docs.map(normalizeTest).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))),onError);
}

export async function getTestCloud(testId){
  if(!testId)return null;
  const snap=await getDoc(doc(db,'tests',testId));
  if(!snap.exists())return null;
  const test=normalizeTest(snap);
  // Teacher/Admin can read the private answer key. Public/unauthenticated readers cannot.
  try {
    const keys=await getDocs(collection(db,'tests',testId,'answerKey'));
    if(keys.size) test.questions=(test.questions||[]).map(q=>{
      const key=keys.docs.find(d=>d.id===q.id)?.data() || {};
      return {...q,...clean(key)};
    });
  } catch (_) { /* Public portal intentionally has no access to answerKey. */ }
  return test;
}

export async function saveTestCloud(test,uid){
  if(!test?.id)throw new Error('Test id is required.');
  const questions=(test.questions||[]).map(publicQuestion);
  const payload={...test,questions,published:true,publicAccess:true,createdBy:test.createdBy||uid||null,updatedBy:uid||null,createdAt:test.createdAt||serverTimestamp(),updatedAt:serverTimestamp(),publishedAt:test.publishedAt||serverTimestamp()};
  delete payload.answerKey;
  await setDoc(doc(db,'tests',test.id),payload,{merge:true});
  // Store answer keys separately so the student portal cannot read them.
  for(const q of (test.questions||[])){
    const key={marks:Number(q.marks||0),type:q.type||'MCQ',correctOptionId:q.correctOptionId||null,answer:q.answer||'',explanation:q.explanation||''};
    await setDoc(doc(db,'tests',test.id,'answerKey',q.id),key,{merge:true});
  }
  return test;
}
export async function deleteTestCloud(testId){ if(!testId)return; const keys=await getDocs(collection(db,'tests',testId,'answerKey')); await Promise.all(keys.docs.map(k=>deleteDoc(k.ref))); await deleteDoc(doc(db,'tests',testId)); }
