import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
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
  { id: 'EV-1001', name: 'Aarav Kumar', guardian: 'Rajesh Kumar', phone: '9876543210', className: 'Class 10', batch: 'Morning A', fee: 'Paid', status: 'Active', joined: '02 Apr 2026' },
  { id: 'EV-1002', name: 'Sana Parveen', guardian: 'Imran Parveen', phone: '9123456780', className: 'Class 10', batch: 'Evening A', fee: 'Pending', status: 'Active', joined: '05 Apr 2026' },
  { id: 'EV-1003', name: 'Ritwik Sahu', guardian: 'Manoj Sahu', phone: '9988776655', className: 'Class 9', batch: 'Morning B', fee: 'Paid', status: 'Active', joined: '08 Apr 2026' },
  { id: 'EV-1004', name: 'Ayesha Khan', guardian: 'Nadeem Khan', phone: '9012345678', className: 'Class 8', batch: 'Evening B', fee: 'Paid', status: 'Active', joined: '12 Apr 2026' },
  { id: 'EV-1005', name: 'Aditya Pradhan', guardian: 'Sanjay Pradhan', phone: '9345678123', className: 'Class 7', batch: 'Morning A', fee: 'Partial', status: 'Active', joined: '18 Apr 2026' },
  { id: 'EV-1006', name: 'Meher Fatima', guardian: 'Arif Ali', phone: '9090909090', className: 'Class 6', batch: 'Evening A', fee: 'Paid', status: 'Active', joined: '22 Apr 2026' }
];

const emptyForm = {
  name: '', guardian: '', phone: '', className: 'Class 10', batch: 'Morning A', fee: 'Pending', status: 'Active'
};

function App() {
  const [screen, setScreen] = useState('home');
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('ezee_logged_in') === '1');
  const [dark, setDark] = useState(() => localStorage.getItem('ezee_theme') === 'dark');
  const [now, setNow] = useState(new Date());
  const [students, setStudents] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ezee_students'));
      return Array.isArray(saved) && saved.length ? saved.map(({ attendance, ...student }) => student) : seedStudents;
    } catch {
      return seedStudents;
    }
  });
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
    const afterPrint = () => setPrintReport(null);
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

  const login = () => { localStorage.setItem('ezee_logged_in', '1'); setLoggedIn(true); };
  const logout = () => { localStorage.removeItem('ezee_logged_in'); setLoggedIn(false); setScreen('home'); };

  const openStudent = (id) => { setSelectedStudentId(id); setStudentView('detail'); setScreen('students'); };
  const openStudentEdit = (id) => { setSelectedStudentId(id); setModal('edit'); };
  const addStudent = (payload) => {
    const nextNumber = students.reduce((max, s) => Math.max(max, Number(String(s.id).replace(/\D/g, '')) || 1000), 1000) + 1;
    setStudents([{ ...payload, id: `EV-${nextNumber}`, joined: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }, ...students]);
    setModal(null);
  };
  const updateStudent = (payload) => {
    setStudents(students.map(s => s.id === payload.id ? { ...s, ...payload } : s));
    setModal(null);
  };
  const deleteStudent = (id) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    if (window.confirm(`Delete ${student.name}? This action cannot be undone.`)) {
      setStudents(students.filter(s => s.id !== id));
      setSelectedStudentId(null);
      setStudentView('list');
      const next = { ...attendanceRecords };
      Object.keys(next).forEach(key => { delete next[key][id]; });
      setAttendanceRecords(next);
    }
  };

  const updateAttendancePrefs = (patch) => setAttendancePrefs(prev => ({ ...prev, ...patch }));

  if (!loggedIn) return <Login onLogin={login} dark={dark} setDark={setDark} />;

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
        {screen === 'home' ? <Dashboard dateText={dateText} timeText={timeText} students={students} attendanceStats={attendanceStatsByStudent} attendanceAverage={attendanceAverage} onNavigate={setScreen} /> :
         screen === 'students' ? <StudentsPage students={students} attendanceStats={attendanceStatsByStudent} view={studentView} selectedStudentId={selectedStudentId} onView={openStudent} onEdit={openStudentEdit} onDelete={deleteStudent} onBack={() => { setStudentView('list'); setSelectedStudentId(null); }} onAdd={() => { setModal('add'); setSelectedStudentId(null); }} /> :
         screen === 'attendance' ? <AttendancePage students={students} attendanceRecords={attendanceRecords} setAttendanceRecords={setAttendanceRecords} prefs={attendancePrefs} updatePrefs={updateAttendancePrefs} onBack={() => setScreen('home')} onPrint={setPrintReport} /> :
         screen === 'profile' ? <Profile onLogout={logout} /> :
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
  return <div className="login-page">
    <div className="login-top">
      <div className="brand-wrap"><img className="brand-logo login-logo" src="/assets/ezee-vision-logo.png" alt="EZEE VISION" /><div><div className="brand-name">EZEE VISION</div><div className="brand-sub">CHAMPUA</div></div></div>
      <button className="icon-btn" onClick={() => setDark(v => !v)} aria-label="Toggle theme">{dark ? <SunIcon /> : <MoonIcon />}</button>
    </div>
    <div className="login-hero"><div className="eyebrow"><span className="dot" /> PREMIUM COACHING APP</div><h1>Teach better.<br /><span>Manage smarter.</span></h1><p>One polished app for your coaching institute, teachers and students.</p></div>
    <div className="login-card"><div className="card-kicker">WELCOME BACK</div><h2>Sign in to your app</h2><p className="muted">Demo login is enabled while the app is under development.</p><label>Email or phone</label><input className="field" placeholder="teacher@example.com" defaultValue="teacher@ezeevision.app" /><label>Password</label><div className="password-wrap"><input className="field" type={showPassword ? 'text' : 'password'} defaultValue="123456" /><button type="button" className="eye-btn" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div><button className="primary-btn full" onClick={onLogin}><LockIcon /> Continue to Dashboard <ArrowRightIcon /></button><div className="secure-note"><SparklesIcon /> App-first interface • APK-ready foundation</div></div>
    <div className="login-footer">Made With <span>❤️</span> By Shahid Sir</div>
  </div>;
}

