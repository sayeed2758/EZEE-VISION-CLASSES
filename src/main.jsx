import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { loginWithEmail, logoutUser, watchAuth } from './services/auth';
import { subscribeStudents, createStudent, updateStudentInCloud, deleteStudentInCloud } from './services/students';
import { subscribeAttendance, saveAttendanceCloud } from './services/attendance';

const CLASS_OPTIONS = ['Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
const CLASS_FEE_DEFAULTS = { 'Class 4': 1000, 'Class 5': 1000, 'Class 6': 1000, 'Class 7': 1200, 'Class 8': 1200, 'Class 9': 1500, 'Class 10': 1500 };
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'];
const RECEIPT_TEACHERS = ['Shahid Sir', 'Enaam Sir', 'Zeeshan Sir', 'Abdur Rahman Sir'];
const BATCH_OPTIONS = ['Morning A', 'Morning B', 'Evening A', 'Evening B'];
const STATUS_OPTIONS = ['Active', 'Inactive'];
const ATTENDANCE_STATUS = ['Present', 'Absent', 'Late'];

const navItems = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'students', label: 'Students', icon: UsersIcon },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheckIcon },
  { id: 'fees', label: 'Fees', icon: ReceiptIcon },
  { id: 'tests', label: 'Tests', icon: ClipboardIcon }
];

const seedStudents = [
  { id: 'EV-1001', name: 'Aarav Kumar', guardian: 'Rajesh Kumar', phone: '9876543210', className: 'Class 10', batch: 'Morning A', monthlyFee: 1500, discount: 0, fee: 'Pending', status: 'Active', joined: '02 Apr 2026' },
  { id: 'EV-1002', name: 'Sana Parveen', guardian: 'Imran Parveen', phone: '9123456780', className: 'Class 10', batch: 'Evening A', monthlyFee: 1500, discount: 200, fee: 'Partial', status: 'Active', joined: '05 Apr 2026' },
  { id: 'EV-1003', name: 'Ritwik Sahu', guardian: 'Manoj Sahu', phone: '9988776655', className: 'Class 9', batch: 'Morning B', monthlyFee: 1500, discount: 0, fee: 'Pending', status: 'Active', joined: '08 Apr 2026' },
  { id: 'EV-1004', name: 'Ayesha Khan', guardian: 'Nadeem Khan', phone: '9012345678', className: 'Class 8', batch: 'Evening B', monthlyFee: 1200, discount: 0, fee: 'Pending', status: 'Active', joined: '12 Apr 2026' },
  { id: 'EV-1005', name: 'Aditya Pradhan', guardian: 'Sanjay Pradhan', phone: '9345678123', className: 'Class 7', batch: 'Morning A', monthlyFee: 1200, discount: 100, fee: 'Partial', status: 'Active', joined: '18 Apr 2026' },
  { id: 'EV-1006', name: 'Meher Fatima', guardian: 'Arif Ali', phone: '9090909090', className: 'Class 6', batch: 'Evening A', monthlyFee: 1000, discount: 0, fee: 'Pending', status: 'Active', joined: '22 Apr 2026' }
];

const emptyForm = {
  name: '', guardian: '', phone: '', className: 'Class 10', batch: 'Morning A', monthlyFee: CLASS_FEE_DEFAULTS['Class 10'], discount: 0, fee: 'Pending', status: 'Active'
};

function App() {
  const [screen, setScreen] = useState('home');
  const [authState, setAuthState] = useState({ status: 'loading', user: null, profile: null, error: null });
  const [dark, setDark] = useState(() => localStorage.getItem('ezee_theme') === 'dark');
  const [now, setNow] = useState(new Date());
  const [students, setStudents] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ezee_students'));
      const raw = Array.isArray(saved) && saved.length ? saved.map(({ attendance, ...student }) => student) : seedStudents;
      return raw.map(student => {
        const fallback = CLASS_FEE_DEFAULTS[student.className] || 1500;
        const monthlyFee = Number(student.monthlyFee ?? student.feeAmount ?? fallback) || fallback;
        const discount = Number(student.discount || 0) || 0;
        return { ...student, monthlyFee, discount };
      });
    } catch {
      return seedStudents;
    }
  });
  const [studentSync, setStudentSync] = useState({ status: 'idle', message: '' });
  const [attendanceSync, setAttendanceSync] = useState({ status: 'idle', message: '' });
  const [attendanceRecords, setAttendanceRecords] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ezee_attendance'));
      return saved && typeof saved === 'object' ? saved : {};
    } catch { return {}; }
  });
  const [studentView, setStudentView] = useState('list');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [modal, setModal] = useState(null);
  const [attendancePrefs, setAttendancePrefs] = useState(() => ({
    date: dateKey(new Date()), className: 'Class 10', batch: 'Morning A', tab: 'daily', month: monthKey(new Date())
  }));
  const [printReport, setPrintReport] = useState(null);
  const [feeRecords, setFeeRecords] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ezee_fee_records'));
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  const [feePrefs, setFeePrefs] = useState(() => ({ month: monthKey(new Date()), className: 'Class 10', batch: 'Morning A', view: 'overview' }));
  const [feeModal, setFeeModal] = useState(null);
  const [tests, setTests] = useState(() => loadStoredArray('ezee_tests'));
  const [testAttempts, setTestAttempts] = useState(() => loadStoredArray('ezee_test_attempts'));
  const [questionBank, setQuestionBank] = useState(() => loadStoredArray('ezee_question_bank'));
  const [testBuilderOpen, setTestBuilderOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('ezee_theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('ezee_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('ezee_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('ezee_fee_records', JSON.stringify(feeRecords));
  }, [feeRecords]);
  useEffect(() => { localStorage.setItem('ezee_tests', JSON.stringify(tests)); }, [tests]);
  useEffect(() => { localStorage.setItem('ezee_test_attempts', JSON.stringify(testAttempts)); }, [testAttempts]);
  useEffect(() => { localStorage.setItem('ezee_question_bank', JSON.stringify(questionBank)); }, [questionBank]);

  useEffect(() => {
    const afterPrint = () => { setPrintReport(null); document.body.classList.remove('printing-receipt','printing-test-results'); };
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  const dateText = useMemo(() => now.toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }), [now]);
  const timeText = useMemo(() => now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  }), [now]);

  const attendanceStatsByStudent = useMemo(() => buildStudentAttendanceStats(students, attendanceRecords), [students, attendanceRecords]);
  const attendanceAverage = useMemo(() => {
    const values = Object.values(attendanceStatsByStudent).map(s => s.percentage).filter(v => v !== null);
    return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : null;
  }, [attendanceStatsByStudent]);

  useEffect(() => watchAuth((next) => setAuthState({ status: next.user ? (next.profile ? 'signedIn' : 'blocked') : 'signedOut', user: next.user, profile: next.profile, error: next.error })), []);

  useEffect(() => {
    if (authState.status !== 'signedIn') {
      setStudentSync({ status: 'idle', message: '' });
      return undefined;
    }
    setStudentSync({ status: 'loading', message: 'Connecting students to Firebase…' });
    const unsubscribe = subscribeStudents(
      (nextStudents) => {
        setStudents(nextStudents);
        setStudentSync({ status: 'synced', message: 'Cloud synced in real time' });
      },
      (error) => {
        console.error('Students sync error', error);
        setStudentSync({ status: 'error', message: 'Could not sync students. Check Firestore Rules.' });
      }
    );
    return unsubscribe;
  }, [authState.status]);

  useEffect(() => {
    if (authState.status !== 'signedIn') {
      setAttendanceSync({ status: 'idle', message: '' });
      return undefined;
    }
    setAttendanceSync({ status: 'loading', message: 'Connecting attendance to Firebase…' });
    const unsubscribe = subscribeAttendance(
      async (nextRecords) => {
        setAttendanceRecords((current) => {
          const localKeys = Object.keys(current || {});
          if (!Object.keys(nextRecords).length && localKeys.length) return current;
          return nextRecords;
        });
        const local = (() => { try { return JSON.parse(localStorage.getItem('ezee_attendance')) || {}; } catch { return {}; } })();
        const migrationKey = 'ezee_attendance_cloud_migrated_v1';
        if (!Object.keys(nextRecords).length && Object.keys(local).length && !localStorage.getItem(migrationKey)) {
          try {
            await Promise.all(Object.entries(local).map(([key, records]) => {
              const [date, className, batch] = key.split('|');
              return saveAttendanceCloud({ date, className, batch, records }, authState.user.uid);
            }));
            localStorage.setItem(migrationKey, '1');
          } catch (error) {
            console.error('Attendance migration error', error);
          }
        }
        setAttendanceSync({ status: 'synced', message: 'Attendance cloud synced in real time' });
      },
      (error) => {
        console.error('Attendance sync error', error);
        setAttendanceSync({ status: 'error', message: 'Could not sync attendance. Check Firestore Rules.' });
      }
    );
    return unsubscribe;
  }, [authState.status]);

  const login = async (email, password) => loginWithEmail(email, password);
  const logout = async () => { await logoutUser(); setScreen('home'); };

  const openStudent = (id) => { setSelectedStudentId(id); setStudentView('detail'); setScreen('students'); };
  const openStudentEdit = (id) => { setSelectedStudentId(id); setModal('edit'); };
  const addStudent = async (payload) => {
    const nextNumber = students.reduce((max, s) => Math.max(max, Number(String(s.id).replace(/\D/g, '')) || 1000), 1000) + 1;
    const nextStudent = { ...payload, monthlyFee: Number(payload.monthlyFee) || CLASS_FEE_DEFAULTS[payload.className] || 0, discount: Number(payload.discount) || 0, id: `EV-${nextNumber}`, joined: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) };
    try {
      await createStudent(nextStudent, authState.user.uid);
      setModal(null);
    } catch (error) {
      console.error(error);
      window.alert('Student could not be saved to Firebase. Please check Firestore Rules and try again.');
    }
  };
  const updateStudent = async (payload) => {
    const nextStudent = { ...payload, monthlyFee: Number(payload.monthlyFee) || 0, discount: Number(payload.discount) || 0 };
    try {
      await updateStudentInCloud(nextStudent, authState.user.uid);
      setModal(null);
    } catch (error) {
      console.error(error);
      window.alert('Student changes could not be saved to Firebase. Please check Firestore Rules and try again.');
    }
  };
  const deleteStudent = async (id) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    if (window.confirm(`Delete ${student.name}? This action cannot be undone.`)) {
      try {
        await deleteStudentInCloud(id);
        setSelectedStudentId(null);
        setStudentView('list');
        const next = { ...attendanceRecords };
        Object.keys(next).forEach(key => { delete next[key][id]; });
        setAttendanceRecords(next);
        setFeeRecords(records => records.filter(r => r.studentId !== id));
      } catch (error) {
        console.error(error);
        window.alert('Student could not be deleted from Firebase. Please try again.');
      }
    }
  };

  const updateAttendancePrefs = (patch) => setAttendancePrefs(prev => ({ ...prev, ...patch }));

  const studentTestId = new URLSearchParams(window.location.search).get('test');
  if (studentTestId) return <StudentTestPortal testId={studentTestId} tests={tests} testAttempts={testAttempts} onAttemptComplete={(attempt) => setTestAttempts(prev => [attempt, ...prev])} />;
  if (authState.status === 'loading') return <AuthLoading dark={dark} setDark={setDark} />;
  if (authState.status === 'signedOut') return <Login onLogin={login} dark={dark} setDark={setDark} />;
  if (authState.status === 'blocked') return <AccessBlocked error={authState.error} email={authState.user?.email} onLogout={logout} dark={dark} setDark={setDark} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-wrap brand-button" onClick={() => setScreen('home')} aria-label="Go home">
          <img className="brand-logo" src="/assets/ezee-vision-logo.png" alt="EZEE VISION" />
          <div><div className="brand-name">EZEE VISION</div><div className="brand-sub">CHAMPUA</div></div>
        </button>
        <div className="top-actions">
          <button className="icon-btn" aria-label="Toggle theme" onClick={() => setDark(v => !v)}>{dark ? <SunIcon /> : <MoonIcon />}</button>
          <button className="avatar" onClick={() => setScreen('profile')} aria-label="Open profile">SS</button>
        </div>
      </header>

      <main className="main-content">
        {screen === 'home' ? <Dashboard dateText={dateText} timeText={timeText} students={students} attendanceStats={attendanceStatsByStudent} attendanceAverage={attendanceAverage} feeRecords={feeRecords} onNavigate={setScreen} /> :
         screen === 'students' ? <StudentsPage students={students} attendanceStats={attendanceStatsByStudent} view={studentView} selectedStudentId={selectedStudentId} onView={openStudent} onEdit={openStudentEdit} onDelete={deleteStudent} onBack={() => { setStudentView('list'); setSelectedStudentId(null); }} onAdd={() => { setModal('add'); setSelectedStudentId(null); }} sync={studentSync} /> :
         screen === 'attendance' ? <AttendancePage students={students} attendanceRecords={attendanceRecords} setAttendanceRecords={setAttendanceRecords} prefs={attendancePrefs} updatePrefs={updateAttendancePrefs} onBack={() => setScreen('home')} onPrint={setPrintReport} userId={authState.user?.uid} sync={attendanceSync} /> :
         screen === 'fees' ? <FeeManager students={students} setStudents={setStudents} feeRecords={feeRecords} setFeeRecords={setFeeRecords} prefs={feePrefs} setPrefs={setFeePrefs} feeModal={feeModal} setFeeModal={setFeeModal} /> :
         screen === 'tests' ? <TestsPage tests={tests} setTests={setTests} testAttempts={testAttempts} questionBank={questionBank} setQuestionBank={setQuestionBank} testBuilderOpen={testBuilderOpen} setTestBuilderOpen={setTestBuilderOpen} editingTestId={editingTestId} setEditingTestId={setEditingTestId} /> :
         screen === 'profile' ? <Profile onLogout={logout} profile={authState.profile} user={authState.user} /> :
         <ModulePlaceholder screen={screen} onBack={() => setScreen('home')} />}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={screen === id ? 'nav-item active' : 'nav-item'} onClick={() => { setScreen(id); if (id === 'students') setStudentView('list'); }}>
            <span className="nav-icon"><Icon /></span><span>{label}</span>
          </button>
        ))}
      </nav>

      {modal === 'add' && <StudentModal title="Add new student" submitLabel="Save student" onClose={() => setModal(null)} onSubmit={addStudent} />}
      {modal === 'edit' && <StudentModal title="Edit student" submitLabel="Save changes" student={students.find(s => s.id === selectedStudentId)} onClose={() => setModal(null)} onSubmit={updateStudent} />}
      {printReport && <PrintReport report={printReport} />}
    </div>
  );
}

function Login({ onLogin, dark, setDark }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    try { await onLogin(email, password); } catch (e) {
      const messages = { 'auth/invalid-credential': 'Incorrect email or password.', 'auth/invalid-email': 'Please enter a valid email address.', 'auth/too-many-requests': 'Too many attempts. Please try again later.', ROLE_NOT_ASSIGNED: 'Your account exists, but an Admin has not assigned your role yet.', ACCOUNT_DISABLED: 'This account has been disabled by the Admin.' };
      setError(messages[e?.code] || 'Unable to sign in. Please try again.');
    } finally { setBusy(false); }
  };
  return <div className="login-page">
    <div className="login-top">
      <div className="brand-wrap"><img className="brand-logo login-logo" src="/assets/ezee-vision-logo.png" alt="EZEE VISION" /><div><div className="brand-name">EZEE VISION</div><div className="brand-sub">CHAMPUA</div></div></div>
      <button className="icon-btn" onClick={() => setDark(v => !v)} aria-label="Toggle theme">{dark ? <SunIcon /> : <MoonIcon />}</button>
    </div>
    <div className="login-hero"><div className="eyebrow"><span className="dot" /> PREMIUM COACHING APP</div><h1>Teach better.<br /><span>Manage smarter.</span></h1><p>One polished app for your coaching institute, teachers and students.</p></div>
    <div className="login-card"><div className="card-kicker">WELCOME BACK</div><h2>Sign in to your app</h2><p className="muted">Sign in with your Firebase account.</p><label>Email</label><input className="field" placeholder="teacher@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /><label>Password</label><div className="password-wrap"><input className="field" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} autoComplete="current-password" /><button type="button" className="eye-btn" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div>{error && <div className="form-error">{error}</div>}<button className="primary-btn full" onClick={submit} disabled={busy}><LockIcon /> {busy ? 'Signing in…' : 'Continue to Dashboard'} <ArrowRightIcon /></button><div className="secure-note"><SparklesIcon /> App-first interface • APK-ready foundation</div></div>
    <div className="login-footer">Made With <span>❤️</span> By Shahid Sir</div>
  </div>;
}


