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

    return <div className="role-approvals-page"><div className="role-intro"><div><span className="role-kicker">ACCESS REQUESTS</span><h1>Welcome the right people<em>.</em></h1><p>Check each student’s details before giving them access.</p></div><span className="review-count">{requests.length} waiting</span></div>{requests.length ? <div className="approval-list">{requests.map(account => <article className="approval-item" key={account.id}><div className="approval-avatar">{account.name?.split(' ').map(part => part[0]).join('').slice(0,2).toUpperCase() || 'ST'}</div><div className="approval-person"><h2>{account.name}</h2><p>{account.roll_no || account.username} · {account.department || 'Department not set'}</p><span>{account.email || 'No email'} · {account.phone || 'No phone'} · {account.year ? `Year ${account.year}` : 'Year not provided'}</span></div><div className="approval-actions"><button disabled={busyId === account.id} onClick={() => decide(account,'rejected')}>Reject</button><button disabled={busyId === account.id} onClick={() => decide(account,'approved')}>Approve <span className="material-symbols-outlined">arrow_forward</span></button></div></article>)}</div> : <div className="role-empty"><span className="material-symbols-outlined">how_to_reg</span><h3>No students waiting</h3><p>New registration requests will appear here.</p></div>}</div>;
}

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
    const getStudent = cert => cert.student || students.find(student => student.id === (cert.student_id || cert.studentId));
    const isOverdue = cert => (now - new Date(cert.created_at || cert.createdAt)) / (1000 * 60 * 60 * 24) > 3;
    const filtered = pendingCerts.filter(cert => {
        const student = getStudent(cert);
        const activity = getActivityForCertificate(cert);
        const query = search.trim().toLowerCase();
        return !query || (activity?.name || cert.activityName || '').toLowerCase().includes(query)
            || (student?.name || '').toLowerCase().includes(query)
            || (student?.roll_no || student?.rollNo || '').toLowerCase().includes(query);
    });
    return <div className="role-records-page"><div className="role-intro"><div><span className="role-kicker">FACULTY REVIEW</span><h1>Make every point count<em>.</em></h1><p>Open the proof, then approve or return it with clear feedback.</p></div><span className="review-count">{filtered.length} to review</span></div><div className="record-toolbar"><label><span className="material-symbols-outlined">search</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Student, registration number or activity" /></label></div>{filtered.length ? <div className="record-list">{filtered.map(cert => {const student = getStudent(cert);const activity = getActivityForCertificate(cert);return <article className="record-item faculty-record" key={cert.id}><div className="record-item-head"><span className="record-item-icon material-symbols-outlined">description</span><div><span className="role-kicker">{student?.name || 'Student'} · {student?.roll_no || student?.rollNo || 'No registration number'}</span><h2>{activity?.name || cert.activityName}</h2><p>Group {activity?.group || '—'} · Submitted {new Date(cert.created_at || cert.createdAt).toLocaleDateString('en-IN')}</p></div>{isOverdue(cert) && <span className="review-overdue">Waiting over 3 days</span>}</div><div className="record-item-foot"><span>{cert.level_selected || cert.selectedLevel || 'Certificate'}</span><strong>{cert.points_awarded ?? cert.pointsAwarded} <small>proposed points</small></strong><button onClick={() => setReviewing(cert)}>Open review <span className="material-symbols-outlined">arrow_forward</span></button></div></article>})}</div> : <div className="role-empty"><span className="material-symbols-outlined">task_alt</span><h3>{search ? 'Nothing matches your search' : 'No pending reviews'}</h3><p>{search ? 'Try another name or activity.' : 'You’re all caught up for now.'}</p></div>}{reviewing && <ReviewModal cert={reviewing} student={getStudent(reviewing)} faculty={user} onClose={() => setReviewing(null)} onRefresh={onRefresh} />}</div>;
}

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
        const identity = `${student.name || ''} ${student.roll_no || student.rollNo || ''}`.toLowerCase();
        return identity.includes(search.trim().toLowerCase()) && (!semester || String(student.semester) === semester);
    });
    const waiting = students.filter(student => certs.some(cert => (cert.student_id || cert.studentId) === student.id && cert.status === 'pending')).length;
    return <div className="faculty-students-page"><div className="role-intro"><div><span className="role-kicker">YOUR DEPARTMENT</span><h1>Know your students<em>.</em></h1><p>Approved points, group balance, and submissions in one clear view.</p></div><div className="students-count"><strong>{students.length}</strong><span>students</span><strong>{waiting}</strong><span>with pending work</span></div></div><div className="record-toolbar"><label><span className="material-symbols-outlined">search</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a name or registration number" /></label><select value={semester} onChange={event => setSemester(event.target.value)} aria-label="Filter by semester"><option value="">All semesters</option>{[1,2,3,4,5,6,7,8].map(number => <option key={number} value={number}>Semester {number}</option>)}</select></div>{filtered.length ? <div className="student-roster-list">{filtered.map(student => {const studentCerts = certs.filter(cert => (cert.student_id || cert.studentId) === student.id);const summary = calculateStudentSummary(studentCerts, student.studentType || student.student_type || 'regular');const type = student.studentType || student.student_type || 'regular';const target = type === 'lateral' ? 90 : type === 'pwd' ? 60 : 120;const pending = studentCerts.filter(cert => cert.status === 'pending').length;const initials = student.name?.split(' ').map(part => part[0]).join('').slice(0,2).toUpperCase() || 'ST';return <article className="student-roster-row" key={student.id}><div className="roster-person"><span className="roster-avatar">{student.profile_url || student.profileUrl ? <img src={student.profile_url || student.profileUrl} alt="" /> : initials}</span><div><h2>{student.name}</h2><p>{student.roll_no || student.rollNo || 'Registration unavailable'} · S{student.semester || '—'}</p></div></div><div className="roster-group-bars">{[[summary.group1,'I'],[summary.group2,'II'],[summary.group3,'III']].map(([points,group]) => <div key={group}><span>{group}</span><i><b style={{width:`${Math.min(100,((points || 0)/40)*100)}%`}} /></i><strong>{points || 0}</strong></div>)}</div><div className="roster-total"><strong>{summary.total}<small>/{target}</small></strong><span>{pending ? `${pending} awaiting review` : summary.eligible ? 'Estimated target met' : 'In progress'}</span></div></article>})}</div> : <div className="role-empty"><span className="material-symbols-outlined">person_search</span><h3>No students found</h3><p>Try another search or semester.</p></div>}<p className="roster-disclaimer">Point totals are estimates from approved submissions. Faculty review determines certificate status.</p></div>;
}

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

    return <div className="role-profile-page">
        <section className="role-profile-hero"><div className="role-profile-hero-main"><span className="role-kicker">FACULTY PROFILE</span><div className="role-profile-avatar" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={event => {if(event.key === 'Enter') fileInputRef.current?.click()}} aria-label="Change profile photo">{uploading ? <span className="material-symbols-outlined">progress_activity</span> : user?.profileUrl ? <img src={user.profileUrl} alt="" /> : initials}</div><div><h1>{user?.name}</h1><p>{user?.designation || 'Faculty advisor'} · {user?.department}</p><div className="role-profile-actions"><button onClick={startEditing}><span className="material-symbols-outlined">edit</span>Edit profile</button>{user?.profileUrl && <button onClick={handleRemovePhoto}>Remove photo</button>}</div></div></div><div className="role-profile-decoration"><span className="material-symbols-outlined">school</span></div><input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={handlePhotoChange} /></section>
        {saved && <div className="alert alert-success">Profile updated.</div>}
        <div className="role-profile-body"><section className="role-profile-details"><div className="role-section-heading"><div><span className="role-kicker">YOUR DETAILS</span><h2>Contact & role.</h2></div></div>{!editing ? <div className="role-detail-grid">{[['Name',user?.name],['Email',user?.email],['Phone',user?.phone],['Designation',user?.designation],['Department',user?.department],['Username',user?.username]].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value || 'Not added'}</strong></div>)}</div> : <div className="role-edit-grid"><label>Full name<input className="input" value={name} onChange={event => setName(event.target.value)} /></label><label>Email<input className="input" type="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label>Phone<input className="input" type="tel" value={phone} onChange={event => setPhone(event.target.value)} /></label><label>Designation<input className="input" value={designation} onChange={event => setDesignation(event.target.value)} /></label><div className="role-edit-actions"><button onClick={() => setEditing(false)}>Cancel</button><button onClick={handleSave}>Save changes</button></div></div>}</section><aside className="role-profile-aside"><span className="role-kicker">YOUR ACCOUNT</span><p>Your department is assigned by an administrator.</p><button onClick={onLogout}><span className="material-symbols-outlined">logout</span>Sign out<span className="material-symbols-outlined">arrow_forward</span></button></aside></div>
    </div>;
}
