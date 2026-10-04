const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

function normalize(v) {
  return String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function safeString(v, max = 120) {
  return String(v ?? '').trim().slice(0, max);
}

exports.submitTest = onCall({ region: 'us-central1', cors: true }, async (request) => {
  const data = request.data || {};
  const testId = safeString(data.testId, 120);
  const studentName = safeString(data.studentName, 120);
  const studentId = safeString(data.studentId, 80);
  const answers = data.answers && typeof data.answers === 'object' && !Array.isArray(data.answers) ? data.answers : {};
  const startedAtMs = Date.parse(data.startedAt || '');
  const now = Timestamp.now();

  if (!testId || !studentName || !studentId || !Number.isFinite(startedAtMs)) {
    throw new HttpsError('invalid-argument', 'Test, student details and a valid start time are required.');
  }

  const testRef = db.collection('tests').doc(testId);
  const testSnap = await testRef.get();
  if (!testSnap.exists) throw new HttpsError('not-found', 'This test is unavailable.');
  const test = testSnap.data();
  if (test.published !== true || test.publicAccess !== true) throw new HttpsError('failed-precondition', 'This test is not available.');

  if (test.type === 'Live Test') {
    const start = Date.parse(test.liveStart || '');
    const end = Date.parse(test.liveEnd || '');
    const nowMs = now.toMillis();
    if (Number.isFinite(start) && nowMs < start) throw new HttpsError('failed-precondition', 'This Live Test has not started yet.');
    if (Number.isFinite(end) && nowMs > end) throw new HttpsError('failed-precondition', 'This Live Test has ended.');
  }

  const questions = Array.isArray(test.questions) ? test.questions : [];
  if (!questions.length) throw new HttpsError('failed-precondition', 'This test has no questions.');

  const keySnaps = await testRef.collection('answerKey').get();
  const keys = new Map(keySnaps.docs.map(d => [d.id, d.data()]));

  let totalMarks = 0, score = 0, correct = 0, incorrect = 0, unattempted = 0, manualReview = 0;
  const details = [];

  for (const q of questions) {
    const key = keys.get(q.id) || {};
    const marks = Number(key.marks ?? q.marks ?? 0);
    totalMarks += marks;
    const user = answers[q.id];
    if (user === undefined || String(user).trim() === '') {
      unattempted++;
      details.push({ questionId: q.id, state: 'unattempted', userAnswer: null, correctAnswer: key.type === 'MCQ' ? (Array.isArray(q.options) ? q.options.find(o => o.id === key.correctOptionId)?.text || '' : '') : (key.answer || '') });
      continue;
    }
    if (key.type === 'Subjective') {
      manualReview++;
      details.push({ questionId: q.id, state: 'review', userAnswer: safeString(user, 5000), correctAnswer: safeString(key.answer, 5000) });
      continue;
    }
    let ok = false;
    if (key.type === 'MCQ') ok = user === key.correctOptionId;
    else if (key.type === 'True / False' || key.type === 'Fill in the blanks') ok = normalize(user) === normalize(key.answer);
    const correctAnswer = key.type === 'MCQ' ? (Array.isArray(q.options) ? q.options.find(o => o.id === key.correctOptionId)?.text || '' : '') : (key.answer || '');
    if (ok) {
      correct++; score += marks;
      details.push({ questionId: q.id, state: 'correct', userAnswer: safeString(user), correctAnswer });
    } else {
      incorrect++;
      if (test.negativeEnabled) score -= Number(test.negativeValue || 0);
      details.push({ questionId: q.id, state: 'incorrect', userAnswer: safeString(user), correctAnswer });
    }
  }

  score = Math.round(score * 100) / 100;
  const percentage = totalMarks ? Math.round((score / totalMarks) * 1000) / 10 : 0;
  const durationMs = Math.max(60000, Number(test.durationMinutes || 1) * 60000);
  const elapsedMs = Math.max(0, now.toMillis() - startedAtMs);
  const autoSubmitted = Boolean(data.autoSubmitted) || elapsedMs > durationMs + 30000;

  const attemptRef = db.collection('testAttempts').doc();
  await attemptRef.set({
    testId, studentName, studentId, score, totalMarks, percentage, correct, incorrect,
    unattempted, manualReview, details, answers, autoSubmitted,
    startedAt: Timestamp.fromMillis(startedAtMs), submittedAt: now,
    portalSubmission: true, createdAt: now
  });

  // Rank is calculated only from server-written attempts.
  const higher = await db.collection('testAttempts').where('testId', '==', testId).where('score', '>', score).get();
  const rank = higher.size + 1;

  return { score, totalMarks, percentage, correct, incorrect, unattempted, manualReview, details, rank, autoSubmitted };
});