function AuthLoading({ dark, setDark }) { return <div className="login-page"><div className="login-top"><div className="brand-wrap"><img className="brand-logo login-logo" src="/assets/ezee-vision-logo.png" alt="EZEE VISION" /><div><div className="brand-name">EZEE VISION</div><div className="brand-sub">CHAMPUA</div></div></div><button className="icon-btn" onClick={() => setDark(v => !v)} aria-label="Toggle theme">{dark ? <SunIcon /> : <MoonIcon />}</button></div><div className="login-card"><div className="card-kicker">SECURE LOGIN</div><h2>Checking your account…</h2><p className="muted">Connecting securely to EZEE VISION.</p><div className="secure-note"><ShieldCheckIcon /> Firebase Authentication</div></div></div>; }
function AccessBlocked({ error, email, onLogout, dark, setDark }) { const title = error === 'ACCOUNT_DISABLED' ? 'Account disabled' : 'Role not assigned'; const message = error === 'ACCOUNT_DISABLED' ? 'This account has been disabled. Please contact the Admin.' : 'Your Firebase account is created, but your Admin profile is not assigned yet. Ask the Admin to create your users profile with the correct role.'; return <div className="login-page"><div className="login-top"><div className="brand-wrap"><img className="brand-logo login-logo" src="/assets/ezee-vision-logo.png" alt="EZEE VISION" /><div><div className="brand-name">EZEE VISION</div><div className="brand-sub">CHAMPUA</div></div></div><button className="icon-btn" onClick={() => setDark(v => !v)} aria-label="Toggle theme">{dark ? <SunIcon /> : <MoonIcon />}</button></div><div className="login-card"><div className="card-kicker">ACCESS CONTROL</div><h2>{title}</h2><p className="muted">{message}</p>{email && <div className="secure-note"><ShieldCheckIcon /> {email}</div>}<button className="secondary-btn full" onClick={onLogout}><LogOutIcon /> Sign out</button></div></div>; }

function Dashboard({ dateText, timeText, students, attendanceStats, attendanceAverage, feeRecords, onNavigate }) {
  const active = students.filter(s => s.status === 'Active').length;
  const currentMonth = monthKey(new Date());
  const pending = students.filter(s => {
    if (s.status !== 'Active') return false;
    const netFee = Math.max(0, Number(s.monthlyFee || CLASS_FEE_DEFAULTS[s.className] || 0) - Number(s.discount || 0));
    const paid = (feeRecords || []).filter(r => r.studentId === s.id && r.month === currentMonth).reduce((n, r) => n + Number(r.amount || 0), 0);
    return Math.max(0, netFee - paid) > 0;
  }).length;
  return <>
    <section className="hero-card"><div className="hero-copy"><div className="eyebrow light"><span className="dot" /> TEACHER / ADMIN</div><h1>Good evening,<br /><strong>Shahid Sir.</strong></h1><p>{dateText}</p><div className="live-time"><span className="pulse" /> {timeText} <span className="live-label">LIVE</span></div></div><div className="hero-orb"><img src="/assets/ezee-vision-logo.png" alt="EZEE Vision logo" /></div></section>
    <section className="section-block"><div className="section-head"><div><h2>Today at a glance</h2><p className="section-caption">Live figures from your saved student and attendance records.</p></div></div><div className="stats-grid"><Stat value={active} label="Active students" change={`${students.length} total records`} tone="mint" icon={<UsersIcon />} /><Stat value={attendanceAverage ? `${attendanceAverage}%` : '—'} label="Attendance average" change={attendanceAverage ? 'Based on attendance records' : 'No attendance saved yet'} tone="blue" icon={<CalendarCheckIcon />} /><Stat value={pending} label="Fee follow-ups" change="Students with dues" tone="gold" icon={<ReceiptIcon />} /></div></section>
    <section className="section-block"><div className="section-head"><h2>Quick actions</h2></div><div className="quick-grid">
      <QuickAction icon={<UsersIcon />} label="Students" sub="Manage learners" screen="students" tone="mint" onNavigate={onNavigate} />
      <QuickAction icon={<CalendarCheckIcon />} label="Attendance" sub="Mark today" screen="attendance" tone="blue" onNavigate={onNavigate} />
      <QuickAction icon={<ReceiptIcon />} label="Fees" sub="Payments & dues" screen="fees" tone="gold" onNavigate={onNavigate} />
      <QuickAction icon={<ClipboardIcon />} label="Tests" sub="Tests & results" screen="tests" tone="violet" onNavigate={onNavigate} />
    </div></section>
    <section className="two-col"><div className="panel"><div className="section-head"><div><h2>Attendance shortcut</h2><p className="section-caption">Go straight to today and record one attendance per student.</p></div><button className="icon-action" onClick={() => onNavigate('attendance')} aria-label="Open attendance"><ArrowRightIcon /></button></div><div className="attendance-shortcut"><div className="shortcut-icon"><CalendarCheckIcon /></div><div><strong>Attendance Pro</strong><span>Daily • Monthly • A4 export</span></div><button className="secondary-btn compact" onClick={() => onNavigate('attendance')}><CalendarCheckIcon /> Open</button></div></div><div className="panel accent-panel"><div className="card-kicker">PHASE 4</div><h2>Fees are now part of the daily workflow.</h2><p className="muted">Set each student’s monthly amount, apply a fixed discount, collect partial payments and generate branded receipts.</p></div></section>
    <div className="watermark">Made With ❤️ By Shahid Sir</div>
  </>;
}

function Stat({ value, label, change, tone, icon }) { return <div className={`stat-card ${tone}`}><div className="stat-top"><div className="stat-icon">{icon}</div><span className="stat-value">{value}</span></div><div className="stat-label">{label}</div><div className="stat-change">{change}</div></div>; }
function QuickAction({ icon, label, sub, screen, tone, onNavigate }) { return <button className="quick-card" onClick={() => onNavigate(screen)}><span className={`quick-icon ${tone}`}>{icon}</span><span className="quick-text"><strong>{label}</strong><span>{sub}</span></span><span className="arrow"><ChevronRightIcon /></span></button>; }

function StudentsPage({ students, attendanceStats, view, selectedStudentId, onView, onEdit, onDelete, onBack, onAdd, sync }) {
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All classes');
  const [batchFilter, setBatchFilter] = useState('All batches');
  const [statusFilter, setStatusFilter] = useState('All');
  const filtered = students.filter(s => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [s.name, s.id, s.guardian, s.phone].some(v => String(v).toLowerCase().includes(q));
    return matchesQuery && (classFilter === 'All classes' || s.className === classFilter) && (batchFilter === 'All batches' || s.batch === batchFilter) && (statusFilter === 'All' || s.status === statusFilter);
  });

  if (view === 'detail' && selectedStudentId) {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return <section className="empty-detail"><button className="back-btn" onClick={onBack}><ChevronLeftIcon /> Students</button><h1>Student not found</h1></section>;
    return <StudentDetail student={student} attendance={attendanceStats[student.id]} onBack={onBack} onEdit={() => onEdit(student.id)} onDelete={() => onDelete(student.id)} />;
  }

  return <section className="students-page">
    <div className="page-heading"><div><div className="eyebrow"><span className="dot" /> STUDENT MANAGEMENT</div><h1>Students</h1><p>One place for learner profiles, classes and batches.</p></div><button className="primary-btn add-btn" onClick={onAdd}><PlusIcon /> Add student</button></div>
    <div className={`student-cloud-status ${sync?.status || 'idle'}`}><span className="status-icon">{sync?.status === 'loading' ? <ClockIcon /> : sync?.status === 'error' ? <CloseCircleIcon /> : <CheckCircleIcon />}</span><span>{sync?.message || 'Waiting for Firebase…'}</span></div>
    <div className="student-stats"><MiniStat value={students.length} label="Total" icon={<UsersIcon />} /><MiniStat value={students.filter(s => s.status === 'Active').length} label="Active" icon={<CheckCircleIcon />} /><MiniStat value={students.filter(s => s.status === 'Active').filter(s => s.fee !== 'Paid').length} label="Fee follow-ups" icon={<ReceiptIcon />} /></div>
    <div className="students-toolbar panel"><div className="search-box"><SearchIcon /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, ID, guardian or phone" /></div><div className="filter-row"><select value={classFilter} onChange={e => setClassFilter(e.target.value)} aria-label="Filter by class"><option>All classes</option>{CLASS_OPTIONS.map(o => <option key={o}>{o}</option>)}</select><select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} aria-label="Filter by batch"><option>All batches</option>{BATCH_OPTIONS.map(o => <option key={o}>{o}</option>)}</select><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status"><option>All</option>{STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}</select></div></div>
    <div className="student-list-header"><span>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span><span>Tap a card to open profile</span></div>
    <div className="student-grid">{filtered.map(student => <StudentCard key={student.id} student={student} attendance={attendanceStats[student.id]} onOpen={() => onView(student.id)} onEdit={() => onEdit(student.id)} />)}</div>
    {!filtered.length && <div className="empty-state panel"><div className="empty-icon"><SearchIcon /></div><h3>No students found</h3><p>Try a different search or filter.</p></div>}
    <div className="watermark">Made With ❤️ By Shahid Sir</div>
  </section>;
}

function MiniStat({ value, label, icon }) { return <div className="mini-stat"><span className="mini-stat-icon">{icon}</span><div><strong>{value}</strong><span>{label}</span></div></div>; }

function StudentCard({ student, attendance, onOpen, onEdit }) {
  return <article className="student-card panel" onClick={onOpen} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen()}>
    <div className="student-card-top"><div className="student-avatar">{initials(student.name)}</div><div className="student-main"><strong>{student.name}</strong><span>{student.id} • {student.className}</span></div><button className="more-btn" aria-label="Edit student" onClick={e => { e.stopPropagation(); onEdit(); }}><MoreIcon /></button></div>
    <div className="student-meta"><span>{student.batch}</span><span>{student.phone}</span></div>
    <div className="student-card-bottom"><div><small>Attendance</small><strong>{attendance?.percentage === null || attendance?.percentage === undefined ? '—' : `${attendance.percentage}%`}</strong></div><div><small>Monthly fee</small><strong>₹{money(Math.max(0, Number(student.monthlyFee || CLASS_FEE_DEFAULTS[student.className] || 0) - Number(student.discount || 0)))}</strong></div><span className={`status-chip ${student.status.toLowerCase()}`}>{student.status}</span></div>
  </article>;
}

function StudentDetail({ student, attendance, onBack, onEdit, onDelete }) {
  return <section className="detail-page">
    <button className="back-btn" onClick={onBack}><ChevronLeftIcon /> Back to students</button>
    <div className="detail-hero panel"><div className="detail-avatar">{initials(student.name)}</div><div className="detail-title"><div className="eyebrow"><span className="dot" /> STUDENT PROFILE</div><h1>{student.name}</h1><p>{student.id} • {student.className} • {student.batch}</p></div><div className="detail-actions"><button className="secondary-btn" onClick={onEdit}><EditIcon /> Edit</button><button className="danger-btn" onClick={onDelete}><TrashIcon /> Delete</button></div></div>
    <div className="detail-grid"><div className="panel"><div className="section-head"><h2>Profile details</h2></div><InfoRow label="Guardian" value={student.guardian} /><InfoRow label="Phone" value={student.phone} /><InfoRow label="Joined" value={student.joined} /><InfoRow label="Status" value={student.status} /><InfoRow label="Monthly fee" value={`₹${money(student.monthlyFee || 0)}`} /><InfoRow label="Discount" value={`₹${money(student.discount || 0)}`} /></div><div className="panel"><div className="section-head"><h2>Attendance snapshot</h2><span className="pill">Phase 3</span></div><div className="detail-metric"><span>Attendance</span><strong>{attendance?.percentage === null || attendance?.percentage === undefined ? 'No records' : `${attendance.percentage}%`}</strong></div><div className="metric-bar"><span style={{ width: `${Math.min(100, Number(attendance?.percentage) || 0)}%` }} /></div><div className="detail-metric"><span>Present</span><strong>{attendance?.present ?? 0}</strong></div><div className="detail-metric"><span>Absent</span><strong>{attendance?.absent ?? 0}</strong></div><div className="detail-metric"><span>Late</span><strong>{attendance?.late ?? 0}</strong></div><div className="detail-metric"><span>Classes counted</span><strong>{attendance?.total ?? 0}</strong></div></div></div>
    <div className="coming-card"><strong>Attendance is now record-based.</strong><span>Attendance percentage is calculated only from saved daily attendance entries. It can be edited later from Attendance Pro.</span></div>
    <div className="watermark">Made With ❤️ By Shahid Sir</div>
  </section>;
}
function InfoRow({ label, value }) { return <div className="profile-list-row"><span>{label}</span><strong>{value}</strong></div>; }

function StudentModal({ title, submitLabel, student, onClose, onSubmit }) {
  const [form, setForm] = useState(() => student ? { ...student } : { ...emptyForm });
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const changeClass = (value) => {
    setForm(f => ({ ...f, className: value, monthlyFee: student ? f.monthlyFee : (CLASS_FEE_DEFAULTS[value] || f.monthlyFee) }));
  };
  const submit = (e) => { e.preventDefault(); if (!form.name.trim() || !form.guardian.trim() || !/^\d{10}$/.test(form.phone)) return; onSubmit({ ...form, monthlyFee: Math.max(0, Number(form.monthlyFee) || 0), discount: Math.max(0, Number(form.discount) || 0) }); };
  const netFee = Math.max(0, Number(form.monthlyFee) - Number(form.discount || 0));
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal-sheet" role="dialog" aria-modal="true"><div className="modal-head"><div><div className="card-kicker">STUDENT RECORD</div><h2>{title}</h2></div><button className="close-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button></div><form onSubmit={submit}>
    <div className="form-grid"><Field label="Student name" value={form.name} onChange={v => set('name', v)} placeholder="Enter full name" required /><Field label="Guardian name" value={form.guardian} onChange={v => set('guardian', v)} placeholder="Parent / guardian" required /><Field label="Phone" value={form.phone} onChange={v => set('phone', v.replace(/\D/g, '').slice(0,10))} placeholder="10-digit mobile" inputMode="numeric" required /></div>
    <div className="form-grid"><SelectField label="Class" value={form.className} onChange={changeClass} options={CLASS_OPTIONS} /><SelectField label="Batch" value={form.batch} onChange={v => set('batch', v)} options={BATCH_OPTIONS} /><SelectField label="Fee status" value={form.fee} onChange={v => set('fee', v)} options={['Paid','Pending','Partial']} /></div>
    <div className="form-grid"><Field label="Monthly fee (₹)" value={form.monthlyFee} onChange={v => set('monthlyFee', v.replace(/\D/g, '').slice(0,6))} placeholder="Class default" inputMode="numeric" /><Field label="Discount (₹ fixed)" value={form.discount} onChange={v => set('discount', v.replace(/\D/g, '').slice(0,6))} placeholder="0" inputMode="numeric" /><Field label="Net payable (₹)" value={netFee} onChange={() => {}} placeholder="Auto" /></div>
    <div className="form-grid"><SelectField label="Record status" value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} /></div>
    <div className="form-note"><ReceiptIcon /> Monthly fee is stored on the student profile. Discount is a fixed ₹ amount and the net payable is calculated automatically.</div>
    <div className="modal-footer"><button type="button" className="secondary-btn" onClick={onClose}><CloseIcon /> Cancel</button><button type="submit" className="primary-btn"><SaveIcon /> {submitLabel}</button></div>
  </form></div></div>;
}
function Field({ label, value, onChange, placeholder, required, inputMode }) { return <label className="form-field"><span>{label}</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} inputMode={inputMode} /></label>; }
function SelectField({ label, value, onChange, options }) { return <label className="form-field"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select></label>; }

