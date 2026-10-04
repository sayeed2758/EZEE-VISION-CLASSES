import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const navItems = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'students', label: 'Students', icon: '♟' },
  { id: 'attendance', label: 'Attend.', icon: '✓' },
  { id: 'fees', label: 'Fees', icon: '₹' },
  { id: 'tests', label: 'Tests', icon: '▣' }
];

const quickActions = [
  { icon: '♟', label: 'Students', sub: 'Manage learners', screen: 'students', tone: 'mint' },
  { icon: '✓', label: 'Attendance', sub: 'Mark today', screen: 'attendance', tone: 'blue' },
  { icon: '₹', label: 'Collect fee', sub: 'Record payment', screen: 'fees', tone: 'gold' },
  { icon: '▣', label: 'Create test', sub: 'Build an exam', screen: 'tests', tone: 'violet' }
];

function App() {
  const [screen, setScreen] = useState('home');
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('ezee_logged_in') === '1');
  const [dark, setDark] = useState(() => localStorage.getItem('ezee_theme') === 'dark');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('ezee_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const dateText = useMemo(() => now.toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }), [now]);
  const timeText = useMemo(() => now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  }), [now]);

  const login = () => {
    localStorage.setItem('ezee_logged_in', '1');
    setLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem('ezee_logged_in');
    setLoggedIn(false);
    setScreen('home');
  };

  if (!loggedIn) return <Login onLogin={login} dark={dark} setDark={setDark} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap" onClick={() => setScreen('home')}>
          <div className="brand-mark">EV</div>
          <div>
            <div className="brand-name">EZEE VISION</div>
            <div className="brand-sub">CHAMPUA</div>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" aria-label="Toggle theme" onClick={() => setDark(v => !v)}>{dark ? '☀' : '☾'}</button>
          <button className="avatar" onClick={() => setScreen('profile')}>SS</button>
        </div>
      </header>

      <main className="main-content">
        {screen === 'home' ? (
          <Dashboard dateText={dateText} timeText={timeText} onNavigate={setScreen} />
        ) : screen === 'profile' ? (
          <Profile onLogout={logout} />
        ) : (
          <ModulePlaceholder screen={screen} onBack={() => setScreen('home')} />
        )}
      </main>

      <nav className="bottom-nav">
        {navItems.map(item => (
          <button key={item.id} className={screen === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setScreen(item.id)}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Login({ onLogin, dark, setDark }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="login-page">
      <div className="login-top">
        <div className="brand-wrap">
          <div className="brand-mark large">EV</div>
          <div>
            <div className="brand-name">EZEE VISION</div>
            <div className="brand-sub">CHAMPUA</div>
          </div>
        </div>
        <button className="icon-btn" onClick={() => setDark(v => !v)}>{dark ? '☀' : '☾'}</button>
      </div>

      <div className="login-hero">
        <div className="eyebrow"><span className="dot" /> PREMIUM COACHING PLATFORM</div>
        <h1>Teach better.<br /><span>Manage smarter.</span></h1>
        <p>One polished app for your coaching institute, teachers and students.</p>
      </div>

      <div className="login-card">
        <div className="card-kicker">WELCOME BACK</div>
        <h2>Sign in to your app</h2>
        <p className="muted">Use the demo button to explore Phase 1.</p>
        <label>Email or phone</label>
        <input className="field" placeholder="teacher@example.com" defaultValue="teacher@ezeevision.app" />
        <label>Password</label>
        <div className="password-wrap">
          <input className="field" type={showPassword ? 'text' : 'password'} placeholder="••••••••" defaultValue="123456" />
          <button className="eye-btn" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
        </div>
        <button className="primary-btn full" onClick={onLogin}>Continue to Dashboard <span>→</span></button>
        <div className="secure-note"><span>✦</span> App-first interface • APK-ready foundation</div>
      </div>

      <div className="login-footer">Made With <span>❤️</span> By Shahid Sir</div>
    </div>
  );
}

function Dashboard({ dateText, timeText, onNavigate }) {
  return (
    <>
      <section className="hero-card">
        <div className="hero-copy">
          <div className="eyebrow light"><span className="dot" /> TEACHER DASHBOARD</div>
          <h1>Good morning,<br /><strong>Shahid Sir.</strong></h1>
          <p>{dateText}</p>
          <div className="live-time"><span className="pulse" /> {timeText} <span className="live-label">LIVE</span></div>
        </div>
        <div className="hero-orb"><span>EV</span></div>
      </section>

      <section className="section-block">
        <div className="section-head"><h2>Today at a glance</h2><button className="text-btn">View report →</button></div>
        <div className="stats-grid">
          <Stat value="128" label="Students" change="+8 this month" tone="mint" />
          <Stat value="94.8%" label="Attendance" change="↑ 2.4%" tone="blue" />
          <Stat value="₹42.5K" label="Fees collected" change="This month" tone="gold" />
        </div>
      </section>

      <section className="section-block">
        <div className="section-head"><h2>Quick actions</h2></div>
        <div className="quick-grid">
          {quickActions.map(item => (
            <button key={item.screen} className="quick-card" onClick={() => onNavigate(item.screen)}>
              <div className={`quick-icon ${item.tone}`}>{item.icon}</div>
              <div className="quick-text"><strong>{item.label}</strong><span>{item.sub}</span></div>
              <span className="arrow">↗</span>
            </button>
          ))}
        </div>
      </section>

      <section className="two-col">
        <div className="panel">
          <div className="section-head"><h2>Today's classes</h2><span className="pill">4 total</span></div>
          <ClassRow time="08:00" subject="English" batch="Class 10 • A" status="Done" />
          <ClassRow time="10:00" subject="SST" batch="Class 9 • A" status="Live" />
          <ClassRow time="14:30" subject="Science" batch="Class 8 • B" status="Upcoming" />
          <ClassRow time="17:00" subject="Math" batch="Class 7 • A" status="Upcoming" />
        </div>
        <div className="panel accent-panel">
          <div className="card-kicker">NEXT TEST</div>
          <h2>Social Science<br />Chapter Test</h2>
          <p className="muted">Class 10 • 25 questions • 30 min</p>
          <div className="progress"><span /></div>
          <div className="panel-foot"><span>Tomorrow • 10:30 AM</span><button className="small-btn" onClick={() => onNavigate('tests')}>Open</button></div>
        </div>
      </section>

      <div className="watermark">Made With ❤️ By Shahid Sir</div>
    </>
  );
}

function Stat({ value, label, change, tone }) {
  return <div className={`stat-card ${tone}`}><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-change">{change}</div></div>;
}

function ClassRow({ time, subject, batch, status }) {
  const cls = status.toLowerCase();
  return <div className="class-row"><div className="class-time">{time}</div><div className="class-info"><strong>{subject}</strong><span>{batch}</span></div><span className={`status ${cls}`}>{status}</span></div>;
}

function ModulePlaceholder({ screen, onBack }) {
  const data = {
    students: ['Students', 'Manage learners, batches and profiles.'],
    attendance: ['Attendance Pro', 'Daily attendance, monthly calendar and reports.'],
    fees: ['Fee Manager', 'Payments, pending fees and branded receipts.'],
    tests: ['Test Center', 'Create tests, manage attempts and results.']
  };
  const [title, subtitle] = data[screen] || ['Module', 'Module coming next.'];
  return <section className="module-page"><button className="back-btn" onClick={onBack}>← Back to dashboard</button><div className="module-icon">{screen === 'students' ? '♟' : screen === 'attendance' ? '✓' : screen === 'fees' ? '₹' : '▣'}</div><div className="eyebrow"><span className="dot" /> PHASE 1 FOUNDATION</div><h1>{title}</h1><p>{subtitle}</p><div className="coming-card"><strong>Shell ready for the next polished phase.</strong><span>This screen is intentionally lightweight for Phase 1. Full functionality will be added module-by-module.</span></div></section>;
}

function Profile({ onLogout }) {
  return <section className="module-page"><div className="profile-avatar">SS</div><div className="eyebrow"><span className="dot" /> ADMIN / TEACHER</div><h1>Shahid Sir</h1><p>EZEE VISION CHAMPUA</p><div className="profile-list"><div><span>Role</span><strong>Teacher & Admin</strong></div><div><span>Project</span><strong>Coaching + Learning App</strong></div><div><span>Foundation</span><strong>Phase 1 • App-first</strong></div></div><button className="secondary-btn full" onClick={onLogout}>Log out</button></section>;
}

createRoot(document.getElementById('root')).render(<App />);
