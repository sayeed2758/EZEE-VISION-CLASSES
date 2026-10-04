import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
const BATCH_OPTIONS = ['Morning A', 'Morning B', 'Evening A', 'Evening B'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

const navItems = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'students', label: 'Students', icon: '♟' },
  { id: 'attendance', label: 'Attend.', icon: '✓' },
  { id: 'fees', label: 'Fees', icon: '₹' },
  { id: 'tests', label: 'Tests', icon: '▣' }
];

const seedStudents = [
  { id: 'EV-1001', name: 'Aarav Kumar', guardian: 'Rajesh Kumar', phone: '9876543210', className: 'Class 10', batch: 'Morning A', attendance: 96, fee: 'Paid', status: 'Active', joined: '02 Apr 2026' },
  { id: 'EV-1002', name: 'Sana Parveen', guardian: 'Imran Parveen', phone: '9123456780', className: 'Class 10', batch: 'Evening A', attendance: 92, fee: 'Pending', status: 'Active', joined: '05 Apr 2026' },
  { id: 'EV-1003', name: 'Ritwik Sahu', guardian: 'Manoj Sahu', phone: '9988776655', className: 'Class 9', batch: 'Morning B', attendance: 89, fee: 'Paid', status: 'Active', joined: '08 Apr 2026' },
  { id: 'EV-1004', name: 'Ayesha Khan', guardian: 'Nadeem Khan', phone: '9012345678', className: 'Class 8', batch: 'Evening B', attendance: 97, fee: 'Paid', status: 'Active', joined: '12 Apr 2026' },
  { id: 'EV-1005', name: 'Aditya Pradhan', guardian: 'Sanjay Pradhan', phone: '9345678123', className: 'Class 7', batch: 'Morning A', attendance: 84, fee: 'Partial', status: 'Active', joined: '18 Apr 2026' },
  { id: 'EV-1006', name: 'Meher Fatima', guardian: 'Arif Ali', phone: '9090909090', className: 'Class 6', batch: 'Evening A', attendance: 94, fee: 'Paid', status: 'Active', joined: '22 Apr 2026' }
];

const emptyForm = {
  name: '', guardian: '', phone: '', className: 'Class 10', batch: 'Morning A', attendance: 100, fee: 'Pending', status: 'Active'
};