function AttendancePage({ students, attendanceRecords, setAttendanceRecords, prefs, updatePrefs, onBack, onPrint, userId, sync }) {
  const [draft, setDraft] = useState({});
  const [saveMessage, setSaveMessage] = useState('');
  const groupKey = attendanceKey(prefs.date, prefs.className, prefs.batch);
  const selectedStudents = students.filter(s => s.status === 'Active' && s.className === prefs.className && s.batch === prefs.batch);
  const saved = attendanceRecords[groupKey] || {};
  const activeStatuses = Object.values(draft).filter(Boolean);
  const counts = countStatuses(draft);
  const allMarked = selectedStudents.length > 0 && selectedStudents.every(s => draft[s.id]);
  const hasUnsaved = JSON.stringify(normalizeMap(draft)) !== JSON.stringify(normalizeMap(saved));

  useEffect(() => {
    setDraft({ ...(attendanceRecords[groupKey] || {}) });
    setSaveMessage('');
  }, [groupKey, attendanceRecords]);

  const setStatus = (studentId, status) => {
    setDraft(prev => ({ ...prev, [studentId]: status }));
    setSaveMessage('');
  };
  const clearStatus = (studentId) => {
    setDraft(prev => { const next = { ...prev }; delete next[studentId]; return next; });
    setSaveMessage('');
  };
  const save = async () => {
    const normalized = normalizeMap(draft);
    setAttendanceRecords(prev => ({ ...prev, [groupKey]: normalized }));
    try {
      await saveAttendanceCloud({ date: prefs.date, className: prefs.className, batch: prefs.batch, records: normalized }, userId);
      setSaveMessage('Attendance saved to Firebase');
    } catch (error) {
      console.error(error);
      setSaveMessage('Saved locally, but Firebase sync failed');
    }
  };

  const dailyData = useMemo(() => buildDailyReportData(prefs.date, prefs.className, prefs.batch, selectedStudents, draft), [prefs.date, prefs.className, prefs.batch, selectedStudents, draft]);
  const monthlyData = useMemo(() => buildMonthlyReportData(prefs.month, prefs.className, prefs.batch, students, attendanceRecords), [prefs.month, prefs.className, prefs.batch, students, attendanceRecords]);

  const downloadDaily = async () => {
    if (!selectedStudents.length) return;
    const blob = await makeDailyAttendancePng(dailyData);
    downloadBlob(blob, `EZEE-VISION-${slug(prefs.className)}-${slug(prefs.batch)}-${prefs.date}.png`);
  };
  const shareDaily = async () => {
    if (!selectedStudents.length) return;
    const blob = await makeDailyAttendancePng(dailyData);
    const file = new File([blob], `EZEE-VISION-${slug(prefs.className)}-${slug(prefs.batch)}-${prefs.date}.png`, { type: 'image/png' });
    const text = dailyShareText(dailyData);
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try { await navigator.share({ files: [file], title: 'EZEE VISION Daily Attendance', text }); return; } catch { /* cancelled */ }
    }
    downloadBlob(blob, file.name);
  };
  const whatsapp = () => {
    const text = dailyShareText(dailyData);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };
  const printDaily = () => {
    onPrint({ type: 'daily', data: dailyData });
    setTimeout(() => window.print(), 60);
  };
  const downloadMonthly = async () => {
    const blob = await makeMonthlyAttendancePng(monthlyData);
    downloadBlob(blob, `EZEE-VISION-${slug(prefs.className)}-${slug(prefs.batch)}-${prefs.month}.png`);
  };
  const shareMonthly = async () => {
    const blob = await makeMonthlyAttendancePng(monthlyData);
    const file = new File([blob], `EZEE-VISION-${slug(prefs.className)}-${slug(prefs.batch)}-${prefs.month}.png`, { type: 'image/png' });
    const text = monthlyShareText(monthlyData);
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try { await navigator.share({ files: [file], title: 'EZEE VISION Monthly Attendance', text }); return; } catch { /* cancelled */ }
    }
    downloadBlob(blob, file.name);
  };
  const whatsappMonthly = () => window.open(`https://wa.me/?text=${encodeURIComponent(monthlyShareText(monthlyData))}`, '_blank', 'noopener,noreferrer');
  const printMonthly = () => { onPrint({ type: 'monthly', data: monthlyData }); setTimeout(() => window.print(), 60); };

  return <section className="attendance-page">
    <div className="page-heading attendance-heading"><div><div className="eyebrow"><span className="dot" /> ATTENDANCE PRO</div><h1>Attendance</h1><p>One student • one attendance per day • editable later.</p></div><div className="heading-actions"><span className={`role-badge sync-pill ${sync.status}`}><CheckCircleIcon /> {sync.status === "synced" ? "Firebase synced" : sync.status === "loading" ? "Connecting…" : sync.status === "error" ? "Sync error" : "Cloud"}</span><span className="role-badge"><ShieldCheckIcon /> Teacher + Admin</span></div></div>
    <div className="attendance-tabs" role="tablist"><button className={prefs.tab === 'daily' ? 'tab-btn active' : 'tab-btn'} onClick={() => updatePrefs({ tab: 'daily' })}><CalendarCheckIcon /> Daily</button><button className={prefs.tab === 'monthly' ? 'tab-btn active' : 'tab-btn'} onClick={() => updatePrefs({ tab: 'monthly' })}><BarChartIcon /> Monthly</button></div>

    {prefs.tab === 'daily' ? <>
      <div className="attendance-controls panel"><div className="control-title"><div><h2>Daily session</h2><p className="section-caption">Choose the class and batch, then mark every active student.</p></div><span className="pill"><CalendarIcon /> {formatDate(prefs.date)}</span></div><div className="control-grid"><label className="form-field"><span>Date</span><input type="date" value={prefs.date} onChange={e => updatePrefs({ date: e.target.value })} /></label><SelectField label="Class" value={prefs.className} onChange={v => updatePrefs({ className: v })} options={CLASS_OPTIONS} /><SelectField label="Batch" value={prefs.batch} onChange={v => updatePrefs({ batch: v })} options={BATCH_OPTIONS} /></div></div>
      <div className="attendance-summary"><SummaryMetric value={selectedStudents.length} label="Students" icon={<UsersIcon />} /><SummaryMetric value={counts.Present} label="Present" tone="present" icon={<CheckIcon />} /><SummaryMetric value={counts.Absent} label="Absent" tone="absent" icon={<CloseIcon />} /><SummaryMetric value={counts.Late} label="Late" tone="late" icon={<ClockIcon />} /><SummaryMetric value={Math.max(0, selectedStudents.length - activeStatuses.length)} label="Not marked" tone="neutral" icon={<MinusCircleIcon />} /></div>
      <div className="panel attendance-panel"><div className="section-head attendance-list-head"><div><h2>Mark attendance</h2><p className="section-caption">Tap one status for each student. Tap the same status again to keep it; use Clear to remove a mark.</p></div><span className={`save-state ${hasUnsaved ? 'unsaved' : 'saved'}`}>{hasUnsaved ? 'Unsaved changes' : 'Saved'}</span></div>
        {!selectedStudents.length ? <div className="empty-state"><div className="empty-icon"><UsersIcon /></div><h3>No active students in this batch</h3><p>Add or activate students in the selected class and batch first.</p></div> : <div className="attendance-list">{selectedStudents.map((student, index) => <AttendanceRow key={student.id} student={student} index={index + 1} status={draft[student.id]} onStatus={status => setStatus(student.id, status)} onClear={() => clearStatus(student.id)} />)}</div>}
        <div className="save-bar"><div><strong>{allMarked ? 'Ready to save' : `${selectedStudents.length - activeStatuses.length} student${selectedStudents.length - activeStatuses.length === 1 ? '' : 's'} not marked`}</strong><span>{saveMessage || 'Changes are kept here until you save.'}</span></div><button className="primary-btn" disabled={!hasUnsaved || !selectedStudents.length} onClick={save}><SaveIcon /> Save attendance</button></div>
      </div>
      <div className="panel export-panel"><div className="section-head"><div><div className="card-kicker">DAILY EXPORT</div><h2>Share the attendance with parents</h2><p className="section-caption">Professional A4-style report with your EZEE VISION logo, class details and serial numbers.</p></div><div className="export-logo"><img src="/assets/ezee-vision-logo.png" alt="EZEE VISION" /></div></div><div className="export-actions"><button className="secondary-btn" onClick={downloadDaily}><DownloadIcon /> Export PNG</button><button className="secondary-btn" onClick={printDaily}><PrinterIcon /> Print / Save PDF</button><button className="share-btn" onClick={shareDaily}><ShareIcon /> Share report</button><button className="whatsapp-btn" onClick={whatsapp}><WhatsAppIcon /> WhatsApp</button></div><p className="export-note">PNG is designed for easy phone sharing. Print / Save PDF uses A4 portrait settings.</p></div>
      <div className="watermark">Made With ❤️ By Shahid Sir</div>
    </> : <MonthlyAttendanceReport data={monthlyData} prefs={prefs} updatePrefs={updatePrefs} onDownload={downloadMonthly} onShare={shareMonthly} onWhatsApp={whatsappMonthly} onPrint={printMonthly} />}
    <button className="back-btn attendance-back" onClick={onBack}><ChevronLeftIcon /> Back to dashboard</button>
  </section>;
}

function AttendanceRow({ student, index, status, onStatus, onClear }) {
  return <div className="attendance-row"><div className="attendance-student"><span className="serial">{index}</span><div className="mini-avatar">{initials(student.name)}</div><div className="student-main"><strong>{student.name}</strong><span>{student.id} • {student.className} • {student.batch}</span></div></div><div className="status-actions"><StatusButton type="Present" active={status === 'Present'} onClick={() => onStatus('Present')} /><StatusButton type="Absent" active={status === 'Absent'} onClick={() => onStatus('Absent')} /><StatusButton type="Late" active={status === 'Late'} onClick={() => onStatus('Late')} /><button className="clear-status" onClick={onClear} aria-label={`Clear attendance for ${student.name}`}><CloseIcon /></button></div></div>;
}
function StatusButton({ type, active, onClick }) { const data = { Present: { icon: CheckIcon, tone: 'present' }, Absent: { icon: CloseIcon, tone: 'absent' }, Late: { icon: ClockIcon, tone: 'late' } }[type]; const Icon = data.icon; return <button className={`status-btn ${data.tone} ${active ? 'active' : ''}`} onClick={onClick}><Icon /><span>{type}</span></button>; }
function SummaryMetric({ value, label, tone = 'neutral', icon }) { return <div className={`summary-metric ${tone}`}><span className="summary-icon">{icon}</span><div><strong>{value}</strong><span>{label}</span></div></div>; }

function MonthlyAttendanceReport({ data, prefs, updatePrefs, onDownload, onShare, onWhatsApp, onPrint }) {
  return <div className="monthly-report">
    <div className="monthly-controls panel"><div><div className="card-kicker">MONTHLY ATTENDANCE</div><h2>Class-wise monthly report</h2><p className="section-caption">Attendance only — ready to share with the selected class/batch group.</p></div><div className="control-grid"><label className="form-field"><span>Month</span><input type="month" value={prefs.month} onChange={e => updatePrefs({ month: e.target.value })} /></label><SelectField label="Class" value={prefs.className} onChange={v => updatePrefs({ className: v })} options={CLASS_OPTIONS} /><SelectField label="Batch" value={prefs.batch} onChange={v => updatePrefs({ batch: v })} options={BATCH_OPTIONS} /></div></div>
    <div className="attendance-summary monthly-summary"><SummaryMetric value={data.heldDates.length} label="Total classes" icon={<CalendarDaysIcon />} /><SummaryMetric value={data.totalPresent} label="Present" tone="present" icon={<CheckIcon />} /><SummaryMetric value={data.totalAbsent} label="Absent" tone="absent" icon={<CloseIcon />} /><SummaryMetric value={data.totalLate} label="Late" tone="late" icon={<ClockIcon />} /><SummaryMetric value={data.averagePercentage === null ? '—' : `${data.averagePercentage}%`} label="Average" tone="blue" icon={<BarChartIcon />} /></div>
    <div className="panel"><div className="section-head"><div><h2>Student-wise attendance</h2><p className="section-caption">Present, absent, late, total class sessions and percentage.</p></div><span className="pill"><CalendarIcon /> {data.monthLabel}</span></div><div className="monthly-student-list">{data.students.map((student, i) => <div className="monthly-student-row" key={student.id}><span className="serial">{i + 1}</span><div className="mini-avatar">{initials(student.name)}</div><div className="monthly-student-name"><strong>{student.name}</strong><span>{student.id}</span></div><MetricCell label="Present" value={student.present} tone="present" /><MetricCell label="Absent" value={student.absent} tone="absent" /><MetricCell label="Late" value={student.late} tone="late" /><MetricCell label="Classes" value={student.total} /><MetricCell label="Attendance" value={student.percentage === null ? '—' : `${student.percentage}%`} tone="percentage" /></div>)}</div>{!data.students.length && <div className="empty-state"><div className="empty-icon"><UsersIcon /></div><h3>No active students in this batch</h3><p>Add students to this class and batch to see the monthly report.</p></div>}</div>
    <div className="panel calendar-panel"><div className="section-head"><div><h2>Date-wise calendar</h2><p className="section-caption">A day counts as a class only when attendance has been saved for that class and batch.</p></div><div className="calendar-legend"><span><i className="legend-held" /> Held</span><span><i className="legend-empty" /> No entry</span></div></div><div className="month-calendar">{data.calendar.map(day => <div key={day.date} className={`calendar-day ${day.held ? 'held' : ''}`}><strong>{day.day}</strong><span>{day.weekday}</span>{day.held ? <small>P {day.present} · A {day.absent} · L {day.late}</small> : <small>—</small>}</div>)}</div></div>
    <div className="panel export-panel monthly-export"><div><div className="card-kicker">ATTENDANCE ONLY</div><h2>Share this monthly report</h2><p className="section-caption">Includes only attendance data for the selected class and batch.</p></div><div className="export-actions"><button className="secondary-btn" onClick={onDownload}><DownloadIcon /> Export PNG</button><button className="secondary-btn" onClick={onPrint}><PrinterIcon /> Print / Save PDF</button><button className="share-btn" onClick={onShare}><ShareIcon /> Share report</button><button className="whatsapp-btn" onClick={onWhatsApp}><WhatsAppIcon /> WhatsApp</button></div></div>
  </div>;
}
function MetricCell({ label, value, tone }) { return <div className={`metric-cell ${tone || ''}`}><small>{label}</small><strong>{value}</strong></div>; }