function Dashboard({ dateText, timeText, students, attendanceStats, attendanceAverage, onNavigate }) {
  const active = students.filter(s => s.status === 'Active').length;
  const pending = students.filter(s => s.fee !== 'Paid').length;
  return <>
    <section className="hero-card"><div className="hero-copy"><div className="eyebrow light"><span className="dot" /> TEACHER / ADMIN</div><h1>Good evening,<br /><strong>Shahid Sir.</strong></h1><p>{dateText}</p><div className="live-time"><span className="pulse" /> {timeText} <span className="live-label">LIVE</span></div></div><div className="hero-orb"><img src="/assets/ezee-vision-logo.png" alt="EZEE Vision logo" /></div></section>
    <section className="section-block"><div className="section-head"><div><h2>Today at a glance</h2><p className="section-caption">Live figures from your saved student and attendance records.</p></div></div><div className="stats-grid"><Stat value={active} label="Active students" change={`${students.length} total records`} tone="mint" icon={<UsersIcon />} /><Stat value={attendanceAverage ? `${attendanceAverage}%` : '—'} label="Attendance average" change={attendanceAverage ? 'Based on attendance records' : 'No attendance saved yet'} tone="blue" icon={<CalendarCheckIcon />} /><Stat value={pending} label="Fee follow-ups" change="Students with dues" tone="gold" icon={<ReceiptIcon />} /></div></section>
    <section className="section-block"><div className="section-head"><h2>Quick actions</h2></div><div className="quick-grid">
      <QuickAction icon={<UsersIcon />} label="Students" sub="Manage learners" screen="students" tone="mint" onNavigate={onNavigate} />
      <QuickAction icon={<CalendarCheckIcon />} label="Attendance" sub="Mark today" screen="attendance" tone="blue" onNavigate={onNavigate} />
      <QuickAction icon={<ReceiptIcon />} label="Fees" sub="Payments & dues" screen="fees" tone="gold" onNavigate={onNavigate} />
      <QuickAction icon={<ClipboardIcon />} label="Tests" sub="Tests & results" screen="tests" tone="violet" onNavigate={onNavigate} />
    </div></section>
    <section className="two-col"><div className="panel"><div className="section-head"><div><h2>Attendance shortcut</h2><p className="section-caption">Go straight to today and record one attendance per student.</p></div><button className="icon-action" onClick={() => onNavigate('attendance')} aria-label="Open attendance"><ArrowRightIcon /></button></div><div className="attendance-shortcut"><div className="shortcut-icon"><CalendarCheckIcon /></div><div><strong>Attendance Pro</strong><span>Daily • Monthly • A4 export</span></div><button className="secondary-btn compact" onClick={() => onNavigate('attendance')}><CalendarCheckIcon /> Open</button></div></div><div className="panel accent-panel"><div className="card-kicker">PHASE 3</div><h2>Attendance is now the daily workflow.</h2><p className="muted">Mark Present, Absent or Late, edit past dates, and share polished daily attendance reports.</p></div></section>
    <div className="watermark">Made With ❤️ By Shahid Sir</div>
  </>;
}