function App() {
  const [screen, setScreen] = useState('home');
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('ezee_logged_in') === '1');
  const [dark, setDark] = useState(() => localStorage.getItem('ezee_theme') === 'dark');
  const [now, setNow] = useState(new Date());
  const [students, setStudents] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ezee_students'));
      return Array.isArray(saved) && saved.length ? saved : seedStudents;
    } catch { return seedStudents; }
  });
  const [studentView, setStudentView] = useState('list');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [modal, setModal] = useState(null);

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

  const dateText = useMemo(() => now.toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }), [now]);
  const timeText = useMemo(() => now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  }), [now]);

  const login = () => { localStorage.setItem('ezee_logged_in', '1'); setLoggedIn(true); };
  const logout = () => { localStorage.removeItem('ezee_logged_in'); setLoggedIn(false); setScreen('home'); };

  const openStudent = (id) => { setSelectedStudentId(id); setStudentView('detail'); setScreen('students'); };
  const openStudentEdit = (id) => { setSelectedStudentId(id); setModal('edit'); };
  const addStudent = (payload) => {
    const nextNumber = students.reduce((max, s) => Math.max(max, Number(s.id.replace(/\D/g, '')) || 1000), 1000) + 1;
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
    }
  };

  if (!loggedIn) return <Login onLogin={login} dark={dark} setDark={setDark} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-wrap brand-button" onClick={() => setScreen('home')} aria-label="Go home">
          <img className="brand-logo" src="/assets/ezee-vision-logo.png" alt="EZEE VISION" />
          <div><div className="brand-name">EZEE VISION</div><div className="brand-sub">CHAMPUA</div></div>
        </button>
        <div className="top-actions">
          <button className="icon-btn" aria-label="Toggle theme" onClick={() => setDark(v => !v)}>{dark ? '☀' : '☾'}</button>
          <button className="avatar" onClick={() => setScreen('profile')} aria-label="Open profile">SS</button>
        </div>
      </header>

      <main className="main-content">
        {screen === 'home' ? <Dashboard dateText={dateText} timeText={timeText} students={students} onNavigate={setScreen} /> :
         screen === 'students' ? <StudentsPage students={students} view={studentView} selectedStudentId={selectedStudentId} onView={openStudent} onEdit={openStudentEdit} onDelete={deleteStudent} onBack={() => { setStudentView('list'); setSelectedStudentId(null); }} onAdd={() => { setModal('add'); setSelectedStudentId(null); }} /> :
         screen === 'profile' ? <Profile onLogout={logout} /> :
         <ModulePlaceholder screen={screen} onBack={() => setScreen('home')} />}
      </main>

      <nav className="bottom-nav">
        {navItems.map(item => (
          <button key={item.id} className={screen === item.id ? 'nav-item active' : 'nav-item'} onClick={() => { setScreen(item.id); if (item.id === 'students') setStudentView('list'); }}>
            <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </nav>

      {modal === 'add' && <StudentModal title="Add new student" submitLabel="Save student" onClose={() => setModal(null)} onSubmit={addStudent} />}
      {modal === 'edit' && <StudentModal title="Edit student" submitLabel="Save changes" student={students.find(s => s.id === selectedStudentId)} onClose={() => setModal(null)} onSubmit={updateStudent} />}
    </div>
  );
}

function Login({ onLogin, dark, setDark }) {
  const [showPassword, setShowPassword] = useState(false);
  return <div className="login-page">
    <div className="login-top">
      <div className="brand-wrap"><img className="brand-logo login-logo" src="/assets/ezee-vision-logo.png" alt="EZEE VISION" /><div><div className="brand-name">EZEE VISION</div><div className="brand-sub">CHAMPUA</div></div></div>
      <button className="icon-btn" onClick={() => setDark(v => !v)}>{dark ? '☀' : '☾'}</button>
    </div>
    <div className="login-hero"><div className="eyebrow"><span className="dot" /> PREMIUM COACHING PLATFORM</div><h1>Teach better.<br /><span>Manage smarter.</span></h1><p>One polished app for your coaching institute, teachers and students.</p></div>
    <div className="login-card"><div className="card-kicker">WELCOME BACK</div><h2>Sign in to your app</h2><p className="muted">Demo login is enabled while we build the foundation.</p><label>Email or phone</label><input className="field" placeholder="teacher@example.com" defaultValue="teacher@ezeevision.app" /><label>Password</label><div className="password-wrap"><input className="field" type={showPassword ? 'text' : 'password'} defaultValue="123456" /><button className="eye-btn" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div><button className="primary-btn full" onClick={onLogin}>Continue to Dashboard <span>→</span></button><div className="secure-note"><span>✦</span> App-first interface • APK-ready foundation</div></div>
    <div className="login-footer">Made With <span>❤️</span> By Shahid Sir</div>
  </div>;
}

function Dashboard({ dateText, timeText, students, onNavigate }) {
  const active = students.filter(s => s.status === 'Active').length;
  const avgAttendance = students.length ? (students.reduce((sum, s) => sum + Number(s.attendance || 0), 0) / students.length).toFixed(1) : '0.0';
  const pending = students.filter(s => s.fee !== 'Paid').length;
  return <>
    <section className="hero-card"><div className="hero-copy"><div className="eyebrow light"><span className="dot" /> TEACHER DASHBOARD</div><h1>Good morning,<br /><strong>Shahid Sir.</strong></h1><p>{dateText}</p><div className="live-time"><span className="pulse" /> {timeText} <span className="live-label">LIVE</span></div></div><div className="hero-orb"><img src="/assets/ezee-vision-logo.png" alt="EZEE Vision logo" /></div></section>
    <section className="section-block"><div className="section-head"><h2>Today at a glance</h2><button className="text-btn">View report →</button></div><div className="stats-grid"><Stat value={active} label="Active students" change={`${students.length} total records`} tone="mint" /><Stat value={`${avgAttendance}%`} label="Avg. attendance" change="Across all batches" tone="blue" /><Stat value={pending} label="Fee follow-ups" change="Students with dues" tone="gold" /></div></section>
    <section className="section-block"><div className="section-head"><h2>Quick actions</h2></div><div className="quick-grid">
      <QuickAction icon="♟" label="Students" sub="Manage learners" screen="students" tone="mint" onNavigate={onNavigate} />
      <QuickAction icon="✓" label="Attendance" sub="Mark today" screen="attendance" tone="blue" onNavigate={onNavigate} />
      <QuickAction icon="₹" label="Collect fee" sub="Record payment" screen="fees" tone="gold" onNavigate={onNavigate} />
      <QuickAction icon="▣" label="Create test" sub="Build an exam" screen="tests" tone="violet" onNavigate={onNavigate} />
    </div></section>
    <section className="two-col"><div className="panel"><div className="section-head"><h2>Recently added</h2><button className="text-btn" onClick={() => onNavigate('students')}>See all →</button></div>{students.slice(0,4).map(s => <button className="class-row clickable" key={s.id} onClick={() => onNavigate('students')}><div className="mini-avatar">{initials(s.name)}</div><div className="class-info"><strong>{s.name}</strong><span>{s.className} • {s.batch}</span></div><span className={`status ${s.fee.toLowerCase()}`}>{s.fee}</span></button>)}</div><div className="panel accent-panel"><div className="card-kicker">NEXT MODULE</div><h2>Attendance Pro</h2><p className="muted">Mark daily attendance, review monthly patterns and print clean reports.</p><div className="progress"><span /></div><div className="panel-foot"><span>Phase 3 • Ready after Students</span><button className="small-btn" onClick={() => onNavigate('attendance')}>Preview</button></div></div></section>
    <div className="watermark">Made With ❤️ By Shahid Sir</div>
  </>;
}

function QuickAction({ icon, label, sub, screen, tone, onNavigate }) { return <button className="quick-card" onClick={() => onNavigate(screen)}><div className={`quick-icon ${tone}`}>{icon}</div><div className="quick-text"><strong>{label}</strong><span>{sub}</span></div><span className="arrow">↗</span></button>; }
function Stat({ value, label, change, tone }) { return <div className={`stat-card ${tone}`}><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-change">{change}</div></div>; }
function initials(name='') { return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase(); }

function StudentsPage({ students, view, selectedStudentId, onView, onEdit, onDelete, onBack, onAdd }) {
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
    if (!student) return <section className="empty-detail"><button className="back-btn" onClick={onBack}>← Students</button><h1>Student not found</h1></section>;
    return <StudentDetail student={student} onBack={onBack} onEdit={() => onEdit(student.id)} onDelete={() => onDelete(student.id)} />;
  }

  return <section className="students-page">
    <div className="page-heading"><div><div className="eyebrow"><span className="dot" /> STUDENT MANAGEMENT</div><h1>Students</h1><p>One place for learner profiles, classes and batches.</p></div><button className="primary-btn add-btn" onClick={onAdd}>＋ Add student</button></div>
    <div className="student-stats"><MiniStat value={students.length} label="Total" /><MiniStat value={students.filter(s => s.status === 'Active').length} label="Active" /><MiniStat value={students.filter(s => s.fee !== 'Paid').length} label="Fee follow-ups" /></div>
    <div className="students-toolbar panel"><div className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, ID, guardian or phone" /></div><div className="filter-row"><select value={classFilter} onChange={e => setClassFilter(e.target.value)}><option>All classes</option>{CLASS_OPTIONS.map(o => <option key={o}>{o}</option>)}</select><select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}><option>All batches</option>{BATCH_OPTIONS.map(o => <option key={o}>{o}</option>)}</select><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All</option>{STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}</select></div></div>
    <div className="student-list-header"><span>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span><span>Tap a card to open profile</span></div>
    <div className="student-grid">{filtered.map(student => <StudentCard key={student.id} student={student} onOpen={() => onView(student.id)} onEdit={() => onEdit(student.id)} />)}</div>
    {!filtered.length && <div className="empty-state panel"><div className="empty-icon">⌕</div><h3>No students found</h3><p>Try a different search or filter.</p></div>}
    <div className="watermark">Made With ❤️ By Shahid Sir</div>
  </section>;
}

function MiniStat({ value, label }) { return <div className="mini-stat"><strong>{value}</strong><span>{label}</span></div>; }

function StudentCard({ student, onOpen, onEdit }) {
  return <article className="student-card panel" onClick={onOpen} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen()}>
    <div className="student-card-top"><div className="student-avatar">{initials(student.name)}</div><div className="student-main"><strong>{student.name}</strong><span>{student.id} • {student.className}</span></div><button className="more-btn" aria-label="Edit student" onClick={e => { e.stopPropagation(); onEdit(); }}>⋯</button></div>
    <div className="student-meta"><span>{student.batch}</span><span>{student.phone}</span></div>
    <div className="student-card-bottom"><div><small>Attendance</small><strong>{student.attendance}%</strong></div><div><small>Fee</small><strong className={student.fee.toLowerCase()}>{student.fee}</strong></div><span className={`status-chip ${student.status.toLowerCase()}`}>{student.status}</span></div>
  </article>;
}

