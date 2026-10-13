import BrandLogo from '../components/BrandLogo';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';
import { getCertificates, getUsers, getAccountRequests, reviewAccount, updateCertificate, updateUser, getCirculars, getCertificateFileUrl } from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';
import { getActivityForCertificate, calculateStudentSummary } from '../utils/points';
import { generateApprovalPDF } from '../utils/pdfGenerator';

const NAV_ITEMS = [
    { key: 'dashboard',  icon: 'dashboard',      label: 'Dashboard'       },
    { key: 'reviews',    icon: 'fact_check',      label: 'Pending Reviews' },
    { key: 'approvals',  icon: 'how_to_reg',      label: 'Student Requests' },
    { key: 'students',   icon: 'groups',          label: 'My Students'     },
    { key: 'profile',    icon: 'person',          label: 'Profile'         },
];

const DEPARTMENTS = [
    'Computer Science',
    'Information Technology',
    'Electronics and Communication Engineering',
    'Electrical Engineering',
    'Civil Engineering',
    'Mechanical Engineering',
    'Electrical and Computer Science',
];

const DUAL_CLASS_DEPTS = {
    'Computer Science': ['CS1', 'CS2'],
    'Electronics and Communication Engineering': ['ECE1', 'ECE2'],
};

function getCurrentSemesters() {
    const month = new Date().getMonth() + 1;
    return month >= 1 && month <= 6 ? [2, 4, 6, 8] : [1, 3, 5, 7];
}

export default function FacultyPortal() {
    const navigate = useNavigate();
    const [user, setUser] = useState(() => getCurrentUser());
    const [tab, setTab] = useState('dashboard');
    const [certs, setCerts] = useState([]);
    const [students, setStudents] = useState([]);
    const [accountRequests, setAccountRequests] = useState([]);
    const [circulars, setCirculars] = useState([]);
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

    const [loadError, setLoadError] = useState('');
    const refreshData = useCallback(async () => {
        try {
            const [certsData, usersData, circsData, requestsData] = await Promise.all([
                getCertificates(),
                getUsers(),
                getCirculars(),
                getAccountRequests(),
            ]);
            setCerts(certsData);
            setStudents(usersData.filter(u => u.role === 'student'));
            setCirculars(circsData); setAccountRequests(requestsData); setLoadError('');
        } catch (err) {
            setLoadError(err.message);
        }
    }, []);
    useEffect(() => {
        if (!user) { navigate('/'); return; }
        Promise.resolve().then(refreshData);
    }, [user, navigate, refreshData]);

    const handleLogout = () => { logout(); navigate('/'); };
    const toggleDark = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
    };

    const pendingCerts = certs.filter(c => c.status === 'pending');
    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'FA';

    return (
        <div className="portal-layout faculty-portal role-workspace">
            <header className="role-masthead">
                <div className="role-masthead-top">
                    <div className="role-identity"><BrandLogo /><span>FACULTY SPACE</span></div>
                    <div className="role-masthead-actions">
                        <span className="role-person-name">{user?.name}</span>
                        <button className="role-theme" onClick={toggleDark} aria-label={dark ? 'Switch to day mode' : 'Switch to night mode'}><span className="material-symbols-outlined">{dark ? 'light_mode' : 'dark_mode'}</span></button>
                        <button className="role-account" onClick={() => setTab('profile')} aria-label="Open profile">{user?.profileUrl ? <img src={user.profileUrl} alt="" /> : initials}</button>
                    </div>
                </div>
                <div className="role-nav-line">
                    <nav className="role-nav" aria-label="Faculty navigation">{NAV_ITEMS.map(item => <button key={item.key} className={tab === item.key ? 'active' : ''} aria-current={tab === item.key ? 'page' : undefined} onClick={() => setTab(item.key)}><span className="material-symbols-outlined">{item.icon}</span>{item.label}</button>)}</nav>
                    <span className="role-context">{user?.department}</span>
                </div>
            </header>
            <main className="role-main">
                {/* Page Content */}
                <div className="page-content" key={tab}>
                    {loadError && <div role="alert" className="alert alert-danger">{loadError} <button onClick={refreshData}>Try again</button></div>}
                    {tab === 'dashboard' && (
                        <DashboardTab
                            user={user}
                            certs={certs}
                            students={students}
                            pendingCerts={pendingCerts}
                            pendingAccounts={accountRequests}
                            circulars={circulars}
                            onRefresh={refreshData}
                            onGoReviews={() => setTab('reviews')}
                            onGoApprovals={() => setTab('approvals')}
                        />
                    )}
                    {tab === 'reviews' && (
                        <ReviewsTab
                            pendingCerts={pendingCerts}
                            students={students}
                            user={user}
                            onRefresh={refreshData}
                        />
                    )}
                    {tab === 'approvals' && <StudentApprovalsTab requests={accountRequests} onRefresh={refreshData} />}
                    {tab === 'students' && (
                        <StudentsTab certs={certs} students={students} />
                    )}
                    {tab === 'profile' && (
                        <ProfileTab user={user} onLogout={handleLogout} onRefresh={refreshData} onUpdateUser={setUser} />
                    )}
                </div>
            </main>
        </div>
    );
}

