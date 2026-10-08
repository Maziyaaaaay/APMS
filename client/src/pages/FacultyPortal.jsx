import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';
import { getCertificates, getUsers, updateCertificate, updateUser, getCirculars, getCertificateFileUrl } from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';
import { ACTIVITIES, calculateStudentSummary } from '../utils/points';
import { generateApprovalPDF } from '../utils/pdfGenerator';

const NAV_ITEMS = [
    { key: 'dashboard',  icon: 'dashboard',      label: 'Dashboard'       },
    { key: 'reviews',    icon: 'fact_check',      label: 'Pending Reviews' },
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
    const [circulars, setCirculars] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

    const [loadError, setLoadError] = useState('');
    const refreshData = useCallback(async () => {
        try {
            const [certsData, usersData, circsData] = await Promise.all([
                getCertificates(),
                getUsers(),
                getCirculars(),
            ]);
            setCerts(certsData);
            setStudents(usersData.filter(u => u.role === 'student'));
            setCirculars(circsData); setLoadError('');
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

    const PAGE_TITLES = {
        dashboard: 'Dashboard',
        reviews:   'Pending Reviews',
        students:  'My Students',
        profile:   'Profile',
    };

    return (
        <div className="portal-layout">
            {/* Sidebar overlay (mobile) */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">
                        <span className="material-symbols-outlined">school</span>
                    </div>
                    <div className="sidebar-brand-text">
                        <h1>KTU APMS</h1>
                        <p>Faculty Portal</p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.key}
                            className={`nav-item ${tab === item.key ? 'active' : ''}`}
                            onClick={() => { setTab(item.key); setSidebarOpen(false); }}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => { setTab('profile'); setSidebarOpen(false); }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                            {user?.profileUrl ? <img src={user.profileUrl} alt="Profile" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : initials}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{user?.designation || 'Faculty Advisor'}</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                {/* Top Bar */}
                <header className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="topbar-menu-btn" onClick={() => setSidebarOpen(o => !o)}>
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <span className="topbar-title">{PAGE_TITLES[tab]}</span>
                    </div>
                    <div className="topbar-right">
                        <div className="topbar-user-info">
                            <div className="topbar-user-name">{user?.name}</div>
                            <div className="topbar-user-sub">{user?.designation || 'Faculty Advisor'} · {user?.department}</div>
                        </div>
                        <div className="topbar-avatar" style={{ cursor: 'pointer', overflow:'hidden', padding:user?.profileUrl ? 0 : '', display:user?.profileUrl ? 'block' : 'flex' }} onClick={() => setTab('profile')}>
                            {user?.profileUrl ? <img src={user.profileUrl} alt="Profile" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : initials}
                        </div>
                        <button className="theme-toggle" onClick={toggleDark} title="Toggle dark mode">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                {dark ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="page-content">
                    {loadError && <div role="alert" className="alert alert-danger">{loadError} <button onClick={refreshData}>Try again</button></div>}
                    {tab === 'dashboard' && (
                        <DashboardTab
                            user={user}
                            certs={certs}
                            students={students}
                            pendingCerts={pendingCerts}
                            circulars={circulars}
                            onRefresh={refreshData}
                            onGoReviews={() => setTab('reviews')}
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
                    {tab === 'students' && (
                        <StudentsTab certs={certs} students={students} />
                    )}
                    {tab === 'profile' && (
                        <ProfileTab user={user} onLogout={handleLogout} onRefresh={refreshData} onUpdateUser={setUser} />
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   DASHBOARD TAB
════════════════════════════════════════════════════ */
function DashboardTab({ user, certs, students, pendingCerts, circulars, onGoReviews }) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const approvedThisMonth = certs.filter(c => {
        if (c.status !== 'approved') return false;
        const d = new Date(c.reviewed_at || c.approvedAt || c.created_at || c.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const isOverdue = (cert) => {
        const days = (now - new Date(cert.created_at || cert.createdAt)) / (1000 * 60 * 60 * 24);
        return days > 3;
    };

    const getStudent = (cert) => cert.student || students.find(s => s.id === (cert.student_id || cert.studentId));

    const topCirculars = (circulars || []).slice(0, 3);

    const PRIORITY_COLORS = {
        normal: { bg: 'rgba(45,91,227,0.08)', text: 'var(--accent)', border: 'rgba(45,91,227,0.2)' },
        urgent: { bg: 'rgba(239,68,68,0.08)', text: 'var(--danger)', border: 'rgba(239,68,68,0.2)' },
        info:   { bg: 'rgba(6,182,212,0.08)',  text: '#06b6d4',       border: 'rgba(6,182,212,0.2)' },
    };

    return (
        <>
            {/* Welcome Banner */}
            <div className="points-banner" style={{ marginBottom: 24 }}>
                <h3>Welcome back, {user?.name?.split(' ')[0]}!</h3>
                <div className="points-main" style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.8)' }}>
                        {user?.designation || 'Faculty Advisor'} · {user?.department}
                    </span>
                </div>
                <div className="points-footer" style={{ marginTop: 10 }}>
                    <span className="points-sub">{pendingCerts.length} certificates awaiting your review</span>
                    {pendingCerts.length > 0 && (
                        <button
                            onClick={onGoReviews}
                            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, padding: '5px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>fact_check</span>
                            Review Now
                        </button>
                    )}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stat-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-card-top">
                        <span className="stat-card-label">Pending Reviews</span>
                        <span className="stat-card-icon"><span className="material-symbols-outlined" style={{ color: 'var(--warning)' }}>schedule</span></span>
                    </div>
                    <div className="stat-card-val" style={{ color: 'var(--warning)' }}>{pendingCerts.length}</div>
                    <div className="stat-card-sub">Awaiting decision</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-top">
                        <span className="stat-card-label">Approved This Month</span>
                        <span className="stat-card-icon"><span className="material-symbols-outlined" style={{ color: 'var(--success)' }}>verified</span></span>
                    </div>
                    <div className="stat-card-val" style={{ color: 'var(--success)' }}>{approvedThisMonth}</div>
                    <div className="stat-card-sub">Certificates verified</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-top">
                        <span className="stat-card-label">Total Students</span>
                        <span className="stat-card-icon"><span className="material-symbols-outlined" style={{ color: 'var(--accent)' }}>groups</span></span>
                    </div>
                    <div className="stat-card-val" style={{ color: 'var(--accent)' }}>{students.length}</div>
                    <div className="stat-card-sub">Enrolled students</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
                {/* Pending Table */}
                <div className="table-card">
                    <div className="table-card-header">
                        <h3>Pending Submissions</h3>
                        <button className="btn btn-ghost btn-sm" onClick={onGoReviews}>
                            View All <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                        </button>
                    </div>
                    {pendingCerts.length === 0 ? (
                        <div className="empty-state">
                            <span className="material-symbols-outlined">check_circle</span>
                            <p>All caught up! No pending reviews.</p>
                        </div>
                    ) : (
                        <div className="table-overflow">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Activity</th>
                                        <th>Student</th>
                                        <th>Submitted</th>
                                        <th className="td-center">Points</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingCerts.slice(0, 6).map(cert => {
                                        const student = getStudent(cert);
                                        const act = ACTIVITIES[cert.activity_id || cert.activityId];
                                        const overdue = isOverdue(cert);
                                        return (
                                            <tr key={cert.id} style={overdue ? { borderLeft: '3px solid var(--warning)' } : {}}>
                                                <td className="td-bold">{act?.name || cert.activityName}</td>
                                                <td>
                                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{student?.name || 'Unknown'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student?.roll_no || student?.rollNo}</div>
                                                </td>
                                                <td className="td-muted">
                                                    {new Date(cert.created_at || cert.createdAt).toLocaleDateString('en-IN')}
                                                    {overdue && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--warning)', fontWeight: 700 }}>OVERDUE</span>}
                                                </td>
                                                <td className="td-center td-bold">{cert.points_awarded ?? cert.pointsAwarded}</td>
                                                <td><span className="badge badge-pending">Pending</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Announcements */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: 20 }}>campaign</span>
                            <h3>Announcements</h3>
                        </div>
                    </div>
                    <div className="card-body" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {topCirculars.length === 0 ? (
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No announcements yet</div>
                        ) : topCirculars.map(circ => {
                            const pc = PRIORITY_COLORS[circ.priority] || PRIORITY_COLORS.normal;
                            return (
                                <div key={circ.id} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: pc.bg, border: `1px solid ${pc.border}` }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: pc.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                                        {circ.priority || 'normal'} · {circ.issued_on ? new Date(`${circ.issued_on}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(circ.created_at || circ.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{circ.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{circ.content || circ.body}</div>
                                    {circ.source_url && <a href={circ.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7, fontSize: 11, color: 'var(--accent)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>Official circular
                                    </a>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════
   PENDING REVIEWS TAB
════════════════════════════════════════════════════ */
export function ReviewsTab({ pendingCerts, students, user, onRefresh }) {
    const [reviewing, setReviewing] = useState(null);
    const [search, setSearch] = useState('');
    const now = new Date();

    const getStudent = (cert) => cert.student || students.find(s => s.id === (cert.student_id || cert.studentId));
    const isOverdue = (cert) => (now - new Date(cert.created_at || cert.createdAt)) / (1000 * 60 * 60 * 24) > 3;

    const filtered = pendingCerts.filter(c => {
        const student = getStudent(c);
        const act = ACTIVITIES[c.activity_id || c.activityId];
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
                                    const act = ACTIVITIES[cert.activity_id || cert.activityId];
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
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>{student?.name || '—'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student?.roll_no || student?.rollNo} · {student?.department}</div>
                                            </td>
                                            <td className="td-muted">Group {act?.group || '—'}</td>
                                            <td className="td-muted">{cert.level_selected || cert.selectedLevel || '—'}</td>
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
    const actId = cert.activity_id || cert.activityId;
    const activity = cert.activity_snapshot || ACTIVITIES[actId];

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
                            ['Event', cert.event_name || '—'],
                            ['Group', `Group ${activity?.group || '?'}`],
                            ['Category', activity?.category || '—'],
                            ['Level', cert.level_selected || cert.selectedLevel || 'N/A'],
                            ['Activity date', cert.activity_date || cert.activityDate ? new Date(`${cert.activity_date || cert.activityDate}T00:00:00`).toLocaleDateString('en-IN') : 'N/A'],
                            ['Description', cert.description || '—'],
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
    const [deptFilter, setDept] = useState('');
    const [classFilter, setClass] = useState('');
    const [semFilter, setSem] = useState('');

    const currentSems = getCurrentSemesters();
    const isEven = currentSems[0] === 2;
    const classOptions = DUAL_CLASS_DEPTS[deptFilter] || [];
    const handleDeptChange = (val) => { setDept(val); setClass(''); };

    const isFiltered = search || deptFilter || classFilter || semFilter;
    const clearAll = () => { setSearch(''); setDept(''); setClass(''); setSem(''); };

    const filtered = students.filter(s => {
        const matchSearch = !search ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            (s.roll_no || s.rollNo || '').toLowerCase().includes(search.toLowerCase());
        const matchDept = !deptFilter || s.department === deptFilter;
        const matchClass = !classFilter || (s.class || '') === classFilter;
        const matchSem = !semFilter || s.semester === parseInt(semFilter.replace('S', ''));
        return matchSearch && matchDept && matchClass && matchSem;
    });

    return (
        <>
            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div className="search-box" style={{ flex: '1 1 220px', minWidth: 180 }}>
                    <span className="search-box-icon"><span className="material-symbols-outlined">search</span></span>
                    <input className="input" placeholder="Search by name or roll number…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input" style={{ flex: '0 0 200px' }} value={deptFilter} onChange={e => handleDeptChange(e.target.value)}>
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="input" style={{ flex: '0 0 160px' }} value={semFilter} onChange={e => setSem(e.target.value)}>
                    <option value="">All Semesters</option>
                    {currentSems.map(n => <option key={n} value={`S${n}`}>S{n}</option>)}
                </select>
            </div>

            {/* Class Division filter */}
            {classOptions.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button onClick={() => setClass('')} className={`btn btn-sm ${!classFilter ? 'btn-primary' : 'btn-ghost'}`}>All Classes</button>
                    {classOptions.map(cls => (
                        <button key={cls} onClick={() => setClass(cls)} className={`btn btn-sm ${classFilter === cls ? 'btn-primary' : 'btn-ghost'}`}>{cls}</button>
                    ))}
                </div>
            )}

            {/* Results header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
                    {isEven ? ' · Even Semester' : ' · Odd Semester'}
                </span>
                {isFiltered && (
                    <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ fontSize: 11 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>
                        Clear filters
                    </button>
                )}
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state">
                    <span className="material-symbols-outlined">search</span>
                    <p>No students match these filters</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                    {filtered.map(student => {
                        const studentCerts = certs.filter(c => (c.student_id || c.studentId) === student.id);
                        const summary = calculateStudentSummary(studentCerts, student.studentType || student.student_type || 'regular');
                        const sType = student.studentType || student.student_type || 'regular';
                        const reqTotal = sType === 'lateral' ? 90 : sType === 'pwd' ? 60 : 120;
                        const pct = (v, m) => Math.min((v / m) * 100, 100);
                        const initials = student.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'ST';

                        return (
                            <div key={student.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                                        {student.profile_url || student.profileUrl ? (
                                            <img src={student.profile_url || student.profileUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : initials}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {student.roll_no || student.rollNo || '—'} · {student.department || '—'}
                                        </div>
                                    </div>
                                    {summary.eligible
                                        ? <span className="badge badge-approved">Estimate meets target</span>
                                        : <span className="badge badge-pending">Estimated in progress</span>
                                    }
                                </div>
                                <div style={{ padding: '12px 16px' }}>
                                    {[
                                        { label: 'Group I', val: summary.group1, color: 'var(--accent)' },
                                        { label: 'Group II', val: summary.group2, color: 'var(--success)' },
                                        { label: 'Group III', val: summary.group3, color: '#7c3aed' },
                                    ].map(g => (
                                        <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 60, flexShrink: 0 }}>{g.label}</span>
                                            <div className="progress-track" style={{ flex: 1 }}>
                                                <div className="progress-fill" style={{ width: `${pct(g.val, 40)}%`, background: g.color }} />
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: g.color, width: 28, textAlign: 'right' }}>{g.val}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                        <span>
                                            <span className="badge badge-pending" style={{ marginRight: 6 }}>{studentCerts.filter(c => c.status === 'pending').length} pending</span>
                                            <span className="badge badge-approved">{studentCerts.filter(c => c.status === 'approved').length} approved</span>
                                        </span>
                                        <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>{summary.total}/{reqTotal}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}

/* ═══════════════════════════════════════════════════
   PROFILE TAB  (previously "Settings")
════════════════════════════════════════════════════ */
function ProfileTab({ user, onLogout, onRefresh, onUpdateUser }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [designation, setDesignation] = useState(user?.designation || '');
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef();

    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'FA';

    const handleSave = async () => {
        try {
            const updated = await updateUser({ ...user, name, email, designation });
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