function FeeManager({ students, setStudents, feeRecords, setFeeRecords, prefs, setPrefs, feeModal, setFeeModal }) {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [receiptDraft, setReceiptDraft] = useState(null);
  const [query, setQuery] = useState('');
  const activeStudents = students.filter(s => s.status === 'Active');
  const monthStudents = activeStudents.filter(s => (!prefs.className || s.className === prefs.className) && (!prefs.batch || s.batch === prefs.batch));
  const summaries = useMemo(() => feeSummaryForStudents(monthStudents, prefs.month, feeRecords), [monthStudents, prefs.month, feeRecords]);
  const totalDue = summaries.reduce((n, s) => n + s.netFee, 0);
  const totalPaid = summaries.reduce((n, s) => n + s.paid, 0);
  const totalPending = summaries.reduce((n, s) => n + s.balance, 0);
  const partialCount = summaries.filter(s => s.status === 'Partial').length;
  const pendingCount = summaries.filter(s => s.status === 'Pending').length;
  const paidCount = summaries.filter(s => s.status === 'Paid').length;
  const filtered = summaries.filter(s => {
    const q = query.trim().toLowerCase();
    return !q || [s.student.name, s.student.id, s.student.guardian, s.student.phone].some(v => String(v).toLowerCase().includes(q));
  });
  const selected = students.find(s => s.id === selectedStudentId);
  const monthLabelText = monthLabel(prefs.month);

  const collect = (student) => setFeeModal({ type: 'collect', studentId: student.id, month: prefs.month });
  const editFee = (student) => { setSelectedStudentId(student.id); setFeeModal({ type: 'profile', studentId: student.id }); };
  const savePayment = (payload) => {
    const baseFee = Number(payload.student.monthlyFee || CLASS_FEE_DEFAULTS[payload.student.className] || 0);
    const discount = Number(payload.student.discount || 0);
    const netFee = Math.max(0, baseFee - discount);
    const currentPaid = feeRecords.filter(r => r.studentId === payload.student.id && r.month === payload.month).reduce((n, r) => n + Number(r.amount || 0), 0);
    const balanceBefore = Math.max(0, netFee - currentPaid);
    const amount = Math.min(balanceBefore, Math.max(0, Number(payload.amount) || 0));
    if (!amount || amount > balanceBefore) return;
    const payment = { id: `PAY-${Date.now()}`, studentId: payload.student.id, month: payload.month, amount, paymentMethod: payload.paymentMethod, date: payload.date, teacher: payload.teacher, receiptNo: payload.receiptNo, note: payload.note || '', baseFee, discount, netFee, balanceAfter: Math.max(0, netFee - currentPaid - amount) };
    setFeeRecords(prev => [...prev, payment]);
    setStudents(prev => prev.map(s => s.id === payload.student.id ? { ...s, fee: currentPaid + amount >= netFee ? 'Paid' : 'Partial' } : s));
    setFeeModal(null);
    setReceiptDraft({ payment, student: payload.student });
  };
  const saveProfileFee = (payload) => {
    setStudents(prev => prev.map(s => s.id === payload.studentId ? { ...s, monthlyFee: Math.max(0, Number(payload.monthlyFee) || 0), discount: Math.max(0, Number(payload.discount) || 0) } : s));
    setFeeModal(null);
  };
  const printReceipt = (payment, student) => { setReceiptDraft({ payment, student }); document.body.classList.add('printing-receipt'); setTimeout(() => window.print(), 100); };
  const shareReceipt = async (payment, student) => {
    const text = receiptShareText(payment, student);
    if (navigator.share) { try { await navigator.share({ title: `Receipt ${payment.receiptNo}`, text }); return; } catch {} }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };
  const currentTransactions = feeRecords.filter(r => r.month === prefs.month && monthStudents.some(s => s.id === r.studentId)).sort((a,b) => String(b.date).localeCompare(String(a.date)));

  return <section className="fees-page">
    <div className="page-heading"><div><div className="eyebrow"><span className="dot" /> FEE MANAGER</div><h1>Fees</h1><p>Monthly collection, student-wise dues and branded receipts.</p></div><button className="primary-btn add-btn" onClick={() => setFeeModal({ type: 'collect', studentId: monthStudents[0]?.id || null, month: prefs.month })} disabled={!monthStudents.length}><ReceiptIcon /> Collect fee</button></div>
    <div className="fee-summary-grid">
      <MiniStat value={`₹${money(totalDue)}`} label="Monthly net due" icon={<WalletIcon />} />
      <MiniStat value={`₹${money(totalPaid)}`} label="Collected" icon={<CheckCircleIcon />} />
      <MiniStat value={`₹${money(totalPending)}`} label="Pending balance" icon={<ClockIcon />} />
      <MiniStat value={`${paidCount}/${summaries.length}`} label="Paid students" icon={<UsersIcon />} />
    </div>
    <div className="panel fee-controls"><div className="control-grid"><label className="form-field"><span>Month</span><input type="month" value={prefs.month} onChange={e => setPrefs(p => ({ ...p, month: e.target.value }))} /></label><SelectField label="Class" value={prefs.className} onChange={v => setPrefs(p => ({ ...p, className: v }))} options={CLASS_OPTIONS} /><SelectField label="Batch" value={prefs.batch} onChange={v => setPrefs(p => ({ ...p, batch: v }))} options={BATCH_OPTIONS} /></div></div>
    <div className="fee-tabs"><button className={prefs.view==='overview'?'tab-btn active':'tab-btn'} onClick={() => setPrefs(p => ({...p,view:'overview'}))}><BarChartIcon /> Overview</button><button className={prefs.view==='ledger'?'tab-btn active':'tab-btn'} onClick={() => setPrefs(p => ({...p,view:'ledger'}))}><ReceiptIcon /> Ledger</button><button className={prefs.view==='structure'?'tab-btn active':'tab-btn'} onClick={() => setPrefs(p => ({...p,view:'structure'}))}><WalletIcon /> Fee structure</button></div>
    {prefs.view === 'overview' && <>
      <div className="fee-overview-grid">
        <div className="panel"><div className="section-head"><div><div className="card-kicker">MONTHLY COLLECTION</div><h2>{monthLabelText}</h2><p className="section-caption">Due date is the 10th of every month. No late fee is applied.</p></div><span className="pill"><CalendarIcon /> 10th due</span></div><div className="fee-status-bars"><div><span>Paid</span><strong>{paidCount}</strong></div><div><span>Partial</span><strong>{partialCount}</strong></div><div><span>Pending</span><strong>{pendingCount}</strong></div></div><div className="collection-progress"><span style={{width:`${totalDue ? Math.min(100, totalPaid/totalDue*100) : 0}%`}} /></div><div className="collection-progress-meta"><span>₹{money(totalPaid)} collected</span><strong>{totalDue ? Math.round(totalPaid/totalDue*100) : 0}%</strong></div></div>
        <div className="panel fee-class-card"><div className="card-kicker">CLASS DEFAULTS</div><h2>Monthly fee benchmark</h2><div className="class-fee-mini-grid">{CLASS_OPTIONS.map(c => <div key={c}><span>{c.replace('Class ','Class ')}</span><strong>₹{money(CLASS_FEE_DEFAULTS[c])}</strong></div>)}</div><p className="form-note"><EditIcon /> Individual monthly amount and fixed discount are controlled from each student profile.</p></div>
      </div>
      <div className="panel"><div className="section-head"><div><h2>Student fee ledger</h2><p className="section-caption">Collect exactly the remaining balance, including partial payments.</p></div><div className="search-box fee-search"><SearchIcon /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search student, ID, guardian or phone" /></div></div><FeeStudentTable rows={filtered} month={prefs.month} onCollect={collect} onEdit={editFee} onReceipt={payment => { const stu = students.find(s => s.id === payment.studentId); setReceiptDraft({payment, student:stu}); }} /></div>
    </>}
    {prefs.view === 'ledger' && <div className="panel"><div className="section-head"><div><div className="card-kicker">PAYMENT HISTORY</div><h2>{monthLabelText} transactions</h2><p className="section-caption">Every installment is kept separately for full payment history.</p></div></div><div className="payment-list">{currentTransactions.length ? currentTransactions.map(p => { const s = students.find(st => st.id === p.studentId); return <div className="payment-row" key={p.id}><div className="payment-method-icon"><PaymentMethodIcon method={p.paymentMethod} /></div><div className="payment-main"><strong>{s?.name || p.studentId}</strong><span>{p.receiptNo} • {formatDate(p.date)} • {p.teacher}</span></div><div className="payment-amount"><strong>₹{money(p.amount)}</strong><span>{p.paymentMethod}</span></div><button className="icon-action" onClick={() => setReceiptDraft({payment:p, student:s})} aria-label="Open receipt"><ReceiptIcon /></button></div> }) : <div className="empty-state"><div className="empty-icon"><ReceiptIcon /></div><h3>No payments in this month</h3><p>Collected payments will appear here with their receipt numbers.</p></div>}</div></div>}
    {prefs.view === 'structure' && <div className="panel"><div className="section-head"><div><div className="card-kicker">FEE STRUCTURE</div><h2>Class-wise default monthly fees</h2><p className="section-caption">These are the defaults you provided. Student profiles may override the amount.</p></div></div><div className="fee-structure-table">{CLASS_OPTIONS.map(c => <div className="fee-structure-row" key={c}><div className="fee-class-icon"><WalletIcon /></div><strong>{c}</strong><span>₹{money(CLASS_FEE_DEFAULTS[c])} / month</span></div>)}</div></div>}
    <div className="watermark">Made With ❤️ By Shahid Sir</div>
    {feeModal?.type === 'collect' && <FeeCollectModal students={monthStudents} month={feeModal.month} defaultStudentId={feeModal.studentId} feeRecords={feeRecords} onClose={() => setFeeModal(null)} onSubmit={savePayment} />}
    {feeModal?.type === 'profile' && selected && <FeeProfileModal student={selected} onClose={() => setFeeModal(null)} onSubmit={saveProfileFee} />}
    {receiptDraft && <ReceiptPreview payment={receiptDraft.payment} student={receiptDraft.student} onClose={() => setReceiptDraft(null)} onPrint={printReceipt} onShare={shareReceipt} />}
  </section>;
}

function FeeStudentTable({ rows, month, onCollect, onEdit, onReceipt }) {
  return <div className="fee-student-list">{rows.length ? rows.map((row, i) => <div className="fee-student-row" key={row.student.id}><div className="serial">{i+1}</div><div className="mini-avatar">{initials(row.student.name)}</div><div className="fee-student-main"><strong>{row.student.name}</strong><span>{row.student.id} • {row.student.className} • {row.student.batch}</span></div><div className="fee-money"><small>Net</small><strong>₹{money(row.netFee)}</strong></div><div className="fee-money"><small>Paid</small><strong className="paid-text">₹{money(row.paid)}</strong></div><div className="fee-money"><small>Balance</small><strong className={row.balance ? 'pending-text' : 'paid-text'}>₹{money(row.balance)}</strong></div><span className={`fee-badge ${row.status.toLowerCase()}`}>{row.status}</span><div className="fee-row-actions">{row.balance > 0 ? <button className="primary-btn compact" onClick={() => onCollect(row.student)}><ReceiptIcon /> Collect</button> : <button className="secondary-btn compact" disabled={!row.transactions.length} onClick={() => onReceipt(row.transactions[row.transactions.length-1])}><ReceiptIcon /> Receipt</button>}<button className="icon-action" onClick={() => onEdit(row.student)} aria-label="Edit fee profile"><EditIcon /></button></div></div>) : <div className="empty-state"><div className="empty-icon"><UsersIcon /></div><h3>No students in this class and batch</h3><p>Choose another filter or add active students.</p></div>}</div>;
}

function FeeCollectModal({ students, month, defaultStudentId, feeRecords, onClose, onSubmit }) {
  const defaultStudent = students.find(s => s.id === defaultStudentId) || students[0];
  const [studentId, setStudentId] = useState(defaultStudent?.id || '');
  const student = students.find(s => s.id === studentId) || defaultStudent;
  const alreadyPaid = student ? feeRecords.filter(r => r.studentId === student.id && r.month === month).reduce((n, r) => n + Number(r.amount || 0), 0) : 0;
  const netFee = student ? Math.max(0, Number(student.monthlyFee || CLASS_FEE_DEFAULTS[student.className] || 0) - Number(student.discount || 0)) : 0;
  const balance = Math.max(0, netFee - alreadyPaid);
  const [amount, setAmount] = useState(balance ? String(balance) : '');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [date, setDate] = useState(dateKey(new Date()));
  const [teacher, setTeacher] = useState(RECEIPT_TEACHERS[0]);
  const [receiptNo, setReceiptNo] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { setAmount(balance ? String(balance) : ''); }, [studentId, month, balance]);
  if (!student) return <div className="modal-backdrop"><div className="modal-sheet"><div className="modal-head"><h2>No student available</h2><button className="close-btn" onClick={onClose}><CloseIcon /></button></div><p className="muted">Add an active student in this class and batch first.</p></div></div>;
  const submit = e => { e.preventDefault(); const value = Number(amount) || 0; if (!value || value > balance) return; if (!receiptNo.trim()) return; onSubmit({ student, month, amount:value, paymentMethod, date, teacher, receiptNo: receiptNo.trim(), note }); };
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal-sheet fee-modal-sheet"><div className="modal-head"><div><div className="card-kicker">COLLECT FEE</div><h2>{student.name}</h2></div><button className="close-btn" onClick={onClose}><CloseIcon /></button></div><form onSubmit={submit}><div className="fee-collect-top"><div className="mini-avatar big">{initials(student.name)}</div><div><strong>{student.id}</strong><span>{student.className} • {student.batch}</span></div><div className="balance-highlight"><small>Balance</small><strong>₹{money(balance)}</strong></div></div><div className="form-grid"><SelectField label="Student" value={studentId} onChange={setStudentId} options={students.map(s => s.id)} /><Field label="Payment amount (₹)" value={amount} onChange={v => setAmount(v.replace(/\D/g,'').slice(0,6))} placeholder="Enter amount" inputMode="numeric" required /><SelectField label="Payment method" value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHODS} /></div><div className="form-grid"><Field label="Payment date" value={date} onChange={setDate} placeholder="YYYY-MM-DD" required /><SelectField label="Receipt authorized by" value={teacher} onChange={setTeacher} options={RECEIPT_TEACHERS} /><Field label="Receipt number" value={receiptNo} onChange={setReceiptNo} placeholder="Enter your receipt format" required /></div><div className="form-grid"><Field label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. August fee" /><Field label="Monthly net fee" value={netFee} onChange={() => {}} placeholder="Auto" /></div><div className="form-note"><ReceiptIcon /> Due date: 10th • No late fee • Partial payments are supported • Receipt uses landscape blue & white design.</div><div className="modal-footer"><button type="button" className="secondary-btn" onClick={onClose}><CloseIcon /> Cancel</button><button className="primary-btn" type="submit"><ReceiptIcon /> Save & generate receipt</button></div></form></div></div>;
}

function FeeProfileModal({ student, onClose, onSubmit }) {
  const [monthlyFee, setMonthlyFee] = useState(String(student.monthlyFee || CLASS_FEE_DEFAULTS[student.className] || 0));
  const [discount, setDiscount] = useState(String(student.discount || 0));
  const net = Math.max(0, Number(monthlyFee) - Number(discount));
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal-sheet"><div className="modal-head"><div><div className="card-kicker">FEE PROFILE</div><h2>{student.name}</h2></div><button className="close-btn" onClick={onClose}><CloseIcon /></button></div><div className="form-grid"><Field label="Monthly fee (₹)" value={monthlyFee} onChange={v => setMonthlyFee(v.replace(/\D/g,''))} placeholder="Amount" inputMode="numeric" /><Field label="Discount (₹ fixed)" value={discount} onChange={v => setDiscount(v.replace(/\D/g,''))} placeholder="0" inputMode="numeric" /><Field label="Net payable (₹)" value={net} onChange={() => {}} placeholder="Auto" /></div><div className="form-note"><WalletIcon /> Example: Class 10 default ₹1500, ₹200 fixed discount → monthly net ₹1300.</div><div className="modal-footer"><button className="secondary-btn" onClick={onClose}><CloseIcon /> Cancel</button><button className="primary-btn" onClick={() => onSubmit({ studentId:student.id, monthlyFee, discount })}><SaveIcon /> Save fee profile</button></div></div></div>;
}

