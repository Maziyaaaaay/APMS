import BrandLogo from '../components/BrandLogo';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';
import { getCertificatesByStudent, addCertificate, uploadCertificate, updateUser, getCertificateFileUrl } from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';
import { ACTIVITIES, getActivityForCertificate, getActivitiesByGroup, calculatePoints, calculateStudentSummary, STUDENT_TYPES } from '../utils/points';

const KTU_RULES = [
    "Only the highest achievement level for the same event is counted.",
    "Participation and winner points cannot be combined for the same event.",
    "Each activity has its own maximum; the handbook also caps each group at 40 points.",
    "Regular students need 40 points per group; Lateral Entry students need 30 and PwD students need 20.",
    "Activities must be completed during the programme period.",
    "Only KTU/University-approved skilling courses are eligible.",
    "Activity Points do NOT affect SGPA or CGPA.",
    "Degree will NOT be awarded without fulfilling Activity Points requirement.",
    "Submission of fake certificates leads to cancellation and disciplinary action.",
    "Maintain an Activity Points File each semester, verified by your SFA.",
];

const NAV_ITEMS = [
    { key: 'dashboard',    icon: 'dashboard',     label: 'Dashboard'       },
    { key: 'submit',       icon: 'post_add',       label: 'Submit Activity' },
    { key: 'submissions',  icon: 'history_edu',    label: 'My Submissions'  },
    { key: 'profile',      icon: 'person',         label: 'Profile'         },
];

const GROUP_META = [
    { key: 'group1', label: 'Group I',   sub: 'Co-curricular Activities',    iconBg: 'rgba(45,91,227,0.1)',  iconColor: 'var(--accent)',   fillColor: 'var(--accent)'   },
    { key: 'group2', label: 'Group II',  sub: 'Professional Development',    iconBg: 'rgba(30,140,90,0.1)',  iconColor: 'var(--success)',  fillColor: 'var(--success)'  },
    { key: 'group3', label: 'Group III', sub: 'Innovation & Entrepreneurship',iconBg: 'rgba(139,92,246,0.1)',iconColor: '#7c3aed',          fillColor: '#7c3aed'         },
];

export default function StudentPortal() {
    const navigate  = useNavigate();
    const [user, setUser] = useState(() => getCurrentUser());
    const [tab,          setTab]          = useState('dashboard');
    const [certs,        setCerts]        = useState([]);
    const [showGuidelines, setShowGuidelines] = useState(false);
    const [dark,         setDark]         = useState(() => document.documentElement.classList.contains('dark'));

    const [loadError, setLoadError] = useState('');
    const refreshCerts = useCallback(async () => {
        try { setCerts(await getCertificatesByStudent()); setLoadError(''); }
        catch (err) { setLoadError(err.message); }
    }, []);
    useEffect(() => {
        if (!user) { navigate('/'); return; }
        Promise.resolve().then(refreshCerts);
        const interval = setInterval(refreshCerts, 30000);
        return () => clearInterval(interval);
    }, [user, navigate, tab, refreshCerts]);

    const summary = calculateStudentSummary(certs, user?.studentType || user?.student_type || 'regular');
    const req     = STUDENT_TYPES[user?.studentType || user?.student_type || 'regular'];

    const handleLogout = () => { logout(); navigate('/'); };
    const toggleDark   = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
    };

    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'ST';

    return (
        <div className="portal-layout student-portal role-workspace">
            <header className="role-masthead">
                <div className="role-masthead-top">
                    <div className="role-identity"><BrandLogo /><span>STUDENT SPACE</span></div>
                    <div className="role-masthead-actions">
                        <button className="role-guidelines" onClick={() => setShowGuidelines(true)}><span className="material-symbols-outlined">menu_book</span><span>Guide</span></button>
                        <button className="role-theme" onClick={toggleDark} aria-label={dark ? 'Switch to day mode' : 'Switch to night mode'}><span className="material-symbols-outlined">{dark ? 'light_mode' : 'dark_mode'}</span></button>
                        <button className="role-account" onClick={() => setTab('profile')} aria-label="Open profile">{user?.profileUrl ? <img src={user.profileUrl} alt="" /> : initials}</button>
                    </div>
                </div>
                <div className="role-nav-line">
                    <nav className="role-nav" aria-label="Student navigation">{NAV_ITEMS.map(item => <button key={item.key} className={tab === item.key ? 'active' : ''} aria-current={tab === item.key ? 'page' : undefined} onClick={() => setTab(item.key)}><span className="material-symbols-outlined">{item.icon}</span>{item.label}</button>)}</nav>
                    <span className="role-context">{user?.rollNo} · {user?.department}</span>
                </div>
            </header>
            <main className="role-main">
                {/* Page Content */}
                <div className="page-content" key={tab}>
                    {loadError && <div role="alert" className="alert alert-danger">{loadError} <button onClick={refreshCerts}>Try again</button></div>}
                    {tab === 'dashboard'   && <DashboardTab   user={user} certs={certs} summary={summary} req={req} onSubmit={() => setTab('submit')} onViewAll={() => setTab('submissions')} />}
                    {tab === 'submit'      && <SubmitTab      user={user} onSuccess={() => { refreshCerts(); setTab('submissions'); }} />}
                    {tab === 'submissions' && <SubmissionsTab certs={certs} />}
                    {tab === 'profile'     && <ProfileTab     user={user} onUpdateUser={setUser} summary={summary} req={req} onLogout={handleLogout} onGuidelines={() => setShowGuidelines(true)} />}
                </div>
            </main>

            {showGuidelines && <GuidelinesModal onClose={() => setShowGuidelines(false)} />}
        </div>
    );
}


