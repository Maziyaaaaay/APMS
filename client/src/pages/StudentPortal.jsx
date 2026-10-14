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
    { key: 'group1', label: 'Group I', sub: 'Co-curricular Activities' },
    { key: 'group2', label: 'Group II', sub: 'Professional Development' },
    { key: 'group3', label: 'Group III', sub: 'Innovation & Entrepreneurship' },
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
    const [eventName,     setEventName]     = useState('');
    const [activityDate,  setActivityDate]  = useState('');
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

    const handleSelectActivity = (id) => { setActivityId(id); setSelectedLevel(''); setStep(1); };

    const handleFileChange = (e) => { const f = e.target.files[0]; if (f) { setUploadedFile(f); setSubmitError(''); } };

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
                eventName: eventName.trim(),
                activityDate,
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

    if (success) return <div className="role-complete"><span className="material-symbols-outlined">check_circle</span><h2>Submitted for review.</h2><p>Your faculty advisor will check the document. You can track its status in My Submissions.</p></div>;
    return <div className="student-submit-page">
        <div className="role-intro"><div><span className="role-kicker">NEW SUBMISSION</span><h1>Show what you did<em>.</em></h1><p>Choose an activity, upload proof, and confirm the essential details.</p></div></div>
        <div className="submit-stage-strip"><span className={step === 0 ? 'active' : 'done'}><b>01</b> Choose activity</span><span className={step === 1 ? 'active' : ''}><b>02</b> Upload & confirm</span><span><b>03</b> Faculty review</span></div>
        {step === 0 ? <div className="submit-choose-layout">
            <aside className="submit-groups"><span className="role-kicker">FIND YOUR GROUP</span><h2>Where does it belong?</h2>{[1,2,3].map(number => <button key={number} className={group === number ? 'active' : ''} onClick={() => {setGroup(number);setActivityId('')}}><span>0{number}</span><strong>{number === 1 ? 'Co-curricular' : number === 2 ? 'Professional development' : 'Innovation'}</strong><span className="material-symbols-outlined">arrow_forward</span></button>)}</aside>
            <section className="submit-activity-list"><div className="role-section-heading"><div><span className="role-kicker">GROUP {group}</span><h2>Choose an activity.</h2></div><p>Select the closest match to your certificate.</p></div>{Object.entries(byCategory).map(([category,items]) => <div className="activity-category" key={category}><h3>{category}</h3><div>{items.map(item => <button key={item.id} onClick={() => handleSelectActivity(item.id)}><span className="material-symbols-outlined">workspace_premium</span><span><strong>{item.name}</strong><small>Up to {item.maxPoints} points</small></span><span className="material-symbols-outlined">north_east</span></button>)}</div></div>)}</section>
        </div> : <div className="submit-detail-layout"><form className="submit-detail-form" onSubmit={handleSubmit}>
            <div className="submit-form-heading"><button type="button" onClick={() => {setStep(0);setActivityId('')}}><span className="material-symbols-outlined">arrow_back</span> All activities</button><span className="role-kicker">GROUP {activity?.group}</span><h2>{activity?.name}</h2><p>{activity?.category} · Up to {activity?.maxPoints} points</p></div>
            <div className="submit-form-fields">
                <div className="submit-field submit-field-wide"><label htmlFor="certificate-file">Certificate or proof <span>*</span></label><label className="submit-upload" htmlFor="certificate-file"><span className="material-symbols-outlined">{uploadedFile ? 'draft' : 'upload_file'}</span><strong>{uploadedFile ? uploadedFile.name : 'Choose a document'}</strong><small>{uploadedFile ? `${(uploadedFile.size/1024).toFixed(1)} KB · Select to change` : 'PDF, JPG or PNG · 10 MB maximum'}</small></label><input id="certificate-file" ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} required /></div>
                <p className="submit-field submit-field-wide">Submitting as <strong>{user?.name}</strong>. Add the certificate name or date only if shown; your faculty advisor will verify the proof.</p>
                {needsLevel && <label className="submit-field">Achievement level <span>*</span><select className="input" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} required><option value="">Choose your level</option>{activity.levels.map(level => <option key={level.label} value={level.label}>{level.label} · {level.points} pts</option>)}</select></label>}
                {activity?.type === 'hours' && <label className="submit-field">Course duration <span>*</span><input className="input" type="number" min="1" max="40" value={hours} onChange={e => setHours(e.target.value)} placeholder="Hours completed" required /></label>}
                <label className="submit-field">Certificate or event name <small>Optional</small><input className="input" value={eventName} onChange={e => setEventName(e.target.value)} maxLength={180} placeholder={activity?.name || "Name shown on certificate"} /></label>
                <label className="submit-field">Date shown on certificate <small>Optional</small><input className="input" type="date" max={new Date().toISOString().slice(0,10)} value={activityDate} onChange={e => setActivityDate(e.target.value)} /></label>

            </div>
            {activity?.note && <div className="submit-note"><span className="material-symbols-outlined">info</span><span><strong>Eligibility note: </strong>{activity.note}</span></div>}
            {submitError && <div role="alert" className="alert alert-error">{submitError}</div>}
            <div className="submit-form-actions"><span>Submitted points remain provisional until reviewed.</span><button type="submit" disabled={submitting || (needsLevel && !selectedLevel) || !uploadedFile}>{submitting ? 'Submitting…' : 'Submit for review'}<span className="material-symbols-outlined">arrow_forward</span></button></div>
        </form><aside className="submit-preview"><span className="role-kicker">YOUR ESTIMATE</span><strong>{previewPoints}<small>points</small></strong><p>Faculty will confirm the award after checking your certificate.</p><div><span className="material-symbols-outlined">verified_user</span><span>Only authentic, eligible activities count.</span></div></aside></div>}
    </div>;
}

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

    return <div className="role-records-page"><div className="role-intro"><div><span className="role-kicker">YOUR RECORD</span><h1>Every activity, in view<em>.</em></h1><p>Track decisions and open the documents you submitted.</p></div></div><div className="record-toolbar"><label><span className="material-symbols-outlined">search</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your activities" /></label><div>{['all','pending','approved','rejected'].map(status => <button key={status} className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>{status === 'all' ? 'All' : status}<strong>{counts[status]}</strong></button>)}</div></div>{filtered.length ? <div className="record-list">{filtered.map(cert => {const activity = getActivityForCertificate(cert);return <article className="record-item" key={cert.id}><div className="record-item-head"><span className="record-item-icon material-symbols-outlined">workspace_premium</span><div><span className="role-kicker">GROUP {activity?.group || '—'} · {new Date(cert.created_at || cert.createdAt).toLocaleDateString('en-IN')}</span><h2>{activity?.name || cert.activityName}</h2><p>{cert.event_name || 'Activity submission'}{(cert.academic_year || cert.academicYear) ? ` · AY ${cert.academic_year || cert.academicYear}` : ''}</p></div><span className={`badge badge-${cert.status}`}>{cert.status}</span></div><div className="record-item-foot"><span>{cert.level_selected || cert.selectedLevel || 'Certificate submitted'}</span><strong>{cert.points_awarded ?? cert.pointsAwarded} <small>estimated points</small></strong><span>{cert.file_url && <CertificateFileButton certificateId={cert.id} />}</span></div>{(cert.notes || cert.facultyRemark) && <p className="record-note"><span className="material-symbols-outlined">chat</span>{cert.notes || cert.facultyRemark}</p>}</article>})}</div> : <div className="role-empty"><span className="material-symbols-outlined">folder_open</span><h3>{search ? 'No matching activities' : 'No submissions yet'}</h3><p>{search ? 'Try a different search.' : 'Your submitted certificates will appear here.'}</p></div>}</div>;
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

    return <div className="role-profile-page">
        <section className="role-profile-hero"><div className="role-profile-hero-main"><span className="role-kicker">STUDENT PROFILE</span><div className="role-profile-avatar" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={event => {if(event.key === 'Enter') fileInputRef.current?.click()}} aria-label="Change profile photo">{uploading ? <span className="material-symbols-outlined">progress_activity</span> : user?.profileUrl ? <img src={user.profileUrl} alt="" /> : initials}</div><div><h1>{user?.name}</h1><p>{user?.rollNo} · {user?.department}</p><div className="role-profile-actions"><button onClick={startEditing}><span className="material-symbols-outlined">edit</span>Edit profile</button>{user?.profileUrl && <button onClick={handleRemovePhoto}>Remove photo</button>}</div></div></div><div className="role-profile-score"><strong><span>{summary.total}</span><small> / {req.total}</small></strong><span>estimated points</span><div><i style={{width:`${pct}%`}} /></div></div><input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={handlePhotoChange} /></section>
        {saved && <div className="alert alert-success">Profile updated.</div>}
        <div className="role-profile-body"><section className="role-profile-details"><div className="role-section-heading"><div><span className="role-kicker">YOUR DETAILS</span><h2>Personal & academic.</h2></div></div>{!editing ? <div className="role-detail-grid">{[['Email',user?.email],['Phone',user?.phone],['Department',user?.department],['KTU registration',user?.rollNo],['Year',user?.year ? `Year ${user.year}` : null],['Student type',user?.studentType || 'Regular']].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value || 'Not added'}</strong></div>)}</div> : <div className="role-edit-grid"><label>Full name<input className="input" value={editName} onChange={event => setEditName(event.target.value)} /></label><label>Email<input className="input" type="email" value={editEmail} onChange={event => setEditEmail(event.target.value)} /></label><label>Phone<input className="input" type="tel" value={editPhone} onChange={event => setEditPhone(event.target.value)} /></label><label>KTU registration<input className="input" value={editRollNo} onChange={event => setEditRollNo(event.target.value)} /></label><label>Year<select className="input" value={editYear} onChange={event => setEditYear(event.target.value)}><option value="">Choose year</option>{[1,2,3,4].map(year => <option key={year} value={year}>Year {year}</option>)}</select></label><div className="role-edit-actions"><button onClick={() => setEditing(false)}>Cancel</button><button onClick={handleSave}>Save changes</button></div></div>}</section><aside className="role-profile-aside"><span className="role-kicker">QUICK ACCESS</span><button onClick={onGuidelines}><span className="material-symbols-outlined">menu_book</span>Activity guidelines<span className="material-symbols-outlined">arrow_forward</span></button><button onClick={onLogout}><span className="material-symbols-outlined">logout</span>Sign out<span className="material-symbols-outlined">arrow_forward</span></button></aside></div>
    </div>;
}

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