function ReceiptPreview({ payment, student, onClose, onPrint, onShare }) {
  const balanceAfter = Number(payment.balanceAfter || 0);
  return <div className="receipt-overlay"><div className="receipt-modal"><div className="receipt-toolbar"><div><div className="card-kicker">BRANDED RECEIPT</div><h2>Receipt preview</h2><p className="section-caption">Landscape print-ready • Blue & White • stylized handwritten authorization.</p></div><button className="close-btn" onClick={onClose}><CloseIcon /></button></div><ReceiptCard payment={payment} student={student} balanceAfter={balanceAfter} /><div className="receipt-actions"><button className="primary-btn" onClick={() => onPrint(payment, student)}><PrinterIcon /> Print / Save PDF</button><button className="share-btn" onClick={() => onShare(payment, student)}><ShareIcon /> Share</button><button className="whatsapp-btn" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(receiptShareText(payment, student))}`, '_blank')}><WhatsAppIcon /> WhatsApp</button><button className="secondary-btn" onClick={onClose}><CloseIcon /> Close</button></div></div></div>;
}

function ReceiptCard({ payment, student, balanceAfter }) {
  return <div className="receipt-card" id="printable-receipt"><div className="receipt-topline"></div><div className="receipt-header"><img src="/assets/ezee-vision-logo.png" alt="EZEE VISION" /><div className="receipt-brand"><div className="receipt-institute">EZEE VISION CHAMPUA</div><div className="receipt-address">COACHING & LEARNING CENTRE</div><div className="receipt-title">FEE PAYMENT RECEIPT</div></div><div className="receipt-number"><span>Receipt No.</span><strong>{payment.receiptNo}</strong><span>{formatDate(payment.date)}</span></div></div><div className="receipt-meta-grid"><div><span>Student</span><strong>{student.name}</strong></div><div><span>Student ID</span><strong>{student.id}</strong></div><div><span>Guardian</span><strong>{student.guardian}</strong></div><div><span>Class / Batch</span><strong>{student.className} / {student.batch}</strong></div></div><table className="receipt-table"><thead><tr><th>Description</th><th>Monthly Fee</th><th>Discount</th><th>Net Fee</th><th>Paid Now</th><th>Balance</th></tr></thead><tbody><tr><td>{monthLabel(payment.month)} tuition fee</td><td>₹{money(payment.baseFee)}</td><td>₹{money(payment.discount)}</td><td>₹{money(payment.netFee)}</td><td className="receipt-paid">₹{money(payment.amount)}</td><td className={balanceAfter?'receipt-balance':''}>₹{money(balanceAfter)}</td></tr></tbody></table><div className="receipt-footer-grid"><div><span>Payment method</span><strong><PaymentMethodIcon method={payment.paymentMethod} /> {payment.paymentMethod}</strong><small>Payment date: {formatDate(payment.date)}</small></div><div><span>Amount in words</span><strong>{amountInWords(payment.amount)}</strong><small>{payment.note || 'Thank you for your payment.'}</small></div><div className="signature-block"><div className="signature-script">{payment.teacher}</div><div className="signature-line"></div><span>Authorized signature</span></div></div><div className="receipt-bottom"><span>Generated for {student.name}</span><strong>Made With ❤️ By Shahid Sir</strong></div></div>;
}

function feeSummaryForStudents(students, month, feeRecords) {
  return students.map(student => {
    const baseFee = Number(student.monthlyFee || CLASS_FEE_DEFAULTS[student.className] || 0);
    const discount = Number(student.discount || 0);
    const netFee = Math.max(0, baseFee - discount);
    const transactions = feeRecords.filter(r => r.studentId === student.id && r.month === month).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const paid = transactions.reduce((n,r)=>n+Number(r.amount||0),0);
    const balance = Math.max(0, netFee - paid);
    const status = balance === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';
    return { student, baseFee, discount, netFee, paid, balance, status, transactions };
  });
}
function receiptShareText(payment, student) { return `EZEE VISION CHAMPUA\nFee Payment Receipt ${payment.receiptNo}\nStudent: ${student.name}\nClass: ${student.className} • ${student.batch}\nMonth: ${monthLabel(payment.month)}\nPaid: ₹${money(payment.amount)}\nMethod: ${payment.paymentMethod}`; }
function money(value) { return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function amountInWords(value) { const n = Number(value || 0); if (n===0) return 'Zero rupees only'; return `${numberWords(n)} rupees only`; }
function numberWords(n) { const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']; const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']; const two=(x)=>x<20?ones[x]:tens[Math.floor(x/10)]+(x%10?' '+ones[x%10]:''); if(n<20)return ones[n]; if(n<100)return two(n); if(n<1000)return `${ones[Math.floor(n/100)]} Hundred${n%100?' '+two(n%100):''}`; if(n<100000)return `${two(Math.floor(n/1000))} Thousand${n%1000?' '+numberWords(n%1000):''}`; if(n<10000000)return `${two(Math.floor(n/100000))} Lakh${n%100000?' '+numberWords(n%100000):''}`; return `${two(Math.floor(n/10000000))} Crore${n%10000000?' '+numberWords(n%10000000):''}`; }
function WalletIcon(){return <Svg><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V19a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V6.5Z"/><path d="M4 7h14.5A1.5 1.5 0 0 1 20 8.5v3.3H15a2.5 2.5 0 0 0 0 5h5"/><circle cx="15" cy="14.3" r=".7" fill="currentColor" stroke="none"/></Svg>}
function PaymentMethodIcon({ method }) { if(method==='UPI') return <UpiIcon />; if(method==='Bank Transfer') return <BankIcon />; if(method==='Other') return <MoreIcon />; return <CashIcon />; }
function CashIcon(){return <Svg><rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.4"/><path d="M6 10h.01M18 14h.01"/></Svg>}
function UpiIcon(){return <Svg><path d="M7 3.8h4.5l-2 6.4h3l-5.2 9.9 1.5-7H6l1-9.3Z"/><path d="M14.5 6h4v12h-7"/></Svg>}
function BankIcon(){return <Svg><path d="m4 9 8-4 8 4M5 10h14M6 11v7M10 11v7M14 11v7M18 11v7M4 20h16"/></Svg>}

function TestsPage({ tests, setTests, testAttempts, questionBank, setQuestionBank, testBuilderOpen, setTestBuilderOpen, editingTestId, setEditingTestId }) {
  const [tab, setTab] = useState('tests');
  const [query, setQuery] = useState('');
  const [filterClass, setFilterClass] = useState('All classes');
  const [filterSubject, setFilterSubject] = useState('All subjects');
  const [bankModal, setBankModal] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const filteredTests = tests.filter(t => (!query.trim() || `${t.title} ${t.subject} ${t.topic} ${t.className}`.toLowerCase().includes(query.trim().toLowerCase())) && (filterClass === 'All classes' || t.className === filterClass) && (filterSubject === 'All subjects' || t.subject === filterSubject));
  const sortedAttempts = [...testAttempts].sort((a,b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));

  const openCreate = (seedQuestion = null) => { setEditingTestId(null); setTestBuilderOpen(true); if (seedQuestion) window.__ezee_test_seed_question = seedQuestion; else window.__ezee_test_seed_question = null; };
  const openEdit = id => { setEditingTestId(id); setTestBuilderOpen(true); };
  const removeTest = id => { const t=tests.find(x=>x.id===id); if(!t)return; if(confirm(`Delete ${t.title}? This will not delete previous attempt records.`)) setTests(prev=>prev.filter(x=>x.id!==id)); };
  const copyLink = async t => { const link=testLink(t.id); try { await navigator.clipboard.writeText(link); alert('Test link copied.'); } catch { prompt('Copy this test link:', link); } };
  const shareWhatsApp = t => window.open(`https://wa.me/?text=${encodeURIComponent(`EZEE VISION CHAMPUA\n${t.title}\nClass: ${t.className}\nSubject: ${t.subject}\nTest Link: ${testLink(t.id)}`)}`,'_blank');

  return <section className="tests-page">
    <div className="page-heading"><div><div className="eyebrow"><span className="dot" /> TEST & EXAM CENTRE</div><h1>Tests</h1><p>Create, publish and share tests with a private student-only test link.</p></div><button className="primary-btn add-btn" onClick={() => openCreate()}><PlusIcon /> Create test</button></div>
    <div className="test-tabs"><button className={tab==='tests'?'active':''} onClick={()=>setTab('tests')}><ClipboardIcon /> Tests</button><button className={tab==='bank'?'active':''} onClick={()=>setTab('bank')}><LibraryIcon /> Question bank</button><button className={tab==='results'?'active':''} onClick={()=>setTab('results')}><BarChartIcon /> Results</button></div>

    {tab==='tests' && <>
      <div className="test-toolbar panel"><div className="search-box"><SearchIcon /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tests, subject or topic" /></div><div className="filter-row"><select value={filterClass} onChange={e=>setFilterClass(e.target.value)}><option>All classes</option>{CLASS_OPTIONS.map(c=><option key={c}>{c}</option>)}</select><select value={filterSubject} onChange={e=>setFilterSubject(e.target.value)}><option>All subjects</option>{['SST','SCIENCE','MATH','ENGLISH'].map(s=><option key={s}>{s}</option>)}</select></div></div>
      <div className="test-summary-grid"><MiniStat value={tests.length} label="Tests" icon={<ClipboardIcon />} /><MiniStat value={tests.filter(t=>t.type==='Live Test').length} label="Live tests" icon={<RadioIcon />} /><MiniStat value={testAttempts.length} label="Attempts" icon={<TargetIcon />} /></div>
      <div className="test-list">{filteredTests.map(t=><TestCard key={t.id} test={t} attempts={testAttempts.filter(a=>a.testId===t.id)} onEdit={()=>openEdit(t.id)} onDelete={()=>removeTest(t.id)} onCopy={()=>copyLink(t)} onWhatsApp={()=>shareWhatsApp(t)} onResults={()=>setTab('results')} />)}</div>
      {!filteredTests.length && <div className="empty-state panel"><div className="empty-icon"><ClipboardIcon /></div><h3>No tests yet</h3><p>Create your first test and generate a private student link.</p><button className="secondary-btn" onClick={()=>openCreate()}><PlusIcon /> Create test</button></div>}
    </>}

    {tab==='bank' && <QuestionBankPage questionBank={questionBank} setQuestionBank={setQuestionBank} onCreateFromQuestion={q=>openCreate(q)} onDelete={id=>setQuestionBank(prev=>prev.filter(q=>q.id!==id))} />}
    {tab==='results' && <ResultsPage tests={tests} attempts={sortedAttempts} />}

    {testBuilderOpen && <TestBuilderModal tests={tests} setTests={setTests} questionBank={questionBank} setQuestionBank={setQuestionBank} editingTestId={editingTestId} seedQuestion={window.__ezee_test_seed_question || null} pendingQuestion={pendingQuestion} clearPendingQuestion={()=>setPendingQuestion(null)} onClose={()=>{setTestBuilderOpen(false); window.__ezee_test_seed_question=null;}} onSaved={()=>{setTestBuilderOpen(false); window.__ezee_test_seed_question=null;}} setBankModal={setBankModal} />}
    {bankModal && <QuestionBankPicker questionBank={questionBank} onClose={()=>setBankModal(false)} onPick={(q)=>{setPendingQuestion(q);setBankModal(false);}} />}
    <div className="watermark">Made With ❤️ By Shahid Sir</div>
  </section>;
}

function TestCard({ test, attempts, onEdit, onDelete, onCopy, onWhatsApp, onResults }) {
  const liveState = test.type==='Live Test' ? getLiveState(test) : null;
  return <article className="test-card panel">
    <div className="test-card-head"><span className={`test-type-badge ${slug(test.type).toLowerCase()}`}>{test.type}</span><button className="more-btn" aria-label="Test actions"><MoreIcon /></button></div>
    <div className="test-card-title"><div className="test-icon"><ClipboardIcon /></div><div><h3>{test.title}</h3><p>{test.className} • {test.subject} • {test.topic || 'Any topic'}</p></div></div>
    <div className="test-meta-grid"><div><ClockIcon /><span>{test.durationMinutes} min</span></div><div><TargetIcon /><span>{test.questions.length} questions</span></div><div><ShuffleIcon /><span>{test.randomize ? 'Random' : 'Fixed'}</span></div><div><UsersIcon /><span>{attempts.length} attempts</span></div></div>
    {liveState && <div className={`live-state ${liveState.kind}`}><RadioIcon /> {liveState.label}</div>}
    <div className="test-card-footer"><button className="secondary-btn compact" onClick={onEdit}><EditIcon /> Edit</button><button className="secondary-btn compact" onClick={onCopy}><LinkIcon /> Copy link</button><button className="whatsapp-btn compact" onClick={onWhatsApp}><WhatsAppIcon /> WhatsApp</button><button className="icon-action danger-icon" onClick={onDelete} aria-label="Delete test"><TrashIcon /></button></div>
  </article>;
}

function QuestionBankPage({ questionBank, setQuestionBank, onCreateFromQuestion, onDelete }) {
  return <div className="question-bank-page"><div className="panel bank-intro"><div className="module-icon small"><LibraryIcon /></div><div><h2>Reusable question bank</h2><p className="section-caption">Save polished questions once and reuse them in future tests.</p></div><button className="secondary-btn" onClick={()=>onCreateFromQuestion(null)}><PlusIcon /> Create test</button></div><div className="bank-list">{questionBank.map(q=><article key={q.id} className="bank-card panel"><div className="bank-card-top"><span className="question-type-pill">{q.type}</span><span>{q.marks} mark{q.marks!==1?'s':''}</span></div><h3>{q.prompt}</h3><div className="bank-card-bottom"><span>{q.subject || 'General'} • {q.className || 'Any class'}</span><div><button className="secondary-btn compact" onClick={()=>onCreateFromQuestion(q)}><PlusIcon /> Use in test</button><button className="icon-action danger-icon" aria-label="Delete saved question" onClick={()=>{ if(confirm('Delete this saved question?')) onDelete(q.id); }}><TrashIcon /></button></div></div></article>)}</div>{!questionBank.length && <div className="empty-state panel"><div className="empty-icon"><LibraryIcon /></div><h3>Your question bank is empty</h3><p>Use “Save to question bank” while creating or editing a test.</p></div>}</div>;
}