function DashboardTab({ user, certs, summary, req, onSubmit, onViewAll }) {
    const pending = certs.filter(cert => cert.status === 'pending').length;
    const approved = certs.filter(cert => cert.status === 'approved').length;
    const rejected = certs.filter(cert => cert.status === 'rejected').length;
    const recent = [...certs].sort((a,b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)).slice(0,4);
    const remaining = Math.max(0, req.total - summary.total);
    return <div className="role-dashboard student-dashboard">
        <section className="role-intro">
            <div><span className="role-kicker">YOUR ACTIVITY JOURNEY</span><h1>Hi, {user?.name?.split(' ')[0] || 'there'}<em>.</em></h1><p>Here’s where your points stand today.</p></div>
            <button className="role-primary-action" onClick={onSubmit}><span className="material-symbols-outlined">add_circle</span>Submit an activity</button>
        </section>
        <div className="student-feature-layout">
            <section className="student-journey-card">
                <div className="journey-copy"><span className="role-kicker">APPROVED POINTS</span><div className="journey-number">{summary.total}<span> / {req.total}</span></div><h2>{remaining ? `${remaining} points to go` : 'Target reached'}</h2><p>Estimated from approved certificates. Your faculty advisor confirms eligibility.</p><button onClick={onViewAll}>See submissions <span className="material-symbols-outlined">arrow_forward</span></button></div>
                <div className="journey-art" aria-label={`${summary.total} of ${req.total} estimated points`}><div className="journey-ring" style={{'--journey-pct':`${Math.min(100,(summary.total/req.total)*100)}%`}}><span className="material-symbols-outlined">workspace_premium</span></div></div>
            </section>
            <aside className="student-status-panel"><div className="status-panel-heading"><span className="role-kicker">AT A GLANCE</span><h2>Your submissions</h2></div><button onClick={onViewAll}><span className="status-dot waiting"/><span>Awaiting review</span><strong>{pending}</strong></button><button onClick={onViewAll}><span className="status-dot accepted"/><span>Approved</span><strong>{approved}</strong></button><button onClick={onViewAll}><span className="status-dot declined"/><span>Needs attention</span><strong>{rejected}</strong></button></aside>
        </div>
        <section className="student-groups-section"><div className="role-section-heading"><div><span className="role-kicker">THREE GROUPS</span><h2>Build your balance.</h2></div><p>Each group needs {req.perGroup} points.</p></div><div className="student-group-list">{GROUP_META.map((group,index) => { const value = summary[group.key] || 0; return <article className="student-group-row" key={group.key}><span className="group-index">0{index+1}</span><div className="group-title"><h3>{group.label}</h3><p>{group.sub}</p></div><div className="group-meter"><div><i style={{width:`${Math.min(100,(value/req.perGroup)*100)}%`}} /></div><span>{Math.max(0,req.perGroup-value)} left</span></div><strong>{value}<small>/{req.perGroup}</small></strong></article>; })}</div></section>
        <section className="role-recent-section"><div className="role-section-heading"><div><span className="role-kicker">LATEST ACTIVITY</span><h2>Recent submissions.</h2></div><button className="role-text-action" onClick={onViewAll}>View all <span className="material-symbols-outlined">arrow_forward</span></button></div>{recent.length ? <div className="role-recent-list">{recent.map(cert => {const activity = getActivityForCertificate(cert);return <div className="role-recent-row" key={cert.id}><div className="recent-icon"><span className="material-symbols-outlined">description</span></div><div><strong>{activity?.name || cert.activityName}</strong><span>{new Date(cert.created_at || cert.createdAt).toLocaleDateString('en-IN')} · Group {activity?.group || '—'}</span></div><span className={`badge badge-${cert.status}`}>{cert.status}</span><b>{cert.points_awarded ?? cert.pointsAwarded} pts</b></div>})}</div> : <div className="role-empty"><span className="material-symbols-outlined">add_notes</span><h3>Nothing submitted yet</h3><p>Your first activity starts here.</p><button onClick={onSubmit}>Submit an activity</button></div>}</section>
    </div>;
}