function StudentApprovalsTab({ requests, onRefresh }) {
    const [busyId, setBusyId] = useState(null);
    const decide = async (account, status) => {
        const note = status === 'rejected' ? window.prompt('Add a short reason for rejecting this student request:') : '';
        if (status === 'rejected' && note === null) return;
        if (status === 'rejected' && !note.trim()) { window.alert('Please add a reason so the student knows what to correct.'); return; }
        setBusyId(account.id);
        try { await reviewAccount(account.id, status, note || ''); await onRefresh(); }
        catch (error) { window.alert(error.message); }
        finally { setBusyId(null); }
    };

    return <section className="card">
        <div className="card-header"><h3>Student registrations</h3><span className="badge badge-pending">{requests.length} waiting</span></div>
        <div className="card-body">
            <p className="td-muted" style={{ marginTop: 0 }}>Approve students from your department before they can sign in and submit activity records.</p>
            {requests.length === 0 ? <div className="empty-state"><span className="material-symbols-outlined">task_alt</span><p>No student registrations are waiting.</p></div> :
                <div className="table-overflow"><table className="data-table">
                    <thead><tr><th>Student</th><th>KTU Registration No.</th><th>Contact</th><th>Year</th><th>Decision</th></tr></thead>
                    <tbody>{requests.map(account => <tr key={account.id}>
                        <td><div className="td-bold">{account.name}</div><div className="td-muted">{account.department}</div></td>
                        <td>{account.roll_no || account.username}</td>
                        <td><div>{account.email}</div><div className="td-muted">{account.phone}</div></td>
                        <td>{account.year ? `Year ${account.year}` : 'Not provided'}</td>
                        <td><div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary btn-sm" disabled={busyId === account.id} onClick={() => decide(account, 'approved')}>Approve</button>
                            <button className="btn btn-danger btn-sm" disabled={busyId === account.id} onClick={() => decide(account, 'rejected')}>Reject</button>
                        </div></td>
                    </tr>)}</tbody>
                </table></div>}
        </div>
    </section>;
}

