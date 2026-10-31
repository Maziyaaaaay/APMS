import BrandLogo from '../components/BrandLogo';
import InterfaceIcon from '../components/InterfaceIcon';
import { AmbientBackdrop } from '../components/DashboardKit';
import AchievementScene from '../components/AchievementScene';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { login } from '../utils/auth';

const ROLES = [
    { key: 'student',  label: 'Student' },
    { key: 'faculty',  label: 'Faculty Advisor' },
    { key: 'admin',    label: 'Admin' },
];

export default function Login() {
    const navigate = useNavigate();
    const [role,     setRole]     = useState('student');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPw,   setShowPw]   = useState(false);
    const [remember, setRemember] = useState(false);
    const [error,    setError]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [dark,     setDark]     = useState(
        () => localStorage.getItem('theme') === 'dark'
    );
    const [searchParams] = useSearchParams();
    const justRegistered = searchParams.get('registered') === '1';

    /* Apply dark class to <html> */
    useEffect(() => {
        if (dark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [dark]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await login(username, password, role);
            if (result.success) {
                navigate(`/${role === 'faculty' ? 'faculty' : role}`);
            } else {
                setError(result.message);
            }
        } catch {
            setError('Connection error  /  make sure the server is running.');
        }
        setLoading(false);
    };

    return (
        <div className="login-page">
            <AmbientBackdrop />
            {/* ── Left branded panel (desktop only) ── */}
            <div className="login-brand-panel">
                <div className="login-brand-logo"><BrandLogo />
                </div>

                <div className="brand-eyebrow">BEYOND THE CLASSROOM.</div>
                <h2>Make it count.<br /><em>Keep the record.</em></h2>
                <p>Your achievements. All in one place.</p>
                <AchievementScene />
                <div className="login-brand-footer">KTU APMS · Your campus, connected.</div>
            </div>

            {/* ── Right form panel ── */}
            <div className="login-form-panel">
                <div className="login-form-inner">

                    {/* Theme toggle  /  top right */}
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: 16 }}>
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
                        <h2>Welcome back.</h2>
                        <p>Choose your role to sign in.</p>
                    </div>

                    {/* Role tabs */}
                    <div className="login-role-tabs">
                        {ROLES.map(r => (
                            <button
                                key={r.key}
                                className={`role-tab ${role === r.key ? 'active' : ''}`}
                                onClick={() => { setRole(r.key); setError(''); }}
                                type="button"
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin}>
                        {/* Username */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="username">{role === 'student' ? 'KTU Registration Number' : 'Username'}</label>
                            <div className="input-icon-wrap">

                                <input
                                    className="input"
                                    id="username"
                                    type="text"
                                    placeholder={role === 'student' ? 'Enter your KTU registration number' : `Enter ${role} username`}
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <div className="input-icon-wrap input-action-wrap" style={{ position:'relative' }}>

                                <input
                                    className="input"
                                    id="password"
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    style={{ paddingLeft: 16, paddingRight: 52 }}
                                />
                                <button
                                    type="button"
                                    className="input-action-btn"
                                    onClick={() => setShowPw(v => !v)}
                                    aria-label={showPw ? "Hide password" : "Show password"}
                                    aria-pressed={showPw}
                                >
                                    <InterfaceIcon name={showPw ? 'visibility_off' : 'visibility'} />
                                </button>
                            </div>
                        </div>

                        {/* Remember me */}
                        <div className="checkbox-row">
                            <input
                                type="checkbox"
                                id="remember"
                                checked={remember}
                                onChange={e => setRemember(e.target.checked)}
                            />
                            <label htmlFor="remember">Remember this device</label>
                        </div>

                        {/* Registration success banner */}
                        {justRegistered && !error && (
                            <div className="alert alert-success" style={{ marginBottom: 16 }}>
                                <InterfaceIcon name="check_circle" />
                                Account created successfully! Please log in with your credentials.
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 16 }}>
                                <InterfaceIcon name="error_outline" />
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            className="login-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <InterfaceIcon name="progress_activity" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Login to Dashboard
                                    <InterfaceIcon name="arrow_forward" />
                                </>
                            )}
                        </button>

                        <Link to="/forgot-password" className="login-forgot">Forgot Password?</Link>
                    </form>

                    {/* Sign Up link */}
                    <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text-muted)' }}>
                        New to the system?{' '}
                        <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign up here</Link>
                    </div>

                    {/* Support links */}
                    <div className="login-support">
                        <p>Support Resources</p>
                        <div className="login-support-links">
                            <button onClick={() => setShowHelp(true)} className="btn-ghost" style={{ border:'none', background:'none', padding:0, cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--text-muted)' }}>
                                <InterfaceIcon name="help_outline" />
                                Help Center
                            </button>
                            <button onClick={() => setShowGuide(true)} className="btn-ghost" style={{ border:'none', background:'none', padding:0, cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--text-muted)' }}>
                                <InterfaceIcon name="menu_book" />
                                User Guide
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Help Center Modal */}
            {showHelp && (
                <div className="modal-overlay" onClick={() => setShowHelp(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <InterfaceIcon name="support_agent" />
                                <h2>Help Center</h2>
                            </div>
                            <button className="btn-icon" onClick={() => setShowHelp(false)}>
                                <InterfaceIcon name="close" />
                            </button>
                        </div>
                        <div className="modal-body" style={{ lineHeight: '1.6' }}>
                            <p style={{ marginBottom: 16 }}>Welcome to the KTU APMS Support Center. If you are experiencing technical difficulties, please choose from the common solutions below:</p>
                            
                            <h4 style={{ marginBottom: 4, color: 'var(--text)' }}>1. Cannot login with my credentials?</h4>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Ensure you are selecting the correct role tab (Student vs Faculty). Student IDs are strictly case-sensitive. Check with your department admin if your account was flagged inactive.</p>

                            <h4 style={{ marginBottom: 4, color: 'var(--text)' }}>2. How do I report a bug?</h4>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>You can reach out to your respective college IT administrating department or submit a technical query to <a href="mailto:support@ktu.edu.in" style={{color:'var(--accent)'}}>support@ktu.edu.in</a></p>

                            <h4 style={{ marginBottom: 4, color: 'var(--text)' }}>3. Activity points aren't calculating correctly?</h4>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 0 }}>Remember that Activity Points only count towards your total sum once your Faculty Advisor explicitly marks the certificate as "Approved".</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setShowHelp(false)}>Understood</button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Guide Modal */}
            {showGuide && (
                <div className="modal-overlay" onClick={() => setShowGuide(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <InterfaceIcon name="menu_book" />
                                <h2>System User Guide</h2>
                            </div>
                            <button className="btn-icon" onClick={() => setShowGuide(false)}>
                                <InterfaceIcon name="close" />
                            </button>
                        </div>
                        <div className="modal-body" style={{ lineHeight: '1.6' }}>
                            <p style={{ marginBottom: 16 }}>The Activity Point Management System serves to digitize certificate storage and KTU degree point evaluations. Here is a brief guide:</p>

                            <h4 style={{ marginBottom: 4, color: 'var(--text)' }}>For Students 🎓</h4>
                            <ul style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px 20px', padding: 0 }}>
                                <li><strong>Sign up:</strong> Create an account using your KTU Roll Number.</li>
                                <li><strong>Upload:</strong> Navigate to the submissions tab and upload your activity certificate images.</li>
                                <li><strong>Track:</strong> View your live progress tracking circle chart on your dashboard.</li>
                            </ul>

                            <h4 style={{ marginBottom: 4, color: 'var(--text)' }}>For Faculty Advisors 👨‍🏫</h4>
                            <ul style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 0 20px', padding: 0 }}>
                                <li><strong>Review:</strong> Approve or reject pending student submissions in your departmental inbox.</li>
                                <li><strong>Override:</strong> Adjust the automatic point calculations dynamically prior to saving approval.</li>
                                <li><strong>Generate:</strong> Export PDF summary documents for your students automatically!</li>
                            </ul>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setShowGuide(false)}>Close Guide</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