function StudentDetail({ student, onBack, onEdit, onDelete }) {
  return <section className="detail-page">
    <button className="back-btn" onClick={onBack}>← Back to students</button>
    <div className="detail-hero panel"><div className="detail-avatar">{initials(student.name)}</div><div className="detail-title"><div className="eyebrow"><span className="dot" /> STUDENT PROFILE</div><h1>{student.name}</h1><p>{student.id} • {student.className} • {student.batch}</p></div><div className="detail-actions"><button className="secondary-btn" onClick={onEdit}>Edit</button><button className="danger-btn" onClick={onDelete}>Delete</button></div></div>
    <div className="detail-grid"><div className="panel"><div className="section-head"><h2>Profile details</h2></div><InfoRow label="Guardian" value={student.guardian} /><InfoRow label="Phone" value={student.phone} /><InfoRow label="Joined" value={student.joined} /><InfoRow label="Status" value={student.status} /></div><div className="panel"><div className="section-head"><h2>Academic snapshot</h2></div><div className="detail-metric"><span>Attendance</span><strong>{student.attendance}%</strong></div><div className="metric-bar"><span style={{ width: `${Math.min(100, Number(student.attendance) || 0)}%` }} /></div><div className="detail-metric"><span>Fee status</span><strong className={student.fee.toLowerCase()}>{student.fee}</strong></div><div className="detail-metric"><span>Class / Batch</span><strong>{student.className} / {student.batch}</strong></div></div></div>
    <div className="coming-card"><strong>Student Management • Phase 2 complete</strong><span>This profile is now stored locally and ready for the next modules: Attendance Pro, Fee Manager, Tests and Results.</span></div>
    <div className="watermark">Made With ❤️ By Shahid Sir</div>
  </section>;
}
function InfoRow({ label, value }) { return <div className="profile-list-row"><span>{label}</span><strong>{value}</strong></div>; }

