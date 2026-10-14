import BrandLogo from '../components/BrandLogo';
import { AmbientBackdrop } from '../components/DashboardKit';
import AchievementScene from '../components/AchievementScene';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../utils/auth';
import { getDepartments } from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';

export default function SignupPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    name: '', username: '', password: '', confirmPassword: '',
    email: '', phone: '', department: '', rollNo: '', studentType: 'regular',
    designation: '', year: '', profileUrl: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const profilePicRef = useRef();

  useEffect(() => {
    let active = true;
    getDepartments().then(data => { if (active) setDepartments(data); })
      .catch(() => { if (active) setError('Could not load departments. Refresh this page to try again.'); })
      .finally(() => { if (active) setDepartmentsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const set = field => e => setForm(current => ({ ...current, [field]: e.target.value }));

  const handleProfilePicChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setForm(current => ({ ...current, profileUrl: compressed }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.department) {
      setError('Complete your name, email, phone number, and department.');
      return;
    }
    if (role === 'student' && !form.rollNo.trim()) {
      setError('Enter your KTU registration number.');
      return;
    }
    if (role === 'faculty' && !form.username.trim()) {
      setError('Choose a username.');
      return;
    }

    setLoading(true);
    try {
      const result = await signup({
        role,
        name: form.name.trim(),
        username: role === 'student' ? form.rollNo.trim().toUpperCase() : form.username.trim(),
        password: form.password,
        email: form.email.trim(),
        phone: form.phone.trim(),
        department: form.department,
        rollNo: role === 'student' ? form.rollNo.trim().toUpperCase() : undefined,
        studentType: role === 'student' ? form.studentType : undefined,
        designation: role === 'faculty' ? form.designation.trim() : undefined,
        year: role === 'student' ? form.year : undefined,
        profileUrl: role === 'student' ? form.profileUrl : undefined,
      });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => navigate('/?registered=1'), 1800);
      } else {
        setError(result.message);
      }
    } catch {
      setError('Could not reach APMS. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <AmbientBackdrop />
      <div className="login-brand-panel">
        <div className="login-brand-logo"><BrandLogo /></div>
        <div className="brand-eyebrow">YOUR NEXT CHAPTER.</div>
        <h2>A world to explore.<br /><em>A journey to own.</em></h2>
        <p>Your achievements. All in one place.</p>
        <AchievementScene />
        <div className="login-features">
          <div className="login-feature-item"><div className="login-feature-dot"><span className="material-symbols-outlined">verified</span></div><span>Verified Certificate Submissions</span></div>
          <div className="login-feature-item"><div className="login-feature-dot"><span className="material-symbols-outlined">analytics</span></div><span>Real-time Credit Calculation</span></div>
          <div className="login-feature-item"><div className="login-feature-dot"><span className="material-symbols-outlined">security</span></div><span>Secure Institutional Access</span></div>
        </div>
        <div className="login-brand-footer">© 2024 KTU APMS. All rights reserved.</div>
      </div>

      <div className="login-form-panel">
        <div className="login-form-inner" style={{ maxWidth: 480 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="theme-toggle" type="button" onClick={() => setDark(value => !value)} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{dark ? 'light_mode' : 'dark_mode'}</span>
            </button>
          </div>
          <div className="login-mobile-logo"><BrandLogo /></div>
          <div className="login-heading">
            <h2>Join KTU APMS</h2>
            <p>Create your account to get started</p>
          </div>
          <div className="login-role-tabs">
            {[{ key: 'student', label: 'Student' }, { key: 'faculty', label: 'Faculty Advisor' }].map(item => (
              <button key={item.key} type="button" className={`role-tab ${role === item.key ? 'active' : ''}`} onClick={() => { setRole(item.key); setError(''); }}>
                {item.label}
              </button>
            ))}
          </div>

          {success ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--success)', display: 'block', marginBottom: 12 }}>check_circle</span>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Request submitted</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{role === 'student' ? 'Your department faculty advisor must approve your account before you can sign in.' : 'An administrator must approve your faculty account before you can sign in.'}</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>error</span>{error}</div>}

              {role === 'student' ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="student-name">Full Name *</label>
                      <input id="student-name" className="input" autoComplete="name" placeholder="Your full name" value={form.name} onChange={set('name')} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="student-roll">KTU Registration Number *</label>
                      <input id="student-roll" className="input" autoComplete="username" placeholder="e.g. TLY23CS001" value={form.rollNo} onChange={set('rollNo')} required />
                    </div>
                  </div>
                </>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="faculty-name">Full Name *</label>
                    <input id="faculty-name" className="input" autoComplete="name" placeholder="Your full name" value={form.name} onChange={set('name')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="faculty-username">Username *</label>
                    <input id="faculty-username" className="input" autoComplete="username" placeholder="Choose a username" value={form.username} onChange={set('username')} required />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="signup-email">Email Address *</label>
                <input id="signup-email" className="input" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-phone">Phone Number *</label>
                <input id="signup-phone" className="input" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-department">Department *</label>
                <select id="signup-department" className="input" value={form.department} onChange={set('department')} required disabled={departmentsLoading}>
                  <option value="">Select Department</option>
                  {departments.map(department => <option key={department} value={department}>{department}</option>)}
                </select>
              </div>

              {role === 'student' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Profile Picture</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {form.profileUrl ? <img src={form.profileUrl} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>person</span>}
                      </div>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => profilePicRef.current?.click()}>Choose Image</button>
                      <input ref={profilePicRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePicChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Student Type</label>
                      <select className="input" value={form.studentType} onChange={set('studentType')}>
                        <option value="regular">Regular (120 pts)</option>
                        <option value="lateral">Lateral Entry (90 pts)</option>
                        <option value="pwd">PwD (60 pts)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Year of Study</label>
                      <select className="input" value={form.year} onChange={set('year')}>
                        <option value="">Select Year</option>
                        <option value="1">First Year</option>
                        <option value="2">Second Year</option>
                        <option value="3">Third Year</option>
                        <option value="4">Fourth Year</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {role === 'faculty' && (
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input className="input" placeholder="e.g. Assistant Professor" value={form.designation} onChange={set('designation')} />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-password">Password *</label>
                  <input id="signup-password" className="input" type="password" autoComplete="new-password" placeholder="At least 12 characters" minLength={12} value={form.password} onChange={set('password')} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-confirm-password">Confirm Password *</label>
                  <input id="signup-confirm-password" className="input" type="password" autoComplete="new-password" placeholder="Re-enter password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading || departmentsLoading || !departments.length}>
                {loading ? <><span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>refresh</span> Creating account…</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span> Create Account</>}
              </button>
              <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text-muted)' }}>
                Already have an account? <Link to="/" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