function Stat({ value, label, change, tone, icon }) { return <div className={`stat-card ${tone}`}><div className="stat-top"><div className="stat-icon">{icon}</div><span className="stat-value">{value}</span></div><div className="stat-label">{label}</div><div className="stat-change">{change}</div></div>; }
function QuickAction({ icon, label, sub, screen, tone, onNavigate }) { return <button className="quick-card" onClick={() => onNavigate(screen)}><span className={`quick-icon ${tone}`}>{icon}</span><span className="quick-text"><strong>{label}</strong><span>{sub}</span></span><span className="arrow"><ChevronRightIcon /></span></button>; }

function StudentsPage({ students, attendanceStats, view, selectedStudentId, onView, onEdit, onDelete, onBack, onAdd }) {
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
    <div className="student-stats"><MiniStat value={students.length} label="Total" icon={<UsersIcon />} /><MiniStat value={students.filter(s => s.status === 'Active').length} label="Active" icon={<CheckCircleIcon />} /><MiniStat value={students.filter(s => s.fee !== 'Paid').length} label="Fee follow-ups" icon={<ReceiptIcon />} /></div>
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
    <div className="student-card-bottom"><div><small>Attendance</small><strong>{attendance?.percentage === null || attendance?.percentage === undefined ? '—' : `${attendance.percentage}%`}</strong></div><div><small>Fee</small><strong className={student.fee.toLowerCase()}>{student.fee}</strong></div><span className={`status-chip ${student.status.toLowerCase()}`}>{student.status}</span></div>
  </article>;
}

function StudentDetail({ student, attendance, onBack, onEdit, onDelete }) {
  return <section className="detail-page">
    <button className="back-btn" onClick={onBack}><ChevronLeftIcon /> Back to students</button>
    <div className="detail-hero panel"><div className="detail-avatar">{initials(student.name)}</div><div className="detail-title"><div className="eyebrow"><span className="dot" /> STUDENT PROFILE</div><h1>{student.name}</h1><p>{student.id} • {student.className} • {student.batch}</p></div><div className="detail-actions"><button className="secondary-btn" onClick={onEdit}><EditIcon /> Edit</button><button className="danger-btn" onClick={onDelete}><TrashIcon /> Delete</button></div></div>
    <div className="detail-grid"><div className="panel"><div className="section-head"><h2>Profile details</h2></div><InfoRow label="Guardian" value={student.guardian} /><InfoRow label="Phone" value={student.phone} /><InfoRow label="Joined" value={student.joined} /><InfoRow label="Status" value={student.status} /></div><div className="panel"><div className="section-head"><h2>Attendance snapshot</h2><span className="pill">Phase 3</span></div><div className="detail-metric"><span>Attendance</span><strong>{attendance?.percentage === null || attendance?.percentage === undefined ? 'No records' : `${attendance.percentage}%`}</strong></div><div className="metric-bar"><span style={{ width: `${Math.min(100, Number(attendance?.percentage) || 0)}%` }} /></div><div className="detail-metric"><span>Present</span><strong>{attendance?.present ?? 0}</strong></div><div className="detail-metric"><span>Absent</span><strong>{attendance?.absent ?? 0}</strong></div><div className="detail-metric"><span>Late</span><strong>{attendance?.late ?? 0}</strong></div><div className="detail-metric"><span>Classes counted</span><strong>{attendance?.total ?? 0}</strong></div></div></div>
    <div className="coming-card"><strong>Attendance is now record-based.</strong><span>Attendance percentage is calculated only from saved daily attendance entries. It can be edited later from Attendance Pro.</span></div>
    <div className="watermark">Made With ❤️ By Shahid Sir</div>
  </section>;
}
function InfoRow({ label, value }) { return <div className="profile-list-row"><span>{label}</span><strong>{value}</strong></div>; }