function ResultsPage({ tests, attempts }) {
  const [selectedTestId,setSelectedTestId]=useState(tests[0]?.id||'');
  const [printOpen,setPrintOpen]=useState(false);
  const selected=tests.find(t=>t.id===selectedTestId)||tests[0];
  const rows=selected?attempts.filter(a=>a.testId===selected.id):attempts;
  const ranked=[...rows].sort((a,b)=>Number(b.score||0)-Number(a.score||0)||Number(b.percentage||0)-Number(a.percentage||0)||String(a.submittedAt).localeCompare(String(b.submittedAt)));
  const rankMap=new Map(ranked.map((a,i)=>[a.id,i+1]));
  const average=rows.length?(rows.reduce((n,a)=>n+Number(a.percentage||0),0)/rows.length).toFixed(1):'—';
  const shareWhatsApp=()=>{ if(!selected)return; const text=`EZEE VISION CHAMPUA\nResult Report\n${selected.title}\nClass: ${selected.className}\nSubject: ${selected.subject}\nAttempts: ${rows.length}\nAverage: ${average}%\nTop Score: ${rows.length?`${ranked[0].score}/${ranked[0].totalMarks}`:'—'}`; window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank'); };
  const questionStats=selected?selected.questions.map((q,qi)=>{let correct=0,attempted=0;rows.forEach(a=>{const u=a.answers?.[q.id];if(u===undefined||String(u).trim()==='')return;attempted++;if(q.type==='MCQ'&&u===q.correctOptionId)correct++;if(q.type!=='MCQ'&&q.type!=='Subjective'&&normalizeAnswer(u)===normalizeAnswer(q.answer))correct++;});return {q,qi,correct,attempted};}):[];
  if(!tests.length) return <div className="empty-state inline"><div className="empty-icon"><BarChartIcon /></div><h3>No tests created</h3><p>Create a test first; student attempts and reports will appear here.</p></div>;
  return <div className="results-page panel"><div className="section-head"><div><div className="card-kicker">RESULTS & ANALYTICS</div><h2>Attempt history</h2><p className="section-caption">Class-wise rank list, score summary, and question analysis.</p></div><div className="result-actions"><button className="secondary-btn compact" onClick={()=>setPrintOpen(true)}><PrinterIcon /> A4 report</button><button className="whatsapp-btn compact" onClick={shareWhatsApp}><WhatsAppIcon /> WhatsApp</button></div></div>
    <div className="result-filter-row"><select value={selected?.id||''} onChange={e=>setSelectedTestId(e.target.value)} aria-label="Select test">{tests.map(t=><option key={t.id} value={t.id}>{t.title} • {t.className}</option>)}</select><div className="result-kpis"><span><strong>{rows.length}</strong> Attempts</span><span><strong>{average}%</strong> Average</span><span><strong>{rows.length?`${ranked[0].score}/${ranked[0].totalMarks}`:'—'}</strong> Top score</span></div></div>
    <div className="rank-list"><div className="rank-head"><span>Rank</span><span>Student</span><span>Score</span><span>%</span></div>{ranked.map((a,i)=><div className="rank-row" key={a.id}><span className={`rank-badge ${i<3?'top':''}`}>{rankMap.get(a.id)}</span><div className="attempt-main"><strong>{a.studentName||'Student'}</strong><span>{a.studentId||'No ID'} • {formatDateTime(a.submittedAt)}</span></div><strong>{a.score}/{a.totalMarks}</strong><span className="rank-percent">{a.percentage}%</span></div>)}</div>
    {selected&&<div className="question-analysis"><div className="section-head"><div><h3>Question analysis</h3><p className="section-caption">Correct response rate across saved attempts.</p></div></div>{questionStats.map(x=><div className="analysis-row" key={x.q.id}><span>Q{x.qi+1}</span><div><strong>{x.q.prompt}</strong><div className="analysis-bar"><i style={{width:`${x.attempted?Math.round(x.correct/x.attempted*100):0}%`}}></i></div></div><b>{x.attempted?Math.round(x.correct/x.attempted*100):0}%</b></div>)}</div>}
    {!rows.length&&<div className="empty-state inline"><div className="empty-icon"><BarChartIcon /></div><h3>No attempts for this test</h3><p>Share the generated student link to collect attempts.</p></div>}
    {printOpen&&selected&&<TestResultPrintOverlay test={selected} attempts={ranked} onClose={()=>setPrintOpen(false)} onWhatsApp={shareWhatsApp} />}
  </div>;
}

function TestResultPrintOverlay({ test, attempts, onClose, onWhatsApp }) {
  useEffect(()=>{ const fn=()=>onClose(); window.addEventListener('afterprint',fn); return()=>window.removeEventListener('afterprint',fn); },[]);
  const average=attempts.length?(attempts.reduce((n,a)=>n+Number(a.percentage||0),0)/attempts.length).toFixed(1):'0.0';
  return <div className="test-result-overlay"><div className="test-result-modal"><div className="test-result-toolbar"><div><div className="card-kicker">A4 RESULT REPORT</div><h2>{test.title}</h2><p className="section-caption">{test.className} • {test.subject} • {test.topic}</p></div><button className="close-btn" onClick={onClose}><CloseIcon /></button></div><div className="test-result-sheet"><div className="test-sheet-head"><img src="/assets/ezee-vision-logo.png" alt="EZEE VISION"/><div><strong>EZEE VISION CHAMPUA</strong><span>TEST RESULT & RANK LIST</span></div><em>{test.type}</em></div><div className="test-sheet-meta"><div><span>Class</span><strong>{test.className}</strong></div><div><span>Subject</span><strong>{test.subject}</strong></div><div><span>Topic</span><strong>{test.topic||'Any topic'}</strong></div><div><span>Attempts</span><strong>{attempts.length}</strong></div></div><div className="test-sheet-summary"><span>Average <b>{average}%</b></span><span>Top Score <b>{attempts.length?`${attempts[0].score}/${attempts[0].totalMarks}`:'—'}</b></span><span>Questions <b>{test.questions.length}</b></span></div><table><thead><tr><th>Rank</th><th>Student</th><th>Student ID</th><th>Score</th><th>Percentage</th></tr></thead><tbody>{attempts.map((a,i)=><tr key={a.id}><td>{i+1}</td><td>{a.studentName}</td><td>{a.studentId}</td><td>{a.score}/{a.totalMarks}</td><td>{a.percentage}%</td></tr>)}</tbody></table><div className="test-sheet-footer"><span>Generated for {test.title}</span><strong>Made With ❤️ By Shahid Sir</strong></div></div><div className="test-result-actions"><button className="primary-btn" onClick={()=>{document.body.classList.add('printing-test-results');window.print();}}><PrinterIcon/> Print / Save PDF</button><button className="whatsapp-btn" onClick={onWhatsApp}><WhatsAppIcon/> WhatsApp</button><button className="secondary-btn" onClick={onClose}><CloseIcon/> Close</button></div></div></div>;
}

function TestBuilderModal({ tests, setTests, questionBank, setQuestionBank, editingTestId, seedQuestion, pendingQuestion, clearPendingQuestion, onClose, onSaved, setBankModal }) {
  const existing = editingTestId ? tests.find(t=>t.id===editingTestId) : null;
  const initialQuestion = seedQuestion ? normalizeQuestion({...seedQuestion}) : blankQuestion();
  const [builder, setBuilder] = useState(() => existing ? normalizeTest(existing) : { id:createId('test'), title:'', type:'Practice Test', className:'Class 10', subject:'SST', topic:'', durationMinutes:30, negativeEnabled:false, negativeValue:0.25, randomize:true, liveStart:'', liveEnd:'', questions:[initialQuestion] });
  const [activeIndex, setActiveIndex] = useState(0);
  const [errors,setErrors]=useState([]);
  const q = builder.questions[activeIndex] || builder.questions[0];
  const updateQuestion = patch => setBuilder(prev=>({...prev,questions:prev.questions.map((x,i)=>i===activeIndex?{...x,...patch}:x)}));
  const saveQuestionToBank = () => { if(!q?.prompt.trim()) return alert('Add a question first.'); setQuestionBank(prev=>[{...q,id:createId('qb'),savedAt:new Date().toISOString(),className:builder.className,subject:builder.subject},...prev]); alert('Question saved to question bank.'); };
  useEffect(()=>{ if(pendingQuestion){ setBuilder(prev=>{ const next=[...prev.questions,normalizeQuestion(pendingQuestion)]; return {...prev,questions:next}; }); setActiveIndex(builder.questions.length); clearPendingQuestion(); } },[pendingQuestion]);
  const addFromPicker = () => setBankModal(true);
  const validate = () => { const e=[]; if(!builder.title.trim())e.push('Add a test title.'); if(!builder.topic.trim())e.push('Add a chapter/topic.'); if(builder.durationMinutes<1||builder.durationMinutes>360)e.push('Timer must be between 1 and 360 minutes.'); if(!builder.questions.length)e.push('Add at least one question.'); builder.questions.forEach((x,i)=>{if(!x.prompt.trim())e.push(`Question ${i+1}: add the question text.`);if(x.type==='MCQ'&&!x.options.every(o=>o.text.trim()))e.push(`Question ${i+1}: complete all 4 options.`);if(x.type==='MCQ'&&!x.correctOptionId)e.push(`Question ${i+1}: select the correct option.`);if(x.type!=='MCQ'&&!String(x.answer||'').trim())e.push(`Question ${i+1}: add the correct answer.`);});setErrors(e);return !e.length; };
  const save = async () => { if(!validate())return; const test={...builder,createdAt:existing?.createdAt||new Date().toISOString(),createdBy:'Teacher/Admin',version:1}; setTests(prev=>existing?prev.map(x=>x.id===editingTestId?test:x):[test,...prev]); onSaved(); };
  const removeQ = index => { if(builder.questions.length===1)return alert('A test needs at least one question.'); setBuilder(prev=>({...prev,questions:prev.questions.filter((_,i)=>i!==index)}));setActiveIndex(Math.max(0,Math.min(activeIndex,builder.questions.length-2))); };
  return <div className="modal-backdrop test-builder-backdrop"><div className="test-builder modal-sheet"><div className="modal-head"><div><div className="card-kicker">TEST BUILDER</div><h2>{existing?'Edit test':'Create new test'}</h2></div><button className="close-btn" onClick={onClose}><CloseIcon /></button></div>
    <div className="builder-top-grid"><Field label="Test title" value={builder.title} onChange={v=>setBuilder({...builder,title:v})} placeholder="e.g. Economics Chapter Test" /><Field label="Test type" as="select" value={builder.type} onChange={v=>setBuilder({...builder,type:v})} options={['Practice Test','Class Test','Full Exam','Live Test']} /><Field label="Class" as="select" value={builder.className} onChange={v=>setBuilder({...builder,className:v})} options={CLASS_OPTIONS} /><Field label="Subject" as="select" value={builder.subject} onChange={v=>setBuilder({...builder,subject:v})} options={['SST','SCIENCE','MATH','ENGLISH']} /><Field label="Chapter / Any Topic" value={builder.topic} onChange={v=>setBuilder({...builder,topic:v})} placeholder="Chapter, unit or any topic" /><Field label="Timer (minutes) • max 360" value={builder.durationMinutes} onChange={v=>setBuilder({...builder,durationMinutes:Math.max(1,Math.min(360,Number(v.replace(/\D/g,''))||1))})} inputMode="numeric" /><div className="builder-option-card"><span><ShuffleIcon /> Random questions & options</span><button className={`toggle ${builder.randomize?'on':''}`} onClick={()=>setBuilder({...builder,randomize:!builder.randomize})} aria-label="Toggle randomization"><span></span></button></div><div className="builder-option-card"><span><MinusCircleIcon /> Negative marking</span><button className={`toggle ${builder.negativeEnabled?'on':''}`} onClick={()=>setBuilder({...builder,negativeEnabled:!builder.negativeEnabled})} aria-label="Toggle negative marking"><span></span></button>{builder.negativeEnabled&&<input className="mini-number" value={builder.negativeValue} onChange={e=>setBuilder({...builder,negativeValue:Math.max(0,Number(e.target.value)||0)})} step="0.25" type="number" min="0" />}</div></div>
    {builder.type==='Live Test' && <div className="live-schedule panel"><div className="card-kicker">LIVE TEST WINDOW</div><div className="form-grid two"><Field label="Start" value={builder.liveStart} onChange={v=>setBuilder({...builder,liveStart:v})} type="datetime-local" /><Field label="End" value={builder.liveEnd} onChange={v=>setBuilder({...builder,liveEnd:v})} type="datetime-local" /></div><p className="form-note"><RadioIcon /> Students can open the link, but a Live Test only starts during the scheduled window.</p></div>}
    <div className="question-builder-layout"><aside className="question-nav"><div className="section-head"><div><h3>Questions</h3><span className="section-caption">{builder.questions.length} total</span></div><button className="icon-action" onClick={()=>{setBuilder(prev=>({...prev,questions:[...prev.questions,blankQuestion()]}));setActiveIndex(builder.questions.length)}} aria-label="Add question"><PlusIcon /></button></div><div>{builder.questions.map((x,i)=><button key={x.id} className={i===activeIndex?'question-nav-item active':'question-nav-item'} onClick={()=>setActiveIndex(i)}><span>{i+1}</span><div><strong>{x.type}</strong><small>{x.prompt||'Untitled question'}</small></div></button>)}</div></aside>
      <div className="question-editor panel">{q && <><div className="section-head"><div><div className="question-chip"><ClipboardIcon /> Question {activeIndex+1}</div><h3>Edit question</h3></div><button className="icon-action danger-icon" onClick={()=>removeQ(activeIndex)} aria-label="Delete question"><TrashIcon /></button></div><div className="form-grid two"><Field label="Question type" as="select" value={q.type} onChange={v=>updateQuestion({type:v})} options={['MCQ','True / False','Fill in the blanks','Subjective']} /><Field label="Marks" value={q.marks} onChange={v=>updateQuestion({marks:Math.max(0.25,Number(v)||0.25)})} type="number" step="0.25" min="0.25" /></div><Field label="Question" value={q.prompt} onChange={v=>updateQuestion({prompt:v})} placeholder="Write the question clearly" textarea rows={4} />
        {q.type==='MCQ' ? <div className="option-editor">{q.options.map((o,i)=><div className={`mcq-option-edit ${q.correctOptionId===o.id?'correct':''}`} key={o.id}><button className="correct-radio" aria-label={`Mark option ${i+1} correct`} onClick={()=>updateQuestion({correctOptionId:o.id})}>{q.correctOptionId===o.id?<CheckIcon />:<span>{String.fromCharCode(65+i)}</span>}</button><input value={o.text} onChange={e=>updateQuestion({options:q.options.map((x,j)=>j===i?{...x,text:e.target.value}:x)})} placeholder={`Option ${String.fromCharCode(65+i)}`} /></div>)}</div> : q.type==='True / False' ? <Field label="Correct answer" as="select" value={q.answer||'True'} onChange={v=>updateQuestion({answer:v})} options={['True','False']} /> : <Field label="Correct answer / teacher answer" value={q.answer || ''} onChange={v=>updateQuestion({answer:v})} placeholder={q.type==='Subjective'?'Model / teacher answer':'Correct answer'} textarea={q.type==='Subjective'} rows={q.type==='Subjective'?4:2} />}
        <Field label="Explanation / solution" value={q.explanation} onChange={v=>updateQuestion({explanation:v})} placeholder="Explain why the answer is correct" textarea rows={3} />
        <div className="editor-actions"><button className="secondary-btn" onClick={saveQuestionToBank}><LibraryIcon /> Save to question bank</button><button className="secondary-btn" onClick={addFromPicker}><LibraryIcon /> Add from question bank</button><button className="secondary-btn" onClick={()=>{setBuilder(prev=>({...prev,questions:[...prev.questions,blankQuestion()]}));setActiveIndex(builder.questions.length)}}><PlusIcon /> Add next question</button></div>
      </>}</div>
    </div>
    {errors.length>0&&<div className="validation-box"><ShieldCheckIcon /><div><strong>Complete these items before publishing</strong>{errors.map(e=><span key={e}>{e}</span>)}</div></div>}
    <div className="modal-footer"><span className="builder-footer-note"><LinkIcon /> A private student-only link will be created automatically.</span><button className="secondary-btn" onClick={onClose}><CloseIcon /> Cancel</button><button className="primary-btn" onClick={save}><SaveIcon /> {existing?'Save test':'Generate test link'}</button></div>
  </div></div>;
}

function QuestionBankPicker({ questionBank, onClose, onPick }) { return <div className="modal-backdrop"><div className="modal-sheet small-sheet"><div className="modal-head"><div><div className="card-kicker">QUESTION BANK</div><h2>Add saved question</h2></div><button className="close-btn" onClick={onClose}><CloseIcon /></button></div>{questionBank.length?<div className="bank-picker-list">{questionBank.map(q=><button className="bank-picker-row" key={q.id} onClick={()=>onPick(q)}><span className="question-type-pill">{q.type}</span><div><strong>{q.prompt}</strong><span>{q.marks} marks • {q.subject||'General'}</span></div><PlusIcon /></button>)}</div>:<div className="empty-state inline"><div className="empty-icon"><LibraryIcon /></div><h3>No saved questions</h3><p>Save questions to the bank from the test builder first.</p></div>}</div></div>; }

function StudentTestPortal({ testId, tests, testAttempts, onAttemptComplete }) {
  const test = tests.find(t=>t.id===testId);
  const [phase,setPhase]=useState('intro');
  const [student,setStudent]=useState({name:'',id:''});
  const [questions,setQuestions]=useState([]);
  const [answers,setAnswers]=useState({});
  const [marked,setMarked]=useState({});
  const [index,setIndex]=useState(0);
  const [startedAt,setStartedAt]=useState(null);
  const [remaining,setRemaining]=useState(0);
  const [result,setResult]=useState(null);
  const [restartNotice,setRestartNotice]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);

  useEffect(()=>{ document.documentElement.dataset.theme='light'; const vis=()=>{if(phase==='test' && document.visibilityState==='hidden'){ setRestartNotice(true); setPhase('intro'); setAnswers({}); setMarked({}); setIndex(0); setQuestions([]); setStartedAt(null); } }; document.addEventListener('visibilitychange',vis); return ()=>document.removeEventListener('visibilitychange',vis); },[phase]);
  useEffect(()=>{ if(phase!=='test'||remaining<=0)return; const timer=setInterval(()=>setRemaining(r=>Math.max(0,r-1)),1000); return()=>clearInterval(timer); },[phase,remaining]);
  useEffect(()=>{ if(phase==='test'&&remaining===0&&startedAt) submitTest(true); },[remaining,phase,startedAt]);

  if(!test) return <div className="student-portal error"><div className="student-portal-card"><img src="/assets/ezee-vision-logo.png" alt="EZEE VISION" /><div className="portal-icon error"><ShieldCheckIcon /></div><h1>Test link unavailable</h1><p>This test may have been removed or the link is incorrect.</p></div></div>;
  const liveState=test.type==='Live Test'?getLiveState(test):{kind:'open',label:'Ready to attempt'};
  const startTest=()=>{ if(liveState.kind==='locked')return; if(!student.name.trim()||!student.id.trim())return alert('Enter your name and Student ID.'); const randomized=shuffleQuestions(test.questions,test.randomize); setQuestions(randomized); setAnswers({}); setMarked({}); setIndex(0); const seconds=Math.max(60,Number(test.durationMinutes||1)*60); setRemaining(seconds);setStartedAt(Date.now());setPhase('test'); if(document.documentElement.requestFullscreen){document.documentElement.requestFullscreen().then(()=>setFullscreen(true)).catch(()=>{});} };
  const submitTest=(auto=false)=>{ if(phase!=='test'||!questions.length)return; const computed=evaluateTest(test,questions,answers); const attempt={id:createId('attempt'),testId:test.id,studentName:student.name.trim(),studentId:student.id.trim(),submittedAt:new Date().toISOString(),startedAt:new Date(startedAt||Date.now()).toISOString(),score:computed.score,totalMarks:computed.totalMarks,percentage:computed.percentage,correct:computed.correct,incorrect:computed.incorrect,unattempted:computed.unattempted,manualReview:computed.manualReview,autoSubmitted:auto,answers}; const higher=(testAttempts||[]).filter(a=>a.testId===test.id&&Number(a.score||0)>Number(computed.score||0)).length; computed.rank=higher+1; onAttemptComplete(attempt);setResult(computed);setPhase('result');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});setFullscreen(false); };
  const q=questions[index];
  const choose=(value)=>setAnswers(prev=>({...prev,[q.id]:value}));
  return <div className="student-portal">
    <header className="portal-header"><div className="portal-brand"><img src="/assets/ezee-vision-logo.png" alt="EZEE VISION" /><div><strong>EZEE VISION CHAMPUA</strong><span>Student Test Portal</span></div></div><span className="portal-secure"><ShieldCheckIcon /> Test only</span></header>
    {phase==='intro' && <main className="portal-main"><div className="portal-hero"><span className="test-type-badge liveish">{test.type}</span><h1>{test.title}</h1><p>{test.className} • {test.subject} • {test.topic || 'Any topic'}</p><div className="portal-stat-grid"><div><ClockIcon /><strong>{test.durationMinutes} min</strong><span>Timer</span></div><div><TargetIcon /><strong>{test.questions.length}</strong><span>Questions</span></div><div><ShuffleIcon /><strong>{test.randomize?'Random':'Fixed'}</strong><span>Order</span></div><div><MinusCircleIcon /><strong>{test.negativeEnabled?test.negativeValue:'Off'}</strong><span>Negative</span></div></div></div><div className="portal-card"><div className="card-kicker">STUDENT DETAILS</div><h2>Ready to begin?</h2><p className="muted">Use your own name and Student ID. Your result will be generated immediately after submission.</p><div className="form-grid two"><Field label="Student name" value={student.name} onChange={v=>setStudent({...student,name:v})} placeholder="Enter full name" /><Field label="Student ID" value={student.id} onChange={v=>setStudent({...student,id:v})} placeholder="e.g. EV-1001" /></div>{restartNotice&&<div className="restart-notice"><ShieldCheckIcon /><span>Leaving the test screen restarted this attempt. Please begin again.</span></div>} {liveState.kind==='locked'&&<div className="restart-notice"><ClockIcon /><span>{liveState.label}</span></div>}<button className="primary-btn full" onClick={startTest}><PlayIcon /> Start test <ArrowRightIcon /></button><div className="portal-rule"><ShieldCheckIcon /> Do not leave or minimize the test. Leaving the screen will restart the attempt.</div></div></main>}
    {phase==='test' && <main className="portal-test-main"><div className="portal-test-top"><div><span className="portal-kicker">{test.type}</span><h2>{test.title}</h2></div><div className="portal-timer"><ClockIcon /><span>{formatSeconds(remaining)}</span></div></div><div className="portal-progress"><span>Question {index+1} of {questions.length}</span><div><i style={{width:`${((index+1)/questions.length)*100}%`}}></i></div></div><div className="portal-test-grid"><aside className="portal-palette"><div className="card-kicker">QUESTIONS</div><div className="palette-grid">{questions.map((x,i)=><button className={`${i===index?'active ':''}${answers[x.id]!==undefined?'answered ':''}${marked[x.id]?'marked':''}`} key={x.id} onClick={()=>setIndex(i)}>{i+1}</button>)}</div><div className="palette-legend"><span><i className="answered-dot"></i>Answered</span><span><i className="review-dot"></i>Review</span></div></aside><section className="portal-question-card"><div className="question-head"><span className="question-number">Q{index+1}</span><span>{q.type} • {q.marks} marks</span></div><h1>{q.prompt}</h1>{q.type==='MCQ'&&<div className="portal-options">{q.options.map((o,i)=><button key={o.id} className={answers[q.id]===o.id?'selected':''} onClick={()=>choose(o.id)}><span>{String.fromCharCode(65+i)}</span><strong>{o.text}</strong></button>)}</div>}{q.type==='True / False'&&<div className="portal-options two-opt"><button className={answers[q.id]==='True'?'selected':''} onClick={()=>choose('True')}><span>T</span><strong>True</strong></button><button className={answers[q.id]==='False'?'selected':''} onClick={()=>choose('False')}><span>F</span><strong>False</strong></button></div>}{q.type==='Fill in the blanks'&&<input className="portal-answer-input" value={answers[q.id]||''} onChange={e=>choose(e.target.value)} placeholder="Type your answer" />}{q.type==='Subjective'&&<textarea className="portal-answer-input large" value={answers[q.id]||''} onChange={e=>choose(e.target.value)} rows={8} placeholder="Write your answer" />}
      <div className="portal-question-actions"><button className="secondary-btn" onClick={()=>setMarked(prev=>({...prev,[q.id]:!prev[q.id]}))}><FlagIcon /> {marked[q.id]?'Remove review':'Mark for review'}</button><div><button className="secondary-btn" disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))}><ChevronLeftIcon /> Previous</button>{index<questions.length-1?<button className="primary-btn" onClick={()=>setIndex(i=>Math.min(questions.length-1,i+1))}>Next <ChevronRightIcon /></button>:<button className="primary-btn" onClick={()=>submitTest(false)}><CheckIcon /> Submit test</button>}</div></div>
    </section></div></main>}
    {phase==='result' && result && <main className="portal-result-main"><div className="result-hero"><div className="result-icon"><TrophyIcon /></div><span className="portal-kicker">TEST RESULT</span><h1>{result.score} / {result.totalMarks}</h1><p>{student.name} • {test.title}</p><div className="result-percent">{result.percentage}% • Rank #{result.rank || '—'}</div></div><div className="portal-result-grid"><div className="portal-result-stat good"><CheckCircleIcon /><strong>{result.correct}</strong><span>Correct</span></div><div className="portal-result-stat bad"><CloseCircleIcon /><strong>{result.incorrect}</strong><span>Incorrect</span></div><div className="portal-result-stat"><MinusCircleIcon /><strong>{result.unattempted}</strong><span>Unattempted</span></div><div className="portal-result-stat"><FlagIcon /><strong>{result.manualReview}</strong><span>Manual review</span></div></div><div className="portal-answer-review"><div className="section-head"><div><h2>Answer review</h2><p className="section-caption">Correct answers and teacher explanations are shown below.</p></div></div>{questions.map((x,i)=>{const r=result.details.find(d=>d.questionId===x.id);return <article className={`answer-review-item ${r.state}`} key={x.id}><div className="review-q"><span>Q{i+1}</span><strong>{x.prompt}</strong></div><div className="review-a"><div><span>Your answer</span><strong>{formatAnswer(x,r.userAnswer)}</strong></div><div><span>Correct answer</span><strong>{formatAnswer(x,r.correctAnswer)}</strong></div></div>{x.explanation&&<div className="review-explanation"><SparklesIcon /> {x.explanation}</div>}</article>})}</div><button className="secondary-btn full" onClick={()=>{setPhase('intro');setResult(null);setRestartNotice(false);setStudent({name:student.name,id:student.id});}}><PlayIcon /> Attempt again</button><div className="portal-footer">EZEE VISION CHAMPUA • Student Test Portal</div></main>}
  </div>;
}

