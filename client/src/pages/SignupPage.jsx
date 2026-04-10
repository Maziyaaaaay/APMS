import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Mechanical Engineering',
  'Electrical and Computer Science',
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    name: '', username: '', password: '', confirmPassword: '',
    email: '', department: '', rollNo: '', studentType: 'regular', designation: '',
    year: '', profileUrl: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const profilePicRef = useRef();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleProfilePicChange = async (e) => {
    const f = e.target.files[0];
    if (f) {
      try {
        const compressed = await compressImage(f);
        setForm(p => ({ ...p, profileUrl: compressed }));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    if (!form.name.trim() || !form.username.trim()) {
      setError('Name and username are required.'); return;
    }
    setLoading(true);
    try {
      await signup({
        role,
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
        email: form.email.trim() || undefined,
        department: form.department || undefined,
        rollNo: role === 'student' ? form.rollNo.trim() : undefined,
        studentType: role === 'student' ? form.studentType : undefined,
        designation: role === 'faculty' ? form.designation.trim() : undefined,
        year: role === 'student' ? form.year : undefined,
        profileUrl: role === 'student' ? form.profileUrl : undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate('/?registered=1'), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />

      <div className="login-card" style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <span className="material-symbols-outlined">school</span>
          </div>
          <h1 className="login-title">Join KTU APMS</h1>
          <p className="login-subtitle">Create your account to get started</p>
        </div>

        {/* Role Toggle */}
        <div style={{ display: 'flex', gap: 8, padding: '0 28px 4px', marginBottom: 4 }}>
          {[
            { key: 'student', icon: 'school',            label: 'Student'        },
            { key: 'faculty', icon: 'supervisor_account', label: 'Faculty Advisor'},
          ].map(r => (
            <button
              key={r.key}
              type="button"
              onClick={() => { setRole(r.key); setError(''); }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: role === r.key ? 'var(--primary)' : 'var(--surface2)',
                color:      role === r.key ? '#fff'           : 'var(--text-muted)',
                boxShadow:  role === r.key ? '0 2px 8px rgba(45,91,227,0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>

        {success ? (
          <div style={{ padding: '32px 28px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--success)', display: 'block', marginBottom: 12 }}>check_circle</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Account Created!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Redirecting you to login…</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '16px 28px 24px' }}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                {error}
              </div>
            )}

            {/* Common fields */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="input" placeholder="e.g. Arjun Menon" value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input className="input" placeholder="e.g. arjun2024" value={form.username} onChange={set('username')} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" placeholder="your@email.com" value={form.email} onChange={set('email')} />
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="input" value={form.department} onChange={set('department')}>
                <option value="">— Select Department —</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Student-specific fields */}
            {role === 'student' && (
              <>
                <div className="form-group">
                  <label className="form-label">Profile Icon</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div
                      style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}
                    >
                      {form.profileUrl ? (
                        <img src={form.profileUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>person</span>
                      )}
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => profilePicRef.current.click()}>
                      Choose Image
                    </button>
                    <input ref={profilePicRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePicChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Roll Number</label>
                    <input className="input" placeholder="e.g. KTU21CS001" value={form.rollNo} onChange={set('rollNo')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Student Type</label>
                    <select className="input" value={form.studentType} onChange={set('studentType')}>
                      <option value="regular">Regular (120 pts)</option>
                      <option value="lateral">Lateral Entry (90 pts)</option>
                      <option value="pwd">PwD (60 pts)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Year of Study</label>
                  <select className="input" value={form.year} onChange={set('year')}>
                    <option value="">— Select Year —</option>
                    <option value="1">First Year</option>
                    <option value="2">Second Year</option>
                    <option value="3">Third Year</option>
                    <option value="4">Fourth Year</option>
                  </select>
                </div>
              </>
            )}

            {/* Faculty-specific fields */}
            {role === 'faculty' && (
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="input" placeholder="e.g. Assistant Professor" value={form.designation} onChange={set('designation')} />
              </div>
            )}

            {/* Password fields */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input className="input" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <><span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>refresh</span> Creating account…</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span> Create Account</>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </div>
          </form>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => setDark(d => !d)}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{dark ? 'light_mode' : 'dark_mode'}</span>
        </button>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