function StudentModal({ title, submitLabel, student, onClose, onSubmit }) {
  const [form, setForm] = useState(() => student ? { ...student } : { ...emptyForm });
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const submit = (e) => { e.preventDefault(); if (!form.name.trim() || !form.guardian.trim() || !/^\d{10}$/.test(form.phone)) return; onSubmit({ ...form }); };
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal-sheet" role="dialog" aria-modal="true"><div className="modal-head"><div><div className="card-kicker">STUDENT RECORD</div><h2>{title}</h2></div><button className="close-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button></div><form onSubmit={submit}>
    <div className="form-grid"><Field label="Student name" value={form.name} onChange={v => set('name', v)} placeholder="Enter full name" required /><Field label="Guardian name" value={form.guardian} onChange={v => set('guardian', v)} placeholder="Parent / guardian" required /><Field label="Phone" value={form.phone} onChange={v => set('phone', v.replace(/\D/g, '').slice(0,10))} placeholder="10-digit mobile" inputMode="numeric" required /></div>
    <div className="form-grid"><SelectField label="Class" value={form.className} onChange={v => set('className', v)} options={CLASS_OPTIONS} /><SelectField label="Batch" value={form.batch} onChange={v => set('batch', v)} options={BATCH_OPTIONS} /><SelectField label="Fee status" value={form.fee} onChange={v => set('fee', v)} options={['Paid','Pending','Partial']} /></div>
    <div className="form-grid"><SelectField label="Record status" value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} /></div>
    <div className="form-note"><CalendarCheckIcon /> Attendance is managed separately in Attendance Pro and is never typed manually here.</div>
    <div className="modal-footer"><button type="button" className="secondary-btn" onClick={onClose}><CloseIcon /> Cancel</button><button type="submit" className="primary-btn"><SaveIcon /> {submitLabel}</button></div>
  </form></div></div>;
}
function Field({ label, value, onChange, placeholder, required, inputMode }) { return <label className="form-field"><span>{label}</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} inputMode={inputMode} /></label>; }
function SelectField({ label, value, onChange, options }) { return <label className="form-field"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select></label>; }

function AttendancePage({ students, attendanceRecords, setAttendanceRecords, prefs, updatePrefs, onBack, onPrint }) {
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
  const save = () => {
    setAttendanceRecords(prev => ({ ...prev, [groupKey]: normalizeMap(draft) }));
    setSaveMessage('Attendance saved');
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
    <div className="page-heading attendance-heading"><div><div className="eyebrow"><span className="dot" /> ATTENDANCE PRO</div><h1>Attendance</h1><p>One student • one attendance per day • editable later.</p></div><div className="role-badge"><ShieldCheckIcon /> Teacher + Admin</div></div>
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

function ModulePlaceholder({ screen, onBack }) { const data = { fees: ['Fee Manager', 'Payments, pending fees and branded receipts.', ReceiptIcon], tests: ['Test Center', 'Create tests, manage attempts and results.', ClipboardIcon] }; const [title, subtitle, Icon] = data[screen] || ['Module','Module coming next.', SparklesIcon]; return <section className="module-page"><button className="back-btn" onClick={onBack}><ChevronLeftIcon /> Back to dashboard</button><div className="module-icon"><Icon /></div><div className="eyebrow"><span className="dot" /> NEXT PHASE</div><h1>{title}</h1><p>{subtitle}</p><div className="coming-card"><strong>Attendance Pro is complete in Phase 3.</strong><span>{title} remains intentionally scoped for the next module build.</span></div></section>; }
function Profile({ onLogout }) { return <section className="module-page"><div className="profile-avatar">SS</div><div className="eyebrow"><span className="dot" /> ADMIN / TEACHER</div><h1>Shahid Sir</h1><p>Your app profile and workspace controls.</p><div className="profile-list"><InfoRow label="Institute" value="EZEE VISION CHAMPUA" /><InfoRow label="Role" value="Admin / Teacher" /><InfoRow label="Interface" value="App-first • APK-ready" /></div><button className="secondary-btn full" onClick={onLogout}><LogOutIcon /> Sign out</button><div className="watermark">Made With ❤️ By Shahid Sir</div></section>; }

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