function blankQuestion(){return {id:createId('q'),type:'MCQ',prompt:'',marks:1,options:[{id:createId('opt'),text:''},{id:createId('opt'),text:''},{id:createId('opt'),text:''},{id:createId('opt'),text:''}],correctOptionId:'',answer:'',explanation:''};}
function normalizeQuestion(q){ const n={...blankQuestion(),...q,id:q.id||createId('q')}; if(n.type==='MCQ'){n.options=Array.isArray(q.options)&&q.options.length===4?q.options.map(o=>({...o,id:o.id||createId('opt')})):blankQuestion().options; n.correctOptionId=q.correctOptionId||'';} return n; }
function normalizeTest(t){return {...t,questions:(t.questions||[]).map(normalizeQuestion),durationMinutes:Number(t.durationMinutes||30)};}
function createId(prefix){return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;}
function loadStoredArray(key){try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:[];}catch{return[];}}
function testLink(id){return `${window.location.origin}${window.location.pathname}?test=${encodeURIComponent(id)}`;}
function shuffleArray(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function shuffleQuestions(questions,randomize){return randomize?shuffleArray(questions).map(q=>q.type==='MCQ'?{...q,options:shuffleArray(q.options)}:{...q}):questions.map(q=>({...q,options:q.options?[...q.options]:q.options}));}
function normalizeAnswer(v){return String(v??'').trim().toLowerCase().replace(/\s+/g,' ');}
function evaluateTest(test,questions,answers){let totalMarks=questions.reduce((n,q)=>n+Number(q.marks||0),0),score=0,correct=0,incorrect=0,unattempted=0,manualReview=0;const details=questions.map(q=>{const user=answers[q.id];if(user===undefined||String(user).trim()===''){unattempted++;return {questionId:q.id,state:'unattempted',userAnswer:user,correctAnswer:q.type==='MCQ'?q.options.find(o=>o.id===q.correctOptionId)?.text:q.answer};}if(q.type==='Subjective'){manualReview++;return {questionId:q.id,state:'review',userAnswer:user,correctAnswer:q.answer};}let ok=false;if(q.type==='MCQ')ok=user===q.correctOptionId;else if(q.type==='True / False')ok=normalizeAnswer(user)===normalizeAnswer(q.answer);else if(q.type==='Fill in the blanks')ok=normalizeAnswer(user)===normalizeAnswer(q.answer);if(ok){correct++;score+=Number(q.marks||0);return {questionId:q.id,state:'correct',userAnswer:user,correctAnswer:q.type==='MCQ'?q.options.find(o=>o.id===q.correctOptionId)?.text:q.answer};}incorrect++;if(test.negativeEnabled)score-=Number(test.negativeValue||0);return {questionId:q.id,state:'incorrect',userAnswer:user,correctAnswer:q.type==='MCQ'?q.options.find(o=>o.id===q.correctOptionId)?.text:q.answer};});return {score:Math.round(score*100)/100,totalMarks,percentage:totalMarks?Math.round((score/totalMarks)*1000)/10:0,correct,incorrect,unattempted,manualReview,details};}
function getLiveState(test){const now=Date.now();const start=test.liveStart?new Date(test.liveStart).getTime():null;const end=test.liveEnd?new Date(test.liveEnd).getTime():null;if(start&&now<start)return {kind:'locked',label:`Starts ${new Date(test.liveStart).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}`};if(end&&now>end)return {kind:'locked',label:'Live test window has ended'};return {kind:'open',label:'Live test is open'};}
function formatSeconds(s){const sec=Math.max(0,Number(s)||0);const m=Math.floor(sec/60),r=sec%60;return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;}
function formatDateTime(value){return new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});}
function formatAnswer(q,value){if(value===undefined||String(value).trim()==='')return 'Not answered';if(q.type==='MCQ'){return q.options.find(o=>o.id===value)?.text||'Not answered';}return String(value);}
function LibraryIcon(){return <Svg><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h7M8 11h7"/></Svg>}
function TargetIcon(){return <Svg><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></Svg>}
function ShuffleIcon(){return <Svg><path d="M4 7h3c3.5 0 4.2 7 7.7 7h5.3M17 5l3 2-3 2M4 17h3c1.6 0 2.6-1.4 3.3-2.9M17 13l3 2-3 2"/></Svg>}
function LinkIcon(){return <Svg><path d="M10.5 13.5 13.5 10.5M8.5 15.5l-2 2a3 3 0 0 1-4.2-4.2l3.5-3.5a3 3 0 0 1 4.2 0M15.5 8.5l2-2a3 3 0 1 1 4.2 4.2l-3.5 3.5a3 3 0 0 1-4.2 0"/></Svg>}
function RadioIcon(){return <Svg><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></Svg>}
function PlayIcon(){return <Svg><path d="m8 5 11 7-11 7V5Z"/></Svg>}
function FlagIcon(){return <Svg><path d="M6 21V4M6 5h10l-2.5 3L16 11H6"/></Svg>}
function TrophyIcon(){return <Svg><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM6 5H3.5v1.8A3.2 3.2 0 0 0 6.7 10M18 5h2.5v1.8a3.2 3.2 0 0 1-3.2 3.2M12 13v4M8.5 20h7M9.5 17h5"/></Svg>}
function CloseCircleIcon(){return <Svg><circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/></Svg>}
function Profile({ onLogout, profile, user }) { const roleLabel = profile?.role === 'admin' ? 'Admin' : 'Teacher'; return <section className="module-page"><div className="profile-avatar">{(profile?.name || user?.email || 'EV').slice(0,2).toUpperCase()}</div><div className="eyebrow"><span className="dot" /> {roleLabel.toUpperCase()}</div><h1>{profile?.name || user?.email || 'Account'}</h1><p>Your app profile and workspace controls.</p><div className="profile-list"><InfoRow label="Institute" value="EZEE VISION CHAMPUA" /><InfoRow label="Role" value={roleLabel} /><InfoRow label="Email" value={user?.email || '—'} /><InfoRow label="Interface" value="App-first • APK-ready" /></div><button className="secondary-btn full" onClick={onLogout}><LogOutIcon /> Sign out</button><div className="watermark">Made With ❤️ By Shahid Sir</div></section>; }

function PrintReport({ report }) {
  if (!report?.data) return null;
  return <div className="print-report"><div className="print-header"><img src="/assets/ezee-vision-logo.png" alt="EZEE VISION" /><div><div className="print-brand">EZEE VISION CHAMPUA</div><div className="print-title">{report.type === 'daily' ? 'DAILY ATTENDANCE' : 'MONTHLY ATTENDANCE REPORT'}</div></div></div>{report.type === 'daily' ? <DailyPrint data={report.data} /> : <MonthlyPrint data={report.data} />}<div className="print-footer">Made With ❤️ By Shahid Sir</div></div>;
}
function DailyPrint({ data }) { return <><div className="print-meta"><div><strong>Date</strong><span>{formatDate(data.date)}</span></div><div><strong>Class</strong><span>{data.className}</span></div><div><strong>Batch</strong><span>{data.batch}</span></div></div><div className="print-summary"><span>Students <b>{data.students.length}</b></span><span>Present <b>{data.counts.Present}</b></span><span>Absent <b>{data.counts.Absent}</b></span><span>Late <b>{data.counts.Late}</b></span><span>Not marked <b>{data.notMarked}</b></span></div><table><thead><tr><th>S.No.</th><th>Student Name</th><th>Student ID</th><th>Attendance</th></tr></thead><tbody>{data.students.map((s, i) => <tr key={s.id}><td>{i + 1}</td><td>{s.name}</td><td>{s.id}</td><td className={`print-status ${String(s.status || 'Not marked').toLowerCase().replace(' ', '-')}`}>{s.status || 'Not marked'}</td></tr>)}</tbody></table></>; }
function MonthlyPrint({ data }) { return <><div className="print-meta"><div><strong>Month</strong><span>{data.monthLabel}</span></div><div><strong>Class</strong><span>{data.className}</span></div><div><strong>Batch</strong><span>{data.batch}</span></div></div><div className="print-summary"><span>Total classes <b>{data.heldDates.length}</b></span><span>Present <b>{data.totalPresent}</b></span><span>Absent <b>{data.totalAbsent}</b></span><span>Late <b>{data.totalLate}</b></span><span>Average <b>{data.averagePercentage === null ? '—' : `${data.averagePercentage}%`}</b></span></div><table><thead><tr><th>S.No.</th><th>Student Name</th><th>Student ID</th><th>Present</th><th>Absent</th><th>Late</th><th>Classes</th><th>Attendance %</th></tr></thead><tbody>{data.students.map((s, i) => <tr key={s.id}><td>{i + 1}</td><td>{s.name}</td><td>{s.id}</td><td>{s.present}</td><td>{s.absent}</td><td>{s.late}</td><td>{s.total}</td><td><strong>{s.percentage === null ? '—' : `${s.percentage}%`}</strong></td></tr>)}</tbody></table><div className="print-calendar"><strong>Date-wise sessions</strong><div>{data.calendar.filter(d => d.held).map(d => <span key={d.date}>{d.day} — P {d.present}, A {d.absent}, L {d.late}</span>)}</div></div></>; }

function buildStudentAttendanceStats(students, records) {
  const stats = {};
  students.forEach(student => { stats[student.id] = { present: 0, absent: 0, late: 0, total: 0, percentage: null }; });
  Object.values(records || {}).forEach(group => {
    Object.entries(group || {}).forEach(([studentId, status]) => {
      if (!stats[studentId] || !ATTENDANCE_STATUS.includes(status)) return;
      stats[studentId][status.toLowerCase()] += 1;
      stats[studentId].total += 1;
    });
  });
  Object.values(stats).forEach(s => { s.percentage = s.total ? Math.round(((s.present + s.late) / s.total) * 1000) / 10 : null; });
  return stats;
}

function buildDailyReportData(date, className, batch, students, draft) {
  const rows = students.map(student => ({ id: student.id, name: student.name, status: draft[student.id] || '' }));
  return { type: 'daily', date, className, batch, students: rows, counts: countStatuses(draft), notMarked: rows.filter(r => !r.status).length };
}

function buildMonthlyReportData(month, className, batch, students, records) {
  const activeStudents = students.filter(s => s.status === 'Active' && s.className === className && s.batch === batch);
  const calendar = getMonthDays(month).map(date => {
    const group = records[attendanceKey(date, className, batch)] || null;
    const counts = countStatuses(group || {});
    return { date, day: Number(date.slice(8, 10)), weekday: new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }), held: Boolean(group && Object.keys(group).length), present: counts.Present, absent: counts.Absent, late: counts.Late };
  });
  const heldDates = calendar.filter(d => d.held);
  const studentRows = activeStudents.map(student => {
    let present = 0, absent = 0, late = 0;
    heldDates.forEach(d => {
      const status = (records[attendanceKey(d.date, className, batch)] || {})[student.id];
      if (status === 'Present') present += 1;
      if (status === 'Absent') absent += 1;
      if (status === 'Late') late += 1;
    });
    const total = present + absent + late;
    return { ...student, present, absent, late, total, percentage: total ? Math.round(((present + late) / total) * 1000) / 10 : null };
  });
  const percentages = studentRows.map(s => s.percentage).filter(v => v !== null);
  return {
    type: 'monthly', month, monthLabel: monthLabel(month), className, batch, calendar, heldDates,
    students: studentRows,
    totalPresent: heldDates.reduce((n, d) => n + d.present, 0),
    totalAbsent: heldDates.reduce((n, d) => n + d.absent, 0),
    totalLate: heldDates.reduce((n, d) => n + d.late, 0),
    averagePercentage: percentages.length ? Math.round((percentages.reduce((a,b) => a+b, 0) / percentages.length) * 10) / 10 : null
  };
}