function StudentModal({ title, submitLabel, student, onClose, onSubmit }) {
  const [form, setForm] = useState(() => student ? { ...student } : { ...emptyForm });
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const submit = (e) => { e.preventDefault(); if (!form.name.trim() || !form.guardian.trim() || !/^\d{10}$/.test(form.phone)) return; onSubmit({ ...form, attendance: Number(form.attendance) || 0 }); };
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal-sheet" role="dialog" aria-modal="true"><div className="modal-head"><div><div className="card-kicker">STUDENT RECORD</div><h2>{title}</h2></div><button className="close-btn" onClick={onClose}>×</button></div><form onSubmit={submit}>
    <div className="form-grid"><Field label="Student name" value={form.name} onChange={v => set('name', v)} placeholder="Enter full name" required /><Field label="Guardian name" value={form.guardian} onChange={v => set('guardian', v)} placeholder="Parent / guardian" required /><Field label="Phone" value={form.phone} onChange={v => set('phone', v.replace(/\D/g, '').slice(0,10))} placeholder="10-digit mobile" inputMode="numeric" required /></div>
    <div className="form-grid"><SelectField label="Class" value={form.className} onChange={v => set('className', v)} options={CLASS_OPTIONS} /><SelectField label="Batch" value={form.batch} onChange={v => set('batch', v)} options={BATCH_OPTIONS} /><SelectField label="Fee status" value={form.fee} onChange={v => set('fee', v)} options={['Paid','Pending','Partial']} /></div>
    <div className="form-grid"><Field label="Attendance %" value={form.attendance} onChange={v => set('attendance', v.replace(/\D/g, '').slice(0,3))} inputMode="numeric" /><SelectField label="Record status" value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} /></div>
    <div className="form-note">Student ID is generated automatically for new records.</div>
    <div className="modal-footer"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn">{submitLabel} <span>→</span></button></div>
  </form></div></div>;
}
function Field({ label, value, onChange, placeholder, required, inputMode }) { return <label className="form-field"><span>{label}</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} inputMode={inputMode} /></label>; }
function SelectField({ label, value, onChange, options }) { return <label className="form-field"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select></label>; }

function ModulePlaceholder({ screen, onBack }) { const data = { attendance: ['Attendance Pro','Daily attendance, monthly calendar and reports.'], fees:['Fee Manager','Payments, pending fees and branded receipts.'], tests:['Test Center','Create tests, manage attempts and results.'] }; const [title, subtitle] = data[screen] || ['Module','Module coming next.']; return <section className="module-page"><button className="back-btn" onClick={onBack}>← Back to dashboard</button><div className="module-icon">{screen === 'attendance' ? '✓' : screen === 'fees' ? '₹' : '▣'}</div><div className="eyebrow"><span className="dot" /> NEXT PHASE</div><h1>{title}</h1><p>{subtitle}</p><div className="coming-card"><strong>Students is now polished in Phase 2.</strong><span>{title} remains intentionally scoped for the next module build.</span></div></section>; }
function Profile({ onLogout }) { return <section className="module-page"><div className="profile-avatar">SS</div><div className="eyebrow"><span className="dot" /> ADMIN / TEACHER</div><h1>Shahid Sir</h1><p>Your app profile and workspace controls.</p><div className="profile-list"><InfoRow label="Institute" value="EZEE VISION CHAMPUA" /><InfoRow label="Role" value="Admin / Teacher" /><InfoRow label="Interface" value="App-first • APK-ready" /></div><button className="secondary-btn full" onClick={onLogout}>Sign out</button><div className="watermark">Made With ❤️ By Shahid Sir</div></section>; }

createRoot(document.getElementById('root')).render(<App />);
