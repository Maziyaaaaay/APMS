import BrandLogo from '../components/BrandLogo';
import { AmbientBackdrop } from '../components/DashboardKit';
import AchievementScene from '../components/AchievementScene';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup, verifyEtlabStudent } from '../utils/auth';
import { getDepartments } from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';

export default function SignupPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({
    name: '', username: '', password: '', confirmPassword: '',
    email: '', phone: '', department: '', rollNo: '', studentType: 'regular', designation: '',
    year: '', profileUrl: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [etlabUsername, setEtlabUsername] = useState('');
  const [etlabPassword, setEtlabPassword] = useState('');
  const [etlabIdentity, setEtlabIdentity] = useState(null);
  const [etlabProof, setEtlabProof] = useState('');
  const [verifyingEtlab, setVerifyingEtlab] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    let active = true;
    getDepartments().then(data => { if (active) setDepartments(data); })
      .catch(() => { if (active) setError('Could not load departments. Refresh this page to try again.'); })
      .finally(() => { if (active) setDepartmentsLoading(false); });
    return () => { active = false; };
  }, []);

  const profilePicRef = useRef();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleVerifyEtlab = async () => {
    setError('');
    if (!etlabUsername.trim() || !etlabPassword) {
      setError('Enter your ET Lab username and password first.');
      return;
    }
    const password = etlabPassword;
    setEtlabPassword('');
    setVerifyingEtlab(true);
    try {
      const result = await verifyEtlabStudent({
        username: etlabUsername.trim(),
        password,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const matchedDepartment = departments.find(department =>
        department.trim().toLowerCase() === String(result.identity.department || '').trim().toLowerCase()
      ) || '';
      const missingContact = [
        !result.identity.email && 'email',
        !result.identity.phone && 'phone number',
      ].filter(Boolean);
      if (missingContact.length) {
        setError(`Your ET Lab profile is missing ${missingContact.join(' and ')}. Update your student contact details in ET Lab, then verify again.`);
        return;
      }
      if (!matchedDepartment) {
        setError('Your verified KTU branch does not match an APMS department. Contact the APMS administrator.');
        return;
      }
      setEtlabIdentity({ ...result.identity, department: matchedDepartment });
      setEtlabProof(result.proof);
      setForm(current => ({
        ...current,
        name: result.identity.name,
        rollNo: result.identity.registrationNo,
        username: result.identity.registrationNo,
        email: result.identity.email,
        phone: result.identity.phone,
        department: matchedDepartment,
      }));
      setEtlabUsername('');
    } catch {
      setError('Could not reach APMS to verify ET Lab. Check your connection and try again.');
    } finally {
      setVerifyingEtlab(false);
    }
  };

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
    if (role === 'student' && !etlabIdentity) {
      await handleVerifyEtlab();
      return;
    }
    if (role !== 'student' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    if (form.password.length < 12) {
      setError('Password must be at least 12 characters.'); return;
    }
    if (role === 'student' && (!etlabIdentity || !etlabProof)) {
      setError('Verify your student identity with ET Lab before continuing.'); return;
    }
    if (!form.name.trim() || !(role === 'student' ? form.rollNo.trim() : form.username.trim())) {
      setError(role === 'student' ? 'Name and KTU registration number are required.' : 'Name and username are required.'); return;
    }
    if (!form.email.trim() || !form.phone.trim()) { setError('Email and phone number are required.'); return; }
    setLoading(true);
    try {
      const result = await signup({
        role,
        name: form.name.trim(),
        username: role === 'student' ? form.rollNo.trim().toUpperCase() : form.username.trim(),
        password: form.password,
        email: form.email.trim() || undefined,
        phone: form.phone.trim(),
        department: form.department || undefined,
        rollNo: role === 'student' ? form.rollNo.trim() : undefined,
        studentType: role === 'student' ? form.studentType : undefined,
        designation: role === 'faculty' ? form.designation.trim() : undefined,
        year: role === 'student' ? form.year : undefined,
        profileUrl: role === 'student' ? form.profileUrl : undefined,
        etlabVerificationToken: role === 'student' ? etlabProof : undefined,
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
      {/* ── Left branded panel (desktop only) ── */}
      <div className="login-brand-panel">
        <div className="login-brand-logo"><BrandLogo />
        </div>

        <div className="brand-eyebrow">YOUR NEXT CHAPTER.</div><h2>A world to explore.<br /><em>A journey to own.</em></h2>
        <p>Your achievements. All in one place.</p>

        <AchievementScene />
        <div className="login-features">
          <div className="login-feature-item">
            <div className="login-feature-dot">
              <span className="material-symbols-outlined">verified</span>
            </div>
            <span>Verified Certificate Submissions</span>
          </div>
          <div className="login-feature-item">
            <div className="login-feature-dot">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <span>Real-time Credit Calculation</span>
          </div>
          <div className="login-feature-item">
            <div className="login-feature-dot">
              <span className="material-symbols-outlined">security</span>
            </div>
            <span>Secure Institutional Access</span>
          </div>
        </div>

        <div className="login-brand-footer">© 2024 KTU APMS. All rights reserved.</div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-form-panel">
        <div className="login-form-inner" style={{ maxWidth: 480 }}>

          {/* Theme toggle  /  top right */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              className="theme-toggle"
              onClick={() => setDark(d => !d)}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {dark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>

          {/* Mobile logo */}
          <div className="login-mobile-logo"><BrandLogo />
          </div>

          <div className="login-heading">
            <h2>Join KTU APMS</h2>
            <p>Create your account to get started</p>
          </div>

          {/* Role Toggle */}
          <div className="login-role-tabs">
            {[
              { key: 'student', label: 'Student' },
              { key: 'faculty', label: 'Faculty Advisor' },
            ].map(r => (
              <button
                key={r.key}
                type="button"
                className={`role-tab ${role === r.key ? 'active' : ''}`}
                onClick={() => {
                  setRole(r.key); setError(''); setEtlabIdentity(null); setEtlabProof('');
                  setEtlabUsername(''); setEtlabPassword('');
                }}
              >
                {r.label}
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
              {error && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>error</span>
                  {error}
                </div>
              )}

              {role === 'student' && !etlabIdentity && (
                <section className="etlab-verification-card" aria-labelledby="etlab-verification-title">
                  <div className="etlab-verification-heading">
                    <span className="material-symbols-outlined" aria-hidden="true">school</span>
                    <div>
                      <h3 id="etlab-verification-title">Verify your student account</h3>
                      <p>Sign in once to import your verified student profile.</p>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="etlab-username">ET Lab Username *</label>
                    <input id="etlab-username" className="input" autoComplete="username" placeholder="Your ET Lab username" value={etlabUsername} onChange={e => setEtlabUsername(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="etlab-password">ET Lab Password *</label>
                    <input id="etlab-password" className="input" type="password" autoComplete="current-password" placeholder="Your ET Lab password" value={etlabPassword} onChange={e => setEtlabPassword(e.target.value)} required />
                  </div>
                  <button type="button" className="btn btn-outline" onClick={handleVerifyEtlab} disabled={verifyingEtlab || departmentsLoading || !departments.length}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{verifyingEtlab ? 'progress_activity' : 'verified_user'}</span>
                    {verifyingEtlab ? 'Checking ET Lab…' : 'Verify with ET Lab'}
                  </button>
                  <p className="etlab-privacy-note">Your ET Lab password is used only for verification and is never saved by APMS.</p>
                </section>
              )}

              {(role === 'faculty' || etlabIdentity) && (
                <>
                  {role === 'student' ? (
                    <div className="etlab-verified-identity">
                      <span className="material-symbols-outlined" aria-hidden="true">verified</span>
                      <div><strong>{etlabIdentity.name}</strong><span>{etlabIdentity.registrationNo} · Verified with ET Lab</span></div>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEtlabIdentity(null); setEtlabProof(''); setForm(p => ({ ...p, name: '', rollNo: '', username: '', email: '', phone: '', department: '' })); }}>Change</button>
                    </div>
                  ) : (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input className="input" placeholder="e.g. Arjun Menon" value={form.name} onChange={set('name')} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Username *</label>
                        <input className="input" placeholder="e.g. arjun.menon" value={form.username} onChange={set('username')} required />
                      </div>
                    </div>
                  )}

              {role === 'student' ? (
                <section className="etlab-verification-card" aria-label="Imported student profile">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Email · from ET Lab</label>
                      <input className="input" type="email" value={form.email} readOnly aria-readonly="true" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone · from ET Lab</label>
                      <input className="input" type="tel" value={form.phone} readOnly aria-readonly="true" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department · from KTU registration</label>
                    <input className="input" value={form.department} readOnly aria-readonly="true" />
                  </div>
                </section>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input className="input" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="input" value={form.department} onChange={set('department')} required disabled={departmentsLoading}>
                      <option value=""> /  Select Department  / </option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </>
              )}

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
                      <option value=""> /  Select Year  / </option>
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

              </>
              )}

              {(role === 'faculty' || etlabIdentity) && (
                <>
                  {role === 'student' ? (
                    <div className="form-group">
                      <label className="form-label">APMS Password *</label>
                      <input className="input" type="password" autoComplete="new-password" placeholder="Min. 12 characters" minLength={12} value={form.password} onChange={set('password')} required />
                    </div>
                  ) : (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">APMS Password *</label>
                        <input className="input" type="password" autoComplete="new-password" placeholder="Min. 12 characters" minLength={12} value={form.password} onChange={set('password')} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Confirm APMS Password *</label>
                        <input className="input" type="password" autoComplete="new-password" placeholder="Re-enter password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="login-submit-btn"
                    disabled={loading || departmentsLoading || !departments.length}
                  >
                    {loading ? (
                      <><span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>refresh</span> Creating account…</>
                    ) : (
                      <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span> Create Account</>
                    )}
                  </button>
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <Link to="/" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