function countStatuses(group) { return { Present: Object.values(group || {}).filter(v => v === 'Present').length, Absent: Object.values(group || {}).filter(v => v === 'Absent').length, Late: Object.values(group || {}).filter(v => v === 'Late').length }; }
function normalizeMap(map) { return Object.fromEntries(Object.entries(map || {}).filter(([,v]) => ATTENDANCE_STATUS.includes(v)).sort(([a],[b]) => a.localeCompare(b))); }
function attendanceKey(date, className, batch) { return `${date}|${className}|${batch}`; }
function dateKey(date) { return date.toISOString().slice(0,10); }
function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`; }
function getMonthDays(month) { const [year, m] = month.split('-').map(Number); const total = new Date(year, m, 0).getDate(); return Array.from({ length: total }, (_, i) => `${year}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`); }
function formatDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }); }
function monthLabel(month) { const [year, m] = month.split('-').map(Number); return new Date(year, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); }
function initials(name) { return String(name).split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase(); }
function slug(text) { return String(text).replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toUpperCase(); }
function dailyShareText(data) { return `EZEE VISION CHAMPUA\nDaily Attendance\nDate: ${formatDate(data.date)}\nClass: ${data.className}\nBatch: ${data.batch}\nPresent: ${data.counts.Present} | Absent: ${data.counts.Absent} | Late: ${data.counts.Late}`; }
function monthlyShareText(data) { return `EZEE VISION CHAMPUA\nMonthly Attendance\nMonth: ${data.monthLabel}\nClass: ${data.className}\nBatch: ${data.batch}\nTotal Classes: ${data.heldDates.length}\nPresent: ${data.totalPresent} | Absent: ${data.totalAbsent} | Late: ${data.totalLate}`; }
function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }

async function makeDailyAttendancePng(data) {
  const width = 1240, height = Math.max(1754, 360 + data.students.length * 78 + 360);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); fillCanvas(ctx, width, height, '#ffffff');
  const logo = await loadLogo();
  if (logo) drawLogo(ctx, logo, 72, 55, 120);
  text(ctx, 'EZEE VISION CHAMPUA', 215, 87, '800 34px Inter, Arial', '#0b1720');
  text(ctx, 'DAILY ATTENDANCE', 215, 130, '800 24px Inter, Arial', '#0c8f80');
  text(ctx, formatDate(data.date), 72, 230, '600 24px Inter, Arial', '#52615d');
  drawPillCanvas(ctx, 72, 270, 250, 52, `Class  •  ${data.className}`, '#e9f7f3', '#0c8f80');
  drawPillCanvas(ctx, 338, 270, 260, 52, `Batch  •  ${data.batch}`, '#eef3ff', '#3459c7');
  ctx.strokeStyle = '#dce5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(72, 350); ctx.lineTo(width-72, 350); ctx.stroke();
  drawSummaryCanvas(ctx, data.counts, data.notMarked, 72, 380, width-144);
  const tableY = 500; const cols = [72, 155, 660, 910, 1168];
  roundedRect(ctx, 72, tableY, width-144, 64, 16, '#10201e');
  text(ctx, 'S.NO.', 96, tableY+40, '800 17px Inter, Arial', '#ffffff');
  text(ctx, 'STUDENT NAME', 178, tableY+40, '800 17px Inter, Arial', '#ffffff');
  text(ctx, 'STUDENT ID', 684, tableY+40, '800 17px Inter, Arial', '#ffffff');
  text(ctx, 'ATTENDANCE', 950, tableY+40, '800 17px Inter, Arial', '#ffffff');
  data.students.forEach((student, i) => {
    const y = tableY + 64 + i * 70;
    roundedRect(ctx, 72, y+8, width-144, 58, 12, i % 2 ? '#f8fbfa' : '#ffffff');
    text(ctx, String(i+1), 101, y+44, '700 18px Inter, Arial', '#43514d');
    text(ctx, fitText(student.name, 455, '700 20px Inter, Arial', ctx), 178, y+36, '700 20px Inter, Arial', '#15201e');
    text(ctx, student.id, 684, y+36, '600 18px Inter, Arial', '#61706c');
    const status = student.status || 'Not marked'; const style = statusStyle(status);
    drawPillCanvas(ctx, 950, y+17, 150, 38, status, style.bg, style.fg);
  });
  const footerY = tableY + 64 + data.students.length * 70 + 55;
  text(ctx, `Students: ${data.students.length}`, 72, footerY, '700 19px Inter, Arial', '#566560');
  text(ctx, 'Made With ❤️ By Shahid Sir', width-390, footerY, '600 18px Inter, Arial', '#8a9692');
  return canvasToBlob(canvas);
}

async function makeMonthlyAttendancePng(data) {
  const width = 1240;
  const rowH = data.students.length > 12 ? 60 : 70;
  const tableY = 470;
  const tableEnd = tableY + 66 + data.students.length * rowH;
  const held = data.calendar.filter(d => d.held);
  const heldRows = Math.max(1, Math.ceil(held.length / 4));
  const sessionBoxH = 78 + heldRows * 35 + 36;
  const footerY = tableEnd + 48 + sessionBoxH + 42;
  const height = Math.max(1800, footerY + 80);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); fillCanvas(ctx, width, height, '#ffffff');
  const logo = await loadLogo(); if (logo) drawLogo(ctx, logo, 72, 48, 120);
  text(ctx, 'EZEE VISION CHAMPUA', 215, 82, '800 34px Inter, Arial', '#0b1720');
  text(ctx, 'MONTHLY ATTENDANCE REPORT', 215, 124, '800 22px Inter, Arial', '#0c8f80');
  text(ctx, data.monthLabel, 72, 214, '650 23px Inter, Arial', '#52615d');
  drawPillCanvas(ctx, 72, 250, 250, 52, `Class  •  ${data.className}`, '#e9f7f3', '#0c8f80');
  drawPillCanvas(ctx, 338, 250, 260, 52, `Batch  •  ${data.batch}`, '#eef3ff', '#3459c7');
  drawSummaryCanvas(ctx, { Present: data.totalPresent, Absent: data.totalAbsent, Late: data.totalLate }, 0, 72, 340, width-144, data.heldDates.length, data.averagePercentage);
  roundedRect(ctx, 72, tableY, width-144, 66, 16, '#10201e');
  const headers = [['S.NO.', 92], ['STUDENT', 160], ['P', 625], ['A', 730], ['L', 835], ['CLS', 940], ['ATTENDANCE', 1040]];
  headers.forEach(([h,x]) => text(ctx,h, x, tableY+42, '800 16px Inter, Arial', '#ffffff'));
  data.students.forEach((s,i)=>{ const yy=tableY+66+i*rowH; roundedRect(ctx,72,yy+7,width-144,rowH-10,12,i%2?'#f8fbfa':'#fff'); text(ctx,String(i+1),94,yy+39,'700 16px Inter, Arial','#43514d'); text(ctx,fitText(s.name,410,'700 18px Inter, Arial',ctx),160,yy+34,'700 18px Inter, Arial','#15201e'); text(ctx,String(s.present),630,yy+34,'700 17px Inter, Arial','#087f67'); text(ctx,String(s.absent),735,yy+34,'700 17px Inter, Arial','#b64242'); text(ctx,String(s.late),840,yy+34,'700 17px Inter, Arial','#a36a13'); text(ctx,String(s.total),945,yy+34,'700 17px Inter, Arial','#566560'); text(ctx,s.percentage===null?'—':`${s.percentage}%`,1040,yy+34,'800 17px Inter, Arial','#0c8f80'); });
  const sessionY = tableEnd + 48;
  roundedRect(ctx,72,sessionY,width-144,sessionBoxH,22,'#f7faf9');
  text(ctx,'DATE-WISE SESSIONS',100,sessionY+38,'800 17px Inter, Arial','#0c8f80');
  held.forEach((d,i)=>{ const col=i%4,row=Math.floor(i/4); const x=100+col*270, yy=sessionY+72+row*35; text(ctx,`${String(d.day).padStart(2,'0')}  •  P ${d.present}  A ${d.absent}  L ${d.late}`,x,yy,'600 15px Inter, Arial','#44524f'); });
  text(ctx,'Attendance only • EZEE VISION CHAMPUA',72,height-42,'600 17px Inter, Arial','#87928f'); text(ctx,'Made With ❤️ By Shahid Sir',width-390,height-42,'600 17px Inter, Arial','#87928f');
  return canvasToBlob(canvas);
}

function fillCanvas(ctx,w,h,color){ctx.fillStyle=color;ctx.fillRect(0,0,w,h)}
function roundedRect(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill()}
function text(ctx,value,x,y,font,fill){ctx.font=font;ctx.fillStyle=fill;ctx.fillText(value,x,y)}
function fitText(value,maxWidth,font,ctx){ctx.font=font; let t=String(value); while(ctx.measureText(t).width>maxWidth && t.length>3)t=t.slice(0,-2)+'…'; return t}
function drawLogo(ctx,img,x,y,size){ctx.drawImage(img,x,y,size,size)}
function drawPillCanvas(ctx,x,y,w,h,label,bg,fg){roundedRect(ctx,x,y,w,h,h/2,bg);text(ctx,label,x+18,y+h/2+7,'700 16px Inter, Arial',fg)}
function drawSummaryCanvas(ctx,counts,notMarked,x,y,totalWidth,totalClasses=0,average=null){const items=[['Present',counts.Present,'#e7faf2','#087f67'],['Absent',counts.Absent,'#fff0f0','#b64242'],['Late',counts.Late,'#fff5e2','#a36a13'],['Not marked',notMarked,'#f1f4f3','#6d7976']]; if(totalClasses||average!==null){items.push(['Classes',totalClasses,'#eef3ff','#3459c7']); items.push(['Average',average===null?'—':`${average}%`,'#e9f7f3','#0c8f80']);} const gap=14; const w=(totalWidth-gap*(items.length-1))/items.length; items.forEach((it,i)=>{const xx=x+i*(w+gap);roundedRect(ctx,xx,y,w,85,18,it[2]);text(ctx,it[0],xx+16,y+30,'700 15px Inter, Arial','#687570');text(ctx,String(it[1]),xx+16,y+63,'800 25px Inter, Arial',it[3])})}
function statusStyle(status){return {Present:{bg:'#e7faf2',fg:'#087f67'},Absent:{bg:'#fff0f0',fg:'#b64242'},Late:{bg:'#fff5e2',fg:'#a36a13'},'Not marked':{bg:'#f1f4f3',fg:'#6d7976'}}[status] || {bg:'#f1f4f3',fg:'#6d7976'};}
async function loadLogo(){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src='/assets/ezee-vision-logo.png';})}
function canvasToBlob(canvas){return new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));}

function HomeIcon(){return <Svg><path d="M4 10.6 12 4l8 6.6v8.1a1.3 1.3 0 0 1-1.3 1.3h-13A1.3 1.3 0 0 1 4 18.7v-8.1Z"/><path d="M9.3 20v-5.4h5.4V20"/></Svg>}
function UsersIcon(){return <Svg><path d="M16 19v-1.4a3.6 3.6 0 0 0-3.6-3.6H7.6A3.6 3.6 0 0 0 4 17.6V19"/><circle cx="10" cy="7.5" r="3.2"/><path d="M16.2 8.3a3 3 0 0 1 0 5.7M19.7 18.5v-.8a3.4 3.4 0 0 0-2.3-3.2"/></Svg>}
function CalendarCheckIcon(){return <Svg><rect x="3.5" y="5" width="17" height="15" rx="2.2"/><path d="M7 3.5v3M17 3.5v3M3.5 9.2h17M8 14l2.1 2.1L16 10.5"/></Svg>}
function CalendarIcon(){return <Svg><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/></Svg>}
function CalendarDaysIcon(){return <Svg><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17M8 12.5h.01M12 12.5h.01M16 12.5h.01M8 16.5h.01M12 16.5h.01M16 16.5h.01"/></Svg>}
function ReceiptIcon(){return <Svg><path d="M6 3.7h12v16.6l-3-1.7-3 1.7-3-1.7-3 1.7V3.7Z"/><path d="M8.5 8.2h7M8.5 12h7M8.5 15.8h4.5"/></Svg>}
function ClipboardIcon(){return <Svg><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4M8.5 9h7M8.5 13h7M8.5 17h4"/></Svg>}
function MoonIcon(){return <Svg><path d="M20 15.5A7.5 7.5 0 0 1 8.5 4a7.7 7.7 0 1 0 11.5 11.5Z"/></Svg>}
function SunIcon(){return <Svg><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></Svg>}
function SearchIcon(){return <Svg><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4 4"/></Svg>}
function PlusIcon(){return <Svg><path d="M12 5v14M5 12h14"/></Svg>}
function EditIcon(){return <Svg><path d="m5 16.5-.7 3.3 3.3-.7L18.8 7.9a2.1 2.1 0 0 0-3-3L5 16.5Z"/><path d="m14.5 6.5 3 3"/></Svg>}
function TrashIcon(){return <Svg><path d="M4.5 6.5h15M9 6.5V4h6v2.5M7 9v8.5A1.5 1.5 0 0 0 8.5 19h7a1.5 1.5 0 0 0 1.5-1.5V9M10 11.5v5M14 11.5v5"/></Svg>}
function ArrowRightIcon(){return <Svg><path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5"/></Svg>}
function ChevronRightIcon(){return <Svg><path d="m9 5 7 7-7 7"/></Svg>}
function ChevronLeftIcon(){return <Svg><path d="m15 5-7 7 7 7"/></Svg>}
function CheckIcon(){return <Svg><path d="m5 12.5 4 4L19 7"/></Svg>}
function CloseIcon(){return <Svg><path d="m6 6 12 12M18 6 6 18"/></Svg>}
function ClockIcon(){return <Svg><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.3 2"/></Svg>}
function ShareIcon(){return <Svg><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 8-5M8 13l8 5"/></Svg>}
function DownloadIcon(){return <Svg><path d="M12 4v10M8 10l4 4 4-4M5 19h14"/></Svg>}
function PrinterIcon(){return <Svg><path d="M7 8V4h10v4M6 17H4.5A1.5 1.5 0 0 1 3 15.5v-5A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H18"/><rect x="7" y="14" width="11" height="7" rx="1"/></Svg>}
function MoreIcon(){return <Svg><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></Svg>}
function SaveIcon(){return <Svg><path d="M5 4h11l3 3v13H5V4Z"/><path d="M8 4v5h7V4M9 20v-6h6v6"/></Svg>}
function LockIcon(){return <Svg><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></Svg>}
function SparklesIcon(){return <Svg><path d="m12 3 1.4 4.1L17 8.5l-3.6 1.4L12 14l-1.4-4.1L7 8.5l3.6-1.4L12 3ZM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14ZM5 14l.7 1.8L7.5 16l-1.8.7L5 18.5l-.7-1.8-1.8-.7 1.8-.7L5 14Z"/></Svg>}
function CheckCircleIcon(){return <Svg><circle cx="12" cy="12" r="8.5"/><path d="m8 12 2.5 2.5L16.5 9"/></Svg>}
function MinusCircleIcon(){return <Svg><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/></Svg>}
function BarChartIcon(){return <Svg><path d="M5 19V9M12 19V5M19 19v-7"/></Svg>}
function ShieldCheckIcon(){return <Svg><path d="M12 3.5 19 6v5.2c0 4.3-2.8 7.4-7 9.3-4.2-1.9-7-5-7-9.3V6l7-2.5Z"/><path d="m9 12 2 2 4-4"/></Svg>}
function LogOutIcon(){return <Svg><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></Svg>}
function WhatsAppIcon(){return <Svg><path d="M19.1 4.8A9.6 9.6 0 0 0 12.2 2C6.9 2 2.6 6.3 2.6 11.6c0 1.7.5 3.4 1.3 4.8L2.5 22l5.8-1.4c1.2.7 2.5 1 3.9 1 5.3 0 9.6-4.3 9.6-9.6 0-2.6-1-5.1-2.7-7.2Z"/><path d="M8.3 7.2c.3-.3.7-.3 1 0l1.1 1.5c.3.4.2.8-.1 1.1l-.8.7c.7 1.4 1.8 2.5 3.2 3.2l.7-.8c.3-.3.7-.4 1.1-.1l1.5 1.1c.3.3.3.7 0 1-.5.6-1.1.9-1.8.8-2.8-.4-5.6-2.2-7.1-4.5-1.5-2.3-2.1-4.8-1.7-6.1.2-.7.5-1.3 1-1.9Z"/></Svg>}
function Svg({ children }) { return <svg className="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>; }

createRoot(document.getElementById('root')).render(<App />);