/* ═══════════════════════════════════════════════════
   DASHBOARD TAB
════════════════════════════════════════════════════ */
function DashboardTab({ user, students, pendingCerts, pendingAccounts, circulars, onGoReviews, onGoApprovals }) {
    const latest = pendingCerts.slice(0,4);
    return <div className="role-dashboard faculty-dashboard">
        <section className="role-intro"><div><span className="role-kicker">FACULTY DESK · {user?.department || 'YOUR DEPARTMENT'}</span><h1>Good to see you, {user?.name?.split(' ')[0] || 'advisor'}<em>.</em></h1><p>Your review queue and student requests, all in one place.</p></div><button className="role-primary-action" onClick={onGoReviews}><span className="material-symbols-outlined">fact_check</span>Open review queue</button></section>
        <div className="faculty-feature-layout"><section className="faculty-hero-card"><span className="role-kicker">YOUR PRIORITY</span><div className="faculty-hero-count">{pendingCerts.length}<span>certificates waiting</span></div><h2>{pendingCerts.length ? 'Ready for your review.' : 'You’re all caught up.'}</h2><p>{pendingCerts.length ? 'Open each document, verify it, and record a decision.' : 'New student submissions will show up here.'}</p><button onClick={onGoReviews}>Review certificates <span className="material-symbols-outlined">arrow_forward</span></button><span className="faculty-hero-mark material-symbols-outlined" aria-hidden="true">verified_user</span></section><div className="faculty-side-stat"><button onClick={onGoApprovals}><span className="material-symbols-outlined">person_add</span><strong>{pendingAccounts.length}</strong><span>Student requests</span><small>Approve access to APMS</small></button><div><span className="material-symbols-outlined">groups</span><strong>{students.length}</strong><span>Department students</span><small>Approved accounts</small></div></div></div>
        <div className="faculty-lower-grid"><section className="role-recent-section"><div className="role-section-heading"><div><span className="role-kicker">UP NEXT</span><h2>Review queue.</h2></div><button className="role-text-action" onClick={onGoReviews}>View all <span className="material-symbols-outlined">arrow_forward</span></button></div>{latest.length ? <div className="role-recent-list">{latest.map(cert => {const student = cert.student || students.find(item => item.id === (cert.student_id || cert.studentId));const activity = getActivityForCertificate(cert);return <button className="role-recent-row faculty-review-row" key={cert.id} onClick={onGoReviews}><div className="recent-icon"><span className="material-symbols-outlined">description</span></div><div><strong>{activity?.name || cert.activityName}</strong><span>{student?.name || 'Student'} · {new Date(cert.created_at || cert.createdAt).toLocaleDateString('en-IN')}</span></div><b>{cert.points_awarded ?? cert.pointsAwarded} pts</b><span className="material-symbols-outlined">arrow_forward</span></button>})}</div> : <div className="role-empty"><span className="material-symbols-outlined">task_alt</span><h3>Queue cleared</h3><p>There are no certificates to review right now.</p></div>}</section><aside className="faculty-notices"><span className="role-kicker">FROM ADMIN</span><h2>University updates.</h2>{circulars?.length ? circulars.slice(0,3).map(circular => <article key={circular.id}><span>{circular.priority || 'Notice'}</span><h3>{circular.title}</h3><p>{circular.content || circular.body}</p>{circular.source_url && <a href={circular.source_url} target="_blank" rel="noopener noreferrer">Open circular <span className="material-symbols-outlined">open_in_new</span></a>}</article>) : <p className="notices-empty">No circulars published yet.</p>}</aside></div>
    </div>;
}

