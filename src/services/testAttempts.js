import { collection, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
const attemptsRef=collection(db,'testAttempts');
const functions=getFunctions(undefined,'us-central1');
function clean(value){if(Array.isArray(value))return value.map(clean);if(value&&typeof value.toDate==='function')return value.toDate().toISOString();if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clean(v)]));return value;}
export function subscribeTestAttempts(onData,onError){return onSnapshot(attemptsRef,snapshot=>onData(snapshot.docs.map(item=>clean({id:item.id,...item.data()})).sort((a,b)=>String(b.submittedAt||'').localeCompare(String(a.submittedAt||'')))),onError);}
export async function submitTestSecurely(payload){const fn=httpsCallable(functions,'submitTest');const result=await fn(payload);return result.data;}
// Deprecated client-side write helpers are intentionally removed. Results must be server-evaluated.
export async function saveTestAttemptCloud(){throw new Error('Use submitTestSecurely().');}
export async function savePublicScore(){throw new Error('Public scores are written by the secure function.');}
export async function getPublicScores(){return [];}