function SubmitTab({ user, onSuccess }) {
    const [step,          setStep]          = useState(0); // 0=select group, 1=fill details
    const [group,         setGroup]         = useState(1);
    const [activityId,    setActivityId]    = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [hours,         setHours]         = useState('');
    const [description,   setDescription]   = useState('');
    const [eventName,     setEventName]     = useState('');
    const [activityDate,  setActivityDate]  = useState('');
    const [academicYear,  setAcademicYear]  = useState('');
    const [uploadedFile,  setUploadedFile]  = useState(null);
    const [submitting,    setSubmitting]    = useState(false);
    const [success,       setSuccess]       = useState(false);
    const [submitError,   setSubmitError]   = useState('');
    const fileInputRef = React.useRef();

    const activity     = ACTIVITIES[activityId];
    const activities   = getActivitiesByGroup(group);
    const needsLevel   = activity?.type === 'level' || activity?.type === 'choice';
    const previewPoints = activityId ? calculatePoints(activityId, selectedLevel, hours) : 0;

    const byCategory = activities.reduce((acc, a) => {
        acc[a.category] = acc[a.category] || [];
        acc[a.category].push(a);
        return acc;
    }, {});

    const STEPS = ['Activity Details', 'Upload Certificate', 'Review & Submit'];

    const handleSelectActivity = (id) => { setActivityId(id); setSelectedLevel(''); setStep(1); };

    const handleFileChange = (e) => { const f = e.target.files[0]; if (f) setUploadedFile(f); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError('');

        let uploadReceipt;
        try { uploadReceipt = await uploadCertificate(uploadedFile); }
        catch (err) { setSubmitError(err.message); setSubmitting(false); return; }

        try {
            await addCertificate({
                studentId:     user.id,
                activityId,
                activityName:  activity.name,
                levelSelected: selectedLevel,
                hours: activity.type === 'hours' ? parseFloat(hours) : null,
                description,
                eventName: eventName.trim(),
                activityDate,
                academicYear: academicYear.trim(),
                uploadReceipt,
                fileName: uploadedFile?.name || null,
                pointsAwarded: calculatePoints(activityId, selectedLevel, hours),
            });
            setSubmitting(false);
            setSuccess(true);
            setTimeout(onSuccess, 1800);
        } catch (err) {
            console.error('Submit error:', err);
            setSubmitError(err.message || 'Upload failed. Please try again.');
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="success-screen">
                <div className="success-icon-wrap">
                    <span className="material-symbols-outlined">check_circle</span>
                </div>
                <h2>Certificate Submitted!</h2>
                <p style={{ marginBottom: 8 }}>
                    {previewPoints > 0 ? `${previewPoints} points` : 'Your submission'} is pending Faculty Advisor review.
                </p>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>Redirecting to your submissions…</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 860, margin:'0 auto' }}>
            {/* Step Indicator */}
            <div className="step-indicator">
                {STEPS.map((s, i) => (
                    <React.Fragment key={s}>
                        <div className="step-item">
                            <div className={`step-circle ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                                {i < step
                                    ? <span className="material-symbols-outlined" style={{ fontSize:16 }}>check</span>
                                    : i + 1}
                            </div>
                            <span className={`step-label ${i === step ? 'active' : ''}`}>{s}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`step-connector ${i < step ? 'done' : ''}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:20, alignItems:'start' }}>
                {/* ── Left: Main Form Card ── */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span className="material-symbols-outlined" style={{ color:'var(--accent)', fontSize:20 }}>info</span>
                            <h3>{step === 0 ? 'Select Activity' : activity?.name}</h3>
                        </div>
                        {step === 1 && (
                            <button className="btn btn-ghost btn-sm" onClick={() => { setStep(0); setActivityId(''); }}>
                                <span className="material-symbols-outlined" style={{ fontSize:16 }}>arrow_back</span>
                                Back
                            </button>
                        )}
                    </div>
                    <div className="card-body">
                        {step === 0 ? (
                            <>
                                {/* Group Selector */}
                                <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                                    {[1,2,3].map(g => (
                                        <button key={g}
                                            className={`btn ${group === g ? 'btn-primary' : 'btn-ghost'}`}
                                            style={{ flex:1 }}
                                            onClick={() => { setGroup(g); setActivityId(''); }}
                                        >
                                            Group {g}
                                        </button>
                                    ))}
                                </div>
                                {/* Activity List */}
                                {Object.entries(byCategory).map(([cat, acts]) => (
                                    <div key={cat} style={{ marginBottom:18 }}>
                                        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>{cat}</div>
                                        {acts.map(a => (
                                            <div key={a.id}
                                                className="cert-card"
                                                style={{ cursor:'pointer', marginBottom:7 }}
                                                onClick={() => handleSelectActivity(a.id)}
                                            >
                                                <div className="cert-card-header" style={{ marginBottom:0 }}>
                                                    <div>
                                                        <div className="cert-card-title">{a.name}</div>
                                                        <div className="cert-card-sub">Max {a.maxPoints} pts</div>
                                                    </div>
                                                    <span className="material-symbols-outlined" style={{ color:'var(--text-muted)', fontSize:18 }}>chevron_right</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>
                                    Group {activity?.group} · {activity?.category} · Max {activity?.maxPoints} pts
                                </div>

                                {/* Level / Hours */}
                                {needsLevel && (
                                    <div className="form-group">
                                        <label className="form-label">
                                            Select Level / Option <span className="required">*</span>
                                        </label>
                                        <select className="input" value={selectedLevel}
                                            onChange={e => setSelectedLevel(e.target.value)} required
                                            style={{ borderColor: !selectedLevel ? 'var(--danger)' : '' }}
                                        >
                                            <option value=""> /  Select a level to continue  / </option>
                                            {activity.levels.map(l => (
                                                <option key={l.label} value={l.label}>{l.label} ({l.points} pts)</option>
                                            ))}
                                        </select>
                                        {!selectedLevel && (
                                            <div className="form-hint" style={{ color:'var(--danger)' }}>⚠ You must select a level before submitting</div>
                                        )}
                                    </div>
                                )}
                                {activity?.type === 'hours' && (
                                    <div className="form-group">
                                        <label className="form-label">Course Duration (Hours)</label>
                                        <input className="input" type="number" min="1" max="40"
                                            placeholder="e.g. 30" value={hours}
                                            onChange={e => setHours(e.target.value)} required />
                                        <div className="form-hint">1 pt/hour • Max 40 pts</div>
                                    </div>
                                )}

                                {/* Upload Certificate */}
                                <div className="form-group">
                                    <label className="form-label">
                                        Upload Certificate <span className="required">*</span>
                                    </label>
                                    <div className={`upload-zone ${uploadedFile ? 'drag-over' : ''}`}
                                        onClick={() => fileInputRef.current.click()}
                                        style={{ borderColor: uploadedFile ? 'var(--success)' : '' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ color: uploadedFile ? 'var(--success)' : '' }}>
                                            {uploadedFile ? 'attach_file' : 'cloud_upload'}
                                        </span>
                                        {uploadedFile ? (
                                            <>
                                                <p style={{ fontWeight:600, color:'var(--success)' }}>{uploadedFile.name}</p>
                                                <span>{(uploadedFile.size / 1024).toFixed(1)} KB · Click to change</span>
                                            </>
                                        ) : (
                                            <>
                                                <p>Click to upload certificate</p>
                                                <span>PDF, JPG, PNG supported</span>
                                            </>
                                        )}
                                    </div>
                                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                                        style={{ display:'none' }} onChange={handleFileChange} required />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Event / Activity Name <span className="required">*</span></label>
                                    <input className="input" value={eventName}
                                        onChange={e => setEventName(e.target.value)} maxLength={180}
                                        placeholder="e.g. KTU Tech Fest 2025" required />
                                    <div className="form-hint">Use the same event name across related certificates.</div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Academic Year <span className="required">*</span></label>
                                    <input className="input" value={academicYear}
                                        onChange={e => setAcademicYear(e.target.value)}
                                        placeholder="2025–26" maxLength={7}
                                        pattern="[0-9]{4}[-–][0-9]{2}"
                                        title="Enter the academic year as YYYY-YY, for example 2025-26"
                                        required />
                                    <div className="form-hint">Enter the year shown on your academic calendar. Faculty will verify it with your certificate.</div>
                                </div>

                                {/* Activity Date */}
                                <div className="form-group">
                                    <label className="form-label">Activity Date <span className="required">*</span></label>
                                    <input className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={activityDate}
                                        onChange={e => setActivityDate(e.target.value)} required />
                                </div>

                                {/* Description */}
                                <div className="form-group">
                                    <label className="form-label">Description / Notes</label>
                                    <textarea className="input" rows={3}
                                        placeholder="Describe the activity, event name, organizer, etc."
                                        value={description} onChange={e => setDescription(e.target.value)}
                                        style={{ resize:'vertical' }} />
                                </div>

                                {activity?.note && (
                                    <div className="alert alert-warning" style={{ marginBottom:16 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize:16 }}>info</span>
                                        {activity.note}
                                    </div>
                                )}

                                {submitError && (
                                    <div className="alert alert-error" style={{ marginBottom:16 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize:16, flexShrink:0 }}>error_outline</span>
                                        {submitError}
                                    </div>
                                )}

                                <div style={{ display:'flex', gap:10, paddingTop:8, borderTop:'1px solid var(--border)' }}>
                                    <button type="button" className="btn btn-ghost" style={{ flex:1 }} onClick={() => { setStep(0); setActivityId(''); }}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex:2 }}
                                        disabled={submitting || (needsLevel && !selectedLevel)}
                                    >
                                        {submitting
                                            ? <><span className="material-symbols-outlined" style={{ fontSize:18, animation:'spin 1s linear infinite' }}>progress_activity</span> Submitting…</>
                                            : <><span className="material-symbols-outlined" style={{ fontSize:18 }}>send</span> Submit for Verification</>}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* ── Right: Info Cards ── */}
                <div style={{ width:220, display:'flex', flexDirection:'column', gap:14 }}>
                    {/* Point Rules */}
                    <div className="card" style={{ padding:18 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                            <span className="material-symbols-outlined" style={{ color:'var(--warning)', fontSize:20 }}>gavel</span>
                            <span style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>Point Rules</span>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:12, color:'var(--text-secondary)' }}>
                            <div style={{ display:'flex', gap:6 }}>
                                <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--text-muted)', flexShrink:0, marginTop:1 }}>check_circle</span>
                                Activities need a valid certificate from the organizing body.
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                                <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--text-muted)', flexShrink:0, marginTop:1 }}>check_circle</span>
                                Double claiming for the same event is not allowed.
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                                <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--text-muted)', flexShrink:0, marginTop:1 }}>check_circle</span>
                                Only highest level achievement is counted.
                            </div>
                        </div>
                    </div>

                    {/* Estimated Points */}
                    <div style={{ background:'var(--primary)', borderRadius:'var(--radius-lg)', padding:18, position:'relative', overflow:'hidden' }}>
                        <span className="material-symbols-outlined" style={{ position:'absolute', right:-10, bottom:-10, fontSize:80, color:'rgba(255,255,255,0.08)' }}>military_tech</span>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', marginBottom:4, position:'relative' }}>Estimated Points</div>
                        <div style={{ fontSize:32, fontWeight:900, color:'#fff', position:'relative' }}>
                            {previewPoints}
                            <span style={{ fontSize:14, fontWeight:500, opacity:0.7, marginLeft:4 }}>pts</span>
                        </div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', marginTop:8, lineHeight:1.5, position:'relative' }}>
                            *Subject to Faculty Advisor verification. Final award may vary.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MY SUBMISSIONS TAB
═══════════════════════════════════════════════════ */
function SubmissionsTab({ certs }) {
    const [filter,  setFilter]  = useState('all');
    const [search,  setSearch]  = useState('');

    const filtered = certs.filter(c => {
        const act    = getActivityForCertificate(c);
        const name   = (act?.name || c.activityName || '').toLowerCase();
        const matchS = name.includes(search.toLowerCase());
        const matchF = filter === 'all' || c.status === filter;
        return matchS && matchF;
    });

    const counts = {
        all:      certs.length,
        pending:  certs.filter(c => c.status === 'pending').length,
        approved: certs.filter(c => c.status === 'approved').length,
        rejected: certs.filter(c => c.status === 'rejected').length,
    };

    return (
        <>
            {/* Search + Filter Row */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:20, alignItems:'center' }}>
                <div className="search-box" style={{ flex:'1 1 220px', minWidth:180 }}>
                    <span className="search-box-icon">
                        <span className="material-symbols-outlined">search</span>
                    </span>
                    <input className="input" placeholder="Search activities…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {['all','pending','approved','rejected'].map(s => (
                        <button key={s}
                            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setFilter(s)}
                            style={{ textTransform:'capitalize' }}
                        >
                            {s === 'all' ? `All (${counts.all})` : `${s.charAt(0).toUpperCase()+s.slice(1)} (${counts[s]})`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="table-card">
                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined">description</span>
                        <p>{search ? 'No results found' : 'No submissions yet'}</p>
                    </div>
                ) : (
                    <>
                        <div className="table-overflow">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Activity Name</th>
                                        <th>Group</th>
                                        <th>Level</th>
                                        <th>Submitted</th>
                                        <th className="td-center">Points</th>
                                        <th>Status</th>
                                        <th>Document</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(c => {
                                        const act = getActivityForCertificate(c);
                                        return (
                                            <tr key={c.id}>
                                                <td className="td-bold">{act?.name || c.activityName}<div className="td-muted" style={{fontSize:11,fontWeight:400}}>{c.event_name || 'Legacy submission'}{(c.academic_year || c.academicYear) ? ` · AY ${c.academic_year || c.academicYear}` : ''}</div></td>
                                                <td className="td-muted">Group {act?.group || ' / '}</td>
                                                <td className="td-muted">{c.level_selected || c.selectedLevel || ' / '}</td>
                                                <td className="td-muted">{new Date(c.created_at || c.createdAt).toLocaleDateString('en-IN')}</td>
                                                <td className="td-center td-bold" style={{ color:'var(--accent)' }}>{c.points_awarded ?? c.pointsAwarded}</td>
                                                <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                                                <td>{c.file_url ? <CertificateFileButton certificateId={c.id} /> : ' / '}</td>
                                                <td className="td-muted" style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                    {c.notes || c.facultyRemark || (c.status === 'pending' ? 'Under review' : c.status === 'approved' ? 'Verified' : ' / ')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="table-card-footer">
                            <span>Showing {filtered.length} of {certs.length} submissions</span>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

function CertificateFileButton({ certificateId }) {
    const [busy, setBusy] = useState(false);
    const openFile = async () => {
        const popup = window.open('about:blank', '_blank');
        if (popup) popup.opener = null;
        setBusy(true);
        try {
            const { url } = await getCertificateFileUrl(certificateId);
            if (popup) popup.location.href = url;
            else window.location.href = url;
        } catch (err) {
            popup?.close();
            alert(err.message);
        } finally { setBusy(false); }
    };
    return <button className="btn btn-ghost btn-sm" disabled={busy} onClick={openFile}>
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>attach_file</span>{busy ? 'Opening…' : 'View'}
    </button>;
}

/* ═══════════════════════════════════════════════════
   PROFILE TAB
═══════════════════════════════════════════════════ */
function ProfileTab({ user, summary, req, onLogout, onGuidelines, onUpdateUser }) {
    const pct      = Math.min((summary.total / req.total) * 100, 100);
    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'ST';
    const [uploading, setUploading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [editName, setEditName] = useState(user?.name || '');
    const [editEmail, setEditEmail] = useState(user?.email || '');
    const [editPhone, setEditPhone] = useState(user?.phone || '');
    const [editRollNo, setEditRollNo] = useState(user?.rollNo || '');
    const [editYear, setEditYear] = useState(user?.year || '');
    const fileInputRef = React.useRef();

    const handlePhotoChange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setUploading(true);
        try {
            const fileData = await compressImage(f);
            const updated = await updateUser({ ...user, profileUrl: fileData });
            onUpdateUser(updated);
        } catch (err) {
            alert(err.message);
        }
        setUploading(false);
    };

    const handleRemovePhoto = async () => {
        if (!window.confirm("Remove profile photo?")) return;
        try {
            const updated = await updateUser({ ...user, profileUrl: null });
            onUpdateUser(updated);
        } catch(err) { alert(err.message); }
    };

    const handleSave = async () => {
        try {
            const updated = await updateUser({
                ...user,
                name: editName,
                email: editEmail,
                phone: editPhone,
                rollNo: editRollNo,
                year: editYear ? parseInt(editYear) : null,
            });
            onUpdateUser(updated);
            setSaved(true);
            setEditing(false);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) { alert(err.message); }
    };

    const startEditing = () => {
        setEditName(user?.name || '');
        setEditEmail(user?.email || '');
        setEditPhone(user?.phone || '');
        setEditRollNo(user?.rollNo || '');
        setEditYear(user?.year || '');
        setEditing(true);
    };

    return (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, maxWidth:960, margin:'0 auto' }}>
            {/* Left Column */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {saved && (
                    <div className="alert alert-success" style={{ marginBottom: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:16 }}>check_circle</span>
                        Profile updated successfully!
                    </div>
                )}

                {/* Profile Hero */}
                <div className="card">
                    <div style={{ padding:28, borderBottom:'1px solid var(--border)', background:'var(--surface2)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <div className="profile-avatar-lg" style={{ overflow: 'hidden', padding:user?.profileUrl ? 0 : '', display:user?.profileUrl ? 'block' : 'flex', position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current.click()}>
                                    {uploading && <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, zIndex:10}}>UPLOADING</div>}
                                    {user?.profileUrl ? <img src={user.profileUrl} alt="Profile" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : initials}
                                    {!uploading && (
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, textAlign: 'center', padding: '4px 0', opacity: 0 }} className="avatar-overlay-hover">
                                            CHANGE
                                        </div>
                                    )}
                                </div>
                                {user?.profileUrl && (
                                    <button className="btn btn-ghost btn-sm" onClick={handleRemovePhoto} style={{ fontSize: 11, color: 'var(--danger)', padding: '2px 8px', marginTop: 4 }}>
                                        Remove Photo
                                    </button>
                                )}
                                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display:'none' }} onChange={handlePhotoChange} />
                            </div>
                            <div style={{ flex:1 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                                    <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)' }}>{user?.name}</h2>
                                    <span className="badge badge-info" style={{ textTransform:'capitalize' }}>Student</span>
                                </div>
                                <p style={{ fontSize:13, color:'var(--text-muted)' }}>{user?.rollNo} · B.Tech {user?.department}</p>
                            </div>
                            {!editing && (
                                <button className="btn btn-ghost btn-sm" onClick={startEditing}>
                                    <span className="material-symbols-outlined" style={{ fontSize:16 }}>edit</span>
                                    Edit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Personal / Academic Details */}
                    <div style={{ padding:24 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                            <span className="material-symbols-outlined" style={{ color:'var(--primary)', fontSize:20 }}>contact_mail</span>
                            <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Personal & Academic Details</span>
                        </div>

                        {!editing ? (
                            <div className="profile-info-grid">
                                {[
                                    ['Email',       user?.email,      'email'],
                                    ['Phone',       user?.phone,      'call'],
                                    ['Department',  user?.department,  'school'],
                                    ['Roll Number', user?.rollNo,      'badge'],
                                    ['Year',        user?.year ? `Year ${user.year}` : 'N/A', 'calendar_month'],
                                    ['Username',    user?.username,    'person'],
                                    ['Student Type', user?.studentType || 'Regular', 'category'],
                                ].map(([label, val]) => (
                                    <div className="profile-info-item" key={label}>
                                        <label>{label}</label>
                                        <p>{val || 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                                <div className="form-group" style={{ marginBottom:0 }}>
                                    <label className="form-label">Full Name</label>
                                    <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom:0 }}>
                                    <label className="form-label">Email</label>
                                    <input className="input" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom:0 }}>
                                    <label className="form-label">Phone Number</label>
                                    <input className="input" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom:0 }}>
                                    <label className="form-label">KTU Registration Number</label>
                                    <input className="input" placeholder="e.g. KTU21CS001" value={editRollNo} onChange={e => setEditRollNo(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom:0 }}>
                                    <label className="form-label">Year of Study</label>
                                    <select className="input" value={editYear} onChange={e => setEditYear(e.target.value)}>
                                        <option value=""> /  Select Year  / </option>
                                        <option value="1">First Year</option>
                                        <option value="2">Second Year</option>
                                        <option value="3">Third Year</option>
                                        <option value="4">Fourth Year</option>
                                    </select>
                                </div>
                                <div style={{ padding:'8px 0', fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize:14 }}>info</span>
                                    Username and Student Type cannot be changed. Contact admin if needed.
                                </div>
                                <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                                    <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setEditing(false)}>Cancel</button>
                                    <button className="btn btn-primary" style={{ flex:1 }} onClick={handleSave}>
                                        <span className="material-symbols-outlined" style={{ fontSize:16 }}>save</span>
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* KTU Guidelines quick link */}
                <div className="settings-item" onClick={onGuidelines}>
                    <div className="settings-icon" style={{ background:'rgba(45,91,227,0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color:'var(--accent)', fontSize:20 }}>menu_book</span>
                    </div>
                    <div className="settings-info">
                        <h4>KTU Activity Point Guidelines</h4>
                        <p>View official 2024 rules and regulations</p>
                    </div>
                    <span className="material-symbols-outlined" style={{ color:'var(--text-muted)', fontSize:20, marginLeft:'auto' }}>chevron_right</span>
                </div>

                {/* Logout */}
                <div className="settings-item" onClick={onLogout} style={{ borderColor:'color-mix(in srgb, var(--danger) 25%, transparent)' }}>
                    <div className="settings-icon" style={{ background:'var(--danger-bg)' }}>
                        <span className="material-symbols-outlined" style={{ color:'var(--danger)', fontSize:20 }}>logout</span>
                    </div>
                    <div className="settings-info">
                        <h4 style={{ color:'var(--danger)' }}>Log Out</h4>
                        <p>Sign out of your account</p>
                    </div>
                </div>
            </div>

            {/* Right Column */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {/* Activity Points Card */}
                <div className="card" style={{ padding:20 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Estimated Activity Points</span>
                        <div style={{ background:'rgba(45,91,227,0.1)', borderRadius:10, padding:8 }}>
                            <span className="material-symbols-outlined" style={{ color:'var(--accent)', fontSize:22 }}>analytics</span>
                        </div>
                    </div>
                    <div style={{ marginBottom:12 }}>
                        <span style={{ fontSize:32, fontWeight:900, color:'var(--text)' }}>{summary.total}</span>
                        <span style={{ fontSize:16, color:'var(--text-muted)', marginLeft:6 }}>/ {req.total}</span>
                    </div>
                    <div className="progress-track" style={{ height:10, marginBottom:10 }}>
                        <div className="progress-fill" style={{ width:`${pct}%`, background:'var(--accent)' }} />
                    </div>
                    <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>
                        You need <strong style={{ color:'var(--primary)' }}>{Math.max(0, req.total - summary.total)} more points</strong> to fulfill the degree requirement.
                    </p>
                    <small style={{ color:'var(--text-muted)', lineHeight:1.5 }}>Progress estimate from approved submissions. Your faculty advisor verifies final eligibility.</small>
                </div>

                {/* Need Help */}
                <div style={{ background:'var(--primary)', borderRadius:'var(--radius-lg)', padding:20, position:'relative', overflow:'hidden' }}>
                    <span className="material-symbols-outlined" style={{ position:'absolute', right:-14, bottom:-14, fontSize:90, color:'rgba(255,255,255,0.08)' }}>help</span>
                    <h4 style={{ fontWeight:700, color:'#fff', marginBottom:6, fontSize:14 }}>Need Help?</h4>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginBottom:14, lineHeight:1.6 }}>
                        Contact your faculty advisor for any discrepancies in academic data.
                    </p>
                    <button onClick={onGuidelines} style={{ background:'none', border:'none', color:'#fff', fontSize:11, fontWeight:700, textDecoration:'underline', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                        View Guidelines <span className="material-symbols-outlined" style={{ fontSize:14 }}>open_in_new</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   GUIDELINES MODAL
═══════════════════════════════════════════════════ */
function GuidelinesModal({ onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-handle" />
                <div className="modal-header">
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span className="material-symbols-outlined" style={{ color:'var(--accent)' }}>menu_book</span>
                        <h2>2024 Activity Point Handbook</h2>
                    </div>
                    <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Reference summary · Confirm eligibility with your faculty advisor</p>
                </div>
                <div className="modal-body">
                    {KTU_RULES.map((rule, i) => (
                        <div key={i} style={{ display:'flex', gap:12, padding:'10px 14px', borderRadius:'var(--radius-sm)', marginBottom:8, background:'var(--surface2)', border:'1px solid var(--border)', fontSize:13 }}>
                            <span style={{ color:'var(--accent)', fontWeight:700, flexShrink:0 }}>{i+1}.</span>
                            <span style={{ color:'var(--text-secondary)' }}>{rule}</span>
                        </div>
                    ))}
                    <div style={{ marginTop:8, padding:'10px 14px', background:'rgba(45,91,227,0.07)', borderRadius:'var(--radius-sm)', fontSize:12, color:'var(--text-muted)' }}>
                        Handbook thresholds: Regular 120 (40 per group) · Lateral entry 90 (30 per group) · PwD 60 (20 per group). APMS totals are estimates; your faculty advisor verifies eligibility before they count as final.
                    </div>
                    <a href="https://www.iiet.org.in/wp-content/uploads/2025/12/KTURegulations2024%E2%80%93ActivityPointsHandbook.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop:10 }}>
                        Open the 2024 handbook copy
                        <span className="material-symbols-outlined" style={{ fontSize:15 }}>open_in_new</span>
                    </a>
                    <small style={{ display:'block', marginTop:8, color:'var(--text-muted)' }}>This copy is hosted by an affiliated institution. Confirm current rules and eligibility with your faculty advisor.</small>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