function ReviewsTab({ pendingCerts, students, user, onRefresh }) {
    const [reviewing, setReviewing] = useState(null);
    const [search, setSearch] = useState('');
    const now = new Date();

    const getStudent = (cert) => cert.student || students.find(s => s.id === (cert.student_id || cert.studentId));
    const isOverdue = (cert) => (now - new Date(cert.created_at || cert.createdAt)) / (1000 * 60 * 60 * 24) > 3;

    const filtered = pendingCerts.filter(c => {
        const student = getStudent(c);
        const act = getActivityForCertificate(c);
        const q = search.toLowerCase();
        return (
            (act?.name || c.activityName || '').toLowerCase().includes(q) ||
            (student?.name || '').toLowerCase().includes(q) ||
            (student?.roll_no || student?.rollNo || '').toLowerCase().includes(q)
        );
    });

    return (
        <>
            {/* Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div className="search-box" style={{ flex: 1 }}>
                    <span className="search-box-icon">
                        <span className="material-symbols-outlined">search</span>
                    </span>
                    <input
                        className="input"
                        placeholder="Search by activity, student name or roll number…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {filtered.length} pending
                </div>
            </div>

            <div className="table-card">
                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined">check_circle</span>
                        <p>{search ? 'No results found' : 'No pending certificates. All caught up!'}</p>
                    </div>
                ) : (
                    <div className="table-overflow">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Activity</th>
                                    <th>Student</th>
                                    <th>Group</th>
                                    <th>Level</th>
                                    <th>Submitted</th>
                                    <th className="td-center">Points</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(cert => {
                                    const student = getStudent(cert);
                                    const act = getActivityForCertificate(cert);
                                    const overdue = isOverdue(cert);
                                    return (
                                        <tr key={cert.id} style={overdue ? { borderLeft: '3px solid var(--warning)' } : {}}>
                                            <td>
                                                <div className="td-bold">{act?.name || cert.activityName}</div>
                                                {overdue && (
                                                    <div style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 700, marginTop: 2 }}>
                                                        ⚠ Overdue (&gt;3 days)
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>{student?.name || ' / '}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student?.roll_no || student?.rollNo} · {student?.department}</div>
                                            </td>
                                            <td className="td-muted">Group {act?.group || ' / '}</td>
                                            <td className="td-muted">{cert.level_selected || cert.selectedLevel || ' / '}</td>
                                            <td className="td-muted">{new Date(cert.created_at || cert.createdAt).toLocaleDateString('en-IN')}</td>
                                            <td className="td-center td-bold">{cert.points_awarded ?? cert.pointsAwarded}</td>
                                            <td>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => setReviewing(cert)}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>fact_check</span>
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {filtered.length > 0 && (
                    <div className="table-card-footer">
                        <span>Showing {filtered.length} pending certificate{filtered.length !== 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>

            {reviewing && (
                <ReviewModal
                    cert={reviewing}
                    student={getStudent(reviewing)}
                    faculty={user}
                    onClose={() => setReviewing(null)}
                    onRefresh={onRefresh}
                />
            )}
        </>
    );
}

/* ═══════════════════════════════════════════════════
   REVIEW MODAL  (logic fully preserved)
════════════════════════════════════════════════════ */
function ReviewModal({ cert, student, faculty, onClose, onRefresh }) {
    const [remark, setRemark] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(null);
    const [reviewError, setReviewError] = useState('');
    const [filePreviewUrl, setFilePreviewUrl] = useState(cert.file_url?.startsWith('data:') ? cert.file_url : cert.fileData || '');
    const initialPoints = cert.points_awarded ?? cert.pointsAwarded ?? 0;
    const [pointsOverride, setPointsOverride] = useState(initialPoints);
    const activity = getActivityForCertificate(cert);

    useEffect(() => {
        let active = true;
        if (cert.file_url && !cert.file_url.startsWith('data:')) {
            getCertificateFileUrl(cert.id).then(({ url }) => { if (active) setFilePreviewUrl(url); })
                .catch(err => { if (active) setReviewError(err.message); });
        }
        return () => { active = false; };
    }, [cert.id, cert.file_url, cert.fileData]);

    const refreshPreview = async () => {
        try { const { url } = await getCertificateFileUrl(cert.id); setFilePreviewUrl(url); setReviewError(''); }
        catch (err) { setReviewError(err.message); }
    };

    const handle = async (action) => {
        if (action === 'rejected' && !remark.trim()) {
            setReviewError('Explain why this certificate is rejected so the student can correct it.');
            return;
        }
        if (Number(pointsOverride) !== Number(initialPoints) && !remark.trim()) {
            setReviewError('Add a short reason for changing the catalog-calculated points.');
            return;
        }
        setSubmitting(true);
        setReviewError('');
        try {
            await updateCertificate({
                ...cert,
                id: cert.id,
                status: action,
                pointsAwarded: Number(pointsOverride),
                notes: remark || (action === 'approved' ? 'Approved by SFA' : 'Rejected by SFA'),
            });
            if (action === 'approved') {
                generateApprovalPDF({ ...cert, pointsAwarded: Number(pointsOverride) }, student, faculty);
            }
            setDone(action);
            setTimeout(() => { onRefresh(); onClose(); }, 1500);
        } catch (err) {
            console.error('Review error:', err);
            setReviewError(err.message || 'Could not save the review. Please try again.');
        }
        setSubmitting(false);
    };

    if (done) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 56, color: done === 'approved' ? 'var(--success)' : 'var(--danger)' }}>
                            {done === 'approved' ? 'check_circle' : 'cancel'}
                        </span>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>
                            Certificate {done === 'approved' ? 'Approved!' : 'Rejected'}
                        </div>
                        {done === 'approved' && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>PDF has been downloaded.</div>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
                <div className="modal-handle" />
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--accent)' }}>fact_check</span>
                        <h2>Review Certificate</h2>
                    </div>
                </div>

                {/* Student Info */}
                <div className="modal-body">
                    <div style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', marginBottom: 16, border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{student?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{student?.rollNo} · {student?.department}</div>
                    </div>

                    {/* Activity Details */}
                    <div style={{ display: 'grid', gap: 0, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        {[
                            ['Activity', activity?.name || cert.activityName || 'Unknown Activity'],
                            ['Event', cert.event_name || ' / '],
                            ['Academic year', cert.academic_year || cert.academicYear || 'Not recorded'],
                            ['Group', `Group ${activity?.group || '?'}`],
                            ['Category', activity?.category || ' / '],
                            ['Level', cert.level_selected || cert.selectedLevel || 'N/A'],
                            ['Activity date', cert.activity_date || cert.activityDate ? new Date(`${cert.activity_date || cert.activityDate}T00:00:00`).toLocaleDateString('en-IN') : 'N/A'],
                            ['Description', cert.description || ' / '],
                        ].map(([label, val]) => (
                            <div key={label} style={{ display: 'flex', gap: 10, fontSize: 13, padding: '9px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                                <span style={{ color: 'var(--text-muted)', width: 90, flexShrink: 0, fontSize: 12 }}>{label}</span>
                                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{val}</span>
                            </div>
                        ))}
                    </div>

                    {/* Certificate Preview */}
                    {(filePreviewUrl || cert.fileData || cert.file_url) && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>attach_file</span>
                                Uploaded Certificate
                            </div>
                            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                {(cert.file_mime_type || cert.file_url || cert.fileData || '').includes('pdf') ? (
                                    filePreviewUrl ? <iframe src={filePreviewUrl} title="Certificate PDF" style={{ width: '100%', height: 240, border: 'none', display: 'block' }} /> : <div style={{ padding: 24, textAlign: 'center' }}>Loading secure document…</div>
                                ) : (
                                    filePreviewUrl ? <img src={filePreviewUrl} alt="Uploaded Certificate" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', display: 'block' }} /> : <div style={{ padding: 24, textAlign: 'center' }}>Loading secure document…</div>
                                )}
                                <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cert.file_name || cert.fileName || 'View Attachment'}</span>
                                    <a href={filePreviewUrl || undefined} target="_blank" rel="noopener noreferrer"
                                        style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', padding: '3px 10px', background: 'rgba(45,91,227,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
                                        View Full
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Points Override */}
                    <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16, background: 'rgba(45,91,227,0.06)', border: '1px solid rgba(45,91,227,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Points to Award</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Max: {activity?.maxPoints ?? initialPoints} pts</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                type="number"
                                className="input"
                                min={0}
                                max={activity?.maxPoints ?? initialPoints}
                                value={pointsOverride}
                                onChange={e => {
                                    const v = Math.max(0, Math.min(activity?.maxPoints ?? initialPoints, Number(e.target.value)));
                                    setPointsOverride(v);
                                }}
                                style={{ flex: 1, fontSize: 20, fontWeight: 800, color: 'var(--accent)', textAlign: 'center' }}
                            />
                            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>pts</span>
                            {pointsOverride !== initialPoints && (
                                <button className="btn btn-ghost btn-sm" onClick={() => setPointsOverride(initialPoints)} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                                    ↩ Reset
                                </button>
                            )}
                        </div>
                        {pointsOverride !== initialPoints && (
                            <div style={{ fontSize: 11, marginTop: 6, color: 'var(--warning)' }}>
                                ✏ Modified from original {initialPoints} pts
                            </div>
                        )}
                    </div>

                    {/* Remark */}
                    <div className="form-group">
                        <label className="form-label">Remark {Number(pointsOverride) !== Number(initialPoints) ? '(Required for a points adjustment)' : '(Optional)'}</label>
                        <textarea className="input" rows={2} placeholder="Add a note for the student..."
                            value={remark} onChange={e => setRemark(e.target.value)} style={{ resize: 'none' }} />
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={refreshPreview}>Refresh secure document</button>
                    {reviewError && <div className="alert alert-error" style={{ margin: '0 16px 16px' }}>{reviewError}</div>}
                </div>

                {/* Actions */}
                <div className="modal-footer">
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handle('rejected')} disabled={submitting}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                        Reject
                    </button>
                    <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handle('approved')} disabled={submitting}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                        Approve + PDF
                    </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0 4px' }}>
                    Approval auto-generates and downloads a PDF certificate
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MY STUDENTS TAB  (previously "Progress")
════════════════════════════════════════════════════ */
function StudentsTab({ certs, students }) {
    const [search, setSearch] = useState('');
    const [semester, setSemester] = useState('');
    const filtered = students.filter(student => {
        const query = search.trim().toLowerCase();
        const identity = `${student.name || ''} ${student.roll_no || student.rollNo || ''}`.toLowerCase();
        return (!query || identity.includes(query)) && (!semester || String(student.semester) === semester);
    });
    const needsAttention = students.filter(student => certs.some(cert =>
        (cert.student_id || cert.studentId) === student.id && cert.status === 'pending'
    )).length;

    return (
        <div className="faculty-roster">
            <div className="roster-intro">
                <div><span className="eyebrow">YOUR DEPARTMENT</span><h2>My students<span>.</span></h2><p>See each student’s verified progress and submissions.</p></div>
                <div className="roster-summary"><strong>{students.length}</strong><span>students</span><strong>{needsAttention}</strong><span>awaiting review</span></div>
            </div>
            <div className="roster-toolbar">
                <label className="roster-search"><span className="material-symbols-outlined">search</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a name or registration number" aria-label="Find a student" /></label>
                <select value={semester} onChange={e => setSemester(e.target.value)} aria-label="Filter by semester">
                    <option value="">Every semester</option>
                    {[1,2,3,4,5,6,7,8].map(number => <option key={number} value={number}>Semester {number}</option>)}
                </select>
                <span className="roster-count">{filtered.length} shown</span>
            </div>
            {filtered.length === 0 ? <div className="roster-empty"><span className="material-symbols-outlined">person_search</span><h3>No students found</h3><p>Try another name or semester.</p></div> :
            <div className="roster-grid">{filtered.map(student => {
                const studentCerts = certs.filter(cert => (cert.student_id || cert.studentId) === student.id);
                const summary = calculateStudentSummary(studentCerts, student.studentType || student.student_type || 'regular');
                const target = (student.studentType || student.student_type) === 'lateral' ? 90 : (student.studentType || student.student_type) === 'pwd' ? 60 : 120;
                const waiting = studentCerts.filter(cert => cert.status === 'pending').length;
                const initials = student.name?.split(' ').map(part => part[0]).join('').slice(0,2).toUpperCase() || 'ST';
                return <article className="roster-card" key={student.id}>
                    <div className="roster-card-top"><div className="roster-avatar">{student.profile_url || student.profileUrl ? <img src={student.profile_url || student.profileUrl} alt="" /> : initials}</div><div className="roster-person"><h3>{student.name}</h3><p>{student.roll_no || student.rollNo || 'No registration number'} · S{student.semester || '—'}</p></div>{waiting > 0 && <span className="roster-waiting" title="Pending submissions">{waiting}<span className="material-symbols-outlined">schedule</span></span>}</div>
                    <div className="roster-score"><strong>{summary.total}</strong><span>of {target} estimated points</span></div>
                    <div className="roster-progress" role="group" aria-label="Estimated points by group">
                        {[[summary.group1,'I'],[summary.group2,'II'],[summary.group3,'III']].map(([value,label]) => <div className="roster-group" key={label}><span>Group {label}</span><b>{value || 0}</b><div className="roster-track"><i style={{width:`${Math.min(100,((value || 0)/40)*100)}%`}} /></div></div>)}
                    </div>
                    <div className="roster-card-foot"><span>{student.department || 'Your department'}</span><span>{summary.eligible ? 'Estimated target met' : 'In progress'}</span></div>
                </article>;
            })}</div>}
            <p className="roster-note">Totals are estimates from approved submissions. Faculty review determines each certificate’s status.</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   PROFILE TAB  (previously "Settings")
════════════════════════════════════════════════════ */
function ProfileTab({ user, onLogout, onRefresh, onUpdateUser }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [designation, setDesignation] = useState(user?.designation || '');
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef();

    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'FA';

    const handleSave = async () => {
        try {
            const updated = await updateUser({ ...user, name, email, phone, designation });
            onUpdateUser(updated);
            setSaved(true);
            setEditing(false);
            setTimeout(() => setSaved(false), 2500);
            onRefresh();
        } catch(err) { alert(err.message); }
    };

    const startEditing = () => {
        setName(user?.name || '');
        setEmail(user?.email || '');
        setPhone(user?.phone || '');
        setDesignation(user?.designation || '');
        setEditing(true);
    };

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

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            {saved && (
                <div className="alert alert-success" style={{ marginBottom: 16 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    Profile updated successfully!
                </div>
            )}

            {/* Profile Hero */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', gap: 20 }}>
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
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{user?.name}</h2>
                            <span className="badge badge-info">Faculty Advisor</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.designation} · {user?.department}</p>
                    </div>
                    {!editing && (
                        <button className="btn btn-ghost btn-sm" onClick={startEditing}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                            Edit
                        </button>
                    )}
                </div>

                <div style={{ padding: 24 }}>
                    {!editing ? (
                        <div className="profile-info-grid">
                            {[
                                ['Name', user?.name, 'person'],
                                ['Email', user?.email, 'email'],
                                ['Phone', user?.phone, 'call'],
                                ['Designation', user?.designation, 'badge'],
                                ['Department', user?.department, 'school'],
                                ['Username', user?.username, 'alternate_email'],
                            ].map(([label, val]) => (
                                <div className="profile-info-item" key={label}>
                                    <label>{label}</label>
                                    <p>{val || 'N/A'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Full Name</label>
                                <input className="input" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Email</label>
                                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Phone Number</label>
                                <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Designation</label>
                                <input className="input" value={designation} onChange={e => setDesignation(e.target.value)} />
                            </div>
                            <div style={{ padding:'8px 0', fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6 }}>
                                <span className="material-symbols-outlined" style={{ fontSize:14 }}>info</span>
                                Username cannot be changed. Contact admin if needed.
                            </div>
                            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout */}
            <div className="settings-item" onClick={onLogout} style={{ borderColor: 'color-mix(in srgb, var(--danger) 25%, transparent)', cursor: 'pointer' }}>
                <div className="settings-icon" style={{ background: 'var(--danger-bg)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--danger)', fontSize: 20 }}>logout</span>
                </div>
                <div className="settings-info">
                    <h4 style={{ color: 'var(--danger)' }}>Log Out</h4>
                    <p>Sign out of your account</p>
                </div>
            </div>
        </div>
    );
}
