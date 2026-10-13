Warning: truncated output (original token count: 14484)
Total output lines: 928

import BrandLogo from '../components/BrandLogo';
import InterfaceIcon from '../components/InterfaceIcon';
import { AmbientBackdrop, WorkspaceHeading, MetricCard, ActionTile } from '../components/DashboardKit';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';
import {
    getUsers, addUser, deleteUser, updateUser, reviewAccount,
    getDepartmentsWithIds, addDepartment, removeDepartment,
    getCirculars, addCircular, deleteCircular,
    getPointOverrides, savePointOverride, deletePointOverride,
    promoteToAdmin, transferOwnership,
} from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';
import { ACTIVITIES } from '../utils/points';

const NAV_ITEMS = [
    { key: 'dashboard',    icon: 'dashboard',          label: 'Dashboard'     },
    { key: 'users',        icon: 'manage_accounts',    label: 'Manage Users'  },
    { key: 'approvals',    icon: 'how_to_reg',         label: 'Account Requests' },
    { key: 'departments',  icon: 'account_balance',    label: 'Departments'   },
    { key: 'circulars',    icon: 'campaign',           label: 'Circulars'     },
    { key: 'points',       icon: 'analytics',          label: 'Point Grading' },
    { key: 'profile',      icon: 'person',             label: 'Profile'       },
];

export default function AdminPortal() {
    const navigate = useNavigate();
    const [user, setUser] = useState(() => getCurrentUser());
    const [tab, setTab] = useState('dashboard');
    const [users, setUsers] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

    const [loadError, setLoadError] = useState('');
    const refresh = useCallback(async () => {
        try {
            const usersData = await getUsers();
            setUsers(usersData); setLoadError('');
        } catch (err) { setLoadError(err.message); }
    }, []);
    useEffect(() => {
        if (!user) { navigate('/'); return; }
        Promise.resolve().then(refresh);
    }, [user, navigate, refresh]);

    const handleLogout = () => { logout(); navigate('/'); };
    const toggleDark = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
    };

    const students = users.filter(u => u.role === 'student' && (u.account_status || 'approved') === 'approved');
    const faculty  = users.filter(u => u.role === 'faculty' && (u.account_status || 'approved') === 'approved');
    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';

    const PAGE_TITLES = {
        dashboard:   'Dashboard',
        users:       'Manage Users',
        approvals:   'Account Requests',
        departments: 'Departments',
        circulars:   'Circulars & Announcements',
        points:      'Activity Point Grading',
        profile:     'Profile',
    };

    return (
        <div className="portal-layout admin-portal">
            <AmbientBackdrop />
            {/* Sidebar overlay (mobile) */}
            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand"><BrandLogo /><div className="sidebar-brand-text">
                        <p>Admin Panel</p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.key}
                            className={`nav-item ${tab === item.key ? 'active' : ''}`}
                            aria-current={tab === item.key ? 'page' : undefined}
                            onClick={() => { setTab(item.key); setSidebarOpen(false); }}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer" style={{ cursor: 'pointer' }} onClick={() => { setTab('profile'); setSidebarOpen(false); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                            {user?.profileUrl ? <img src={user.profileUrl} alt="Profile" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : initials}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>System Administrator</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                <header className="topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="topbar-menu-btn" aria-label="Open navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(o => !o)}>
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <span className="topbar-title">{PAGE_TITLES[tab]}</span>
                    </div>
                    <div className="topbar-right">
                        <div className="topbar-user-info">
                            <div className="topbar-user-name">{user?.name}</div>
                            <div className="topbar-user-sub">System Administrator</div>
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

                <div className="page-content" key={tab}>
                    {tab !== 'dashboard' && <WorkspaceHeading title={PAGE_TITLES[tab]} description={{users: 'Add and remove students and faculty, and keep campus access organised.', approvals: 'Approve faculty registrations. Student registrations are reviewed by their department advisors.', departments: 'Keep your campus departments organised.', circulars: 'Publish university updates and guidance for your campus.', points: 'Explore activity categories and provisional point rules.', profile: 'Manage your details and account.'}[tab]} />}
                    {loadError && <div role="alert" className="alert alert-danger">{loadError} <button onClick={refresh}>Try again</button></div>}
                    {tab === 'dashboard'   && <DashboardTab user={user} users={users} students={students} faculty={faculty} onNavigate={setTab} />}
                    {tab === 'users'       && <UsersTab students={students} faculty={faculty} onRefresh={refresh} currentUser={user} />}
                    {tab === 'approvals'   && <AccountApprovals users={users} onRefresh={refresh} currentUser={user} />}
                    {tab === 'departments' && <DepartmentsTab />}
                    {tab === 'circulars'   && <CircularsTab />}
                    {tab === 'points'      && <PointGradingTab />}
                    {tab === 'profile'     && <ProfileTab user={user} onLogout={handleLogout} onUpdateUser={setUser} />}
                </div>
            </div>
        </div>
    );
}

function AccountApprovals({ users, onRefresh, currentUser }) {
    const [busyId, setBusyId] = useState(null);
    const [transferTarget, setTransferTarget] = useState(null);
    const [transferPassword, setTransferPassword] = useState('');
    const [transferError, setTransferError] = useState('');
    const pending = users.filter(u => u.role === 'faculty' && u.account_status === 'pending');
    const decide = async (account, status) => {
        setBusyId(account.id);
        try {
            await reviewAccount(account.id, status);
            await onRefresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setBusyId(null);
        }
    };
    const disableAdmin = async (account) => {
        if (!window.confirm(`Disable admin account ${account.name}?`)) return;
        setBusyId(account.id);
        try { await deleteUser(account.id); await onRefresh(); }
        catch (err) { alert(err.message); }
        finally { setBusyId(null); }
    };
    const handover = async (event) => {
        event.preventDefault();
        setBusyId(transferTarget.id);
        setTransferError('');
        try {
            await transferOwnership(transferTarget.id, transferPassword);
            setTransferPassword('');
            logout();
            window.location.assign('/');
        } catch (err) { setTransferError(err.message); }
        finally { setBusyId(null); }
    };
    const administrators = users.filter(u => u.role === 'admin' && !u.is_super_admin);
    return (
        <>
        <section className="card">
            <div className="card-header"><h3>Faculty access requests</h3><span className="badge badge-pending">{pending.length} waiting</span></div>
            <div className="card-body">
                <p className="td-muted" style={{ marginTop: 0 }}>Faculty accounts wait for admin approval. Student accounts are approved by a faculty advisor in their department.</p>
                {pending.length === 0 ? <div className="empty-state"><span className="material-symbols-outlined">task_alt</span><p>No faculty registrations are waiting.</p></div> : (
                    <div className="table-overflow"><table className="data-table">
                        <thead><tr><th>Faculty</th><th>Contact</th><th>Department</th><th>Requested</th><th>Decision</th></tr></thead>
                        <tbody>{pending.map(account => <tr key={account.id}>
                            <td><div className="td-bold">{account.name}</div><div className="td-muted">@{account.username}</div></td>
                            <td><div>{account.email}</div><div className="td-muted">{account.phone}</div></td>
                            <td>{account.department || ' / '}</td>
                            <td>{account.account_status}<br />{account.created_at ? new Date(account.created_at).toLocaleDateString('en-IN') : ' / '}</td>
                            <td><div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary btn-sm" disabled={busyId === account.id} onClick={() => decide(account, 'approved')}>Approve</button>
                                <button className="btn btn-danger btn-sm" disabled={busyId === account.id} onClick={() => decide(account, 'rejected')}>Reject</button>
                            </div></td>
                        </tr>)}</tbody>
                    </table></div>
                )}
            </div>
        </section>
        {currentUser?.isSuperAdmin && <section className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><h3>Admin access</h3><span className="td-muted">Super admin controls</span></div>
            <div className="card-body">
                {administrators.length === 0 ? <p className="td-muted">No additional admins yet. Promote a trusted user from Manage Users.</p> :
                    <div className="table-overflow"><table className="data-table">
                        <thead><tr><th>Admin</th><th>Username</th><th>Access</th></tr></thead>
                        <tbody>{administrators.map(account => <tr key={account.id}>
                            <td>{account.name}</td><td>@{account.username}</td>
                            <td><div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-danger btn-sm" disabled={busyId === account.id} onClick={() => disableAdmin(account)}>Disable</button>
                                {account.account_status === 'approved' && <button className="btn btn-outline btn-sm" disabled={Boolean(busyId)} onClick={() => { setTransferTarget(account); setTransferPassword(''); setTransferError(''); }}>Transfer ownership</button>}
                            </div></td>
                        </tr>)}</tbody>
                    </table></div>}
            </div>
        </section>}
        {transferTarget && <div className="modal-overlay" role="presentation">
            <section className="modal" role="dialog" aria-modal="true" aria-labelledby="handover-title">
                <div className="modal-header"><h3 id="handover-title">Transfer super admin access</h3></div>
                <form onSubmit={handover} className="modal-body">
                    <p>{transferTarget.name} will become the only super admin. You will remain an admin. Both accounts will need to sign in again.</p>
                    {transferError && <div className="alert alert-error" role="alert">{transferError}</div>}
                    <label className="form-label" htmlFor="handover-password">Your current password</label>
                    <input id="handover-password" className="input" type="password" autoComplete="current-password" required value={transferPassword} onChange={e => setTransferPassword(e.target.value)} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button type="button" className="btn btn-outline" disabled={Boolean(busyId)} onClick={() => { setTransferTarget(null); setTransferPassword(''); }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={Boolean(busyId)}>{busyId ? 'Transferring…' : 'Transfer ownership'}</button>
                    </div>
                </form>
            </section>
        </div>}
        </>
    );
}

/* ═══════════════════════════════════════════════════
   DASHBOARD TAB
════════════════════════════════════════════════════ */
function DashboardTab({ user, users, students, faculty, onNavigate }) {
    const accountRequests = users.filter(u => u.role === 'faculty' && u.account_status === 'pending').length;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return <div className="dashboard-composition">
        <div className="campus-hero"><WorkspaceHeading eyebrow="YOUR CAMPUS" title="Keep campus moving." description={`${greeting}, ${user?.name?.split(' ')[0] || 'Admin'}.`} /><div className="campus-hero-art" aria-hidden="true"><InterfaceIcon name="school" style={{width:72,height:72}} /></div></div>
        <section className="work-queue" aria-labelledby="queue-title">
            <div className="section-intro"><h3 id="queue-title">Your next actions</h3><span>{accountRequests} waiting</span></div>
            <ActionTile title="Approve faculty" detail={accountRequests ? 'Waiting for access' : 'All caught up'} count={accountRequests} icon="person_check" tone="rose" onClick={() => onNavigate('approvals')} />
        </section>
        <section className="campus-register"><div className="section-intro"><h3>Campus at a glance</h3></div><div className="metric-grid">
            <MetricCard label="Students" value={students.length} detail="Approved accounts" icon="school" tone="rose" onClick={() => onNavigate('users')} />
            <MetricCard label="Faculty" value={faculty.length} detail="Approved advisors" icon="groups" tone="violet" onClick={() => onNavigate('users')} />
            <MetricCard label="Faculty requests" value={accountRequests} detail="Waiting for your approval" icon="how_to_reg" tone="amber" onClick={() => onNavigate('approvals')} />
        </div></section>
        <nav className="workspace-links" aria-label="Campus administration"><button onClick={() => onNavigate('users')}>Manage people</button><button onClick={() => onNavigate('departments')}>Departments</button><button onClick={() => onNavigate('circulars')}>University circulars</button></nav>
    </div>;
}

/* ═══════════════════════════════════════════════════
   MANAGE USERS TAB
════════════════════════════════════════════════════ */
function UsersTab({ students, faculty, onRefresh, currentUser }) {
    const [userType, setUserType] = useState('student');
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '', username: '', password: '', email: '', phone: '',
        department: '', role: 'student', studentType: 'regular', rollNo: '', designation: '',
    });

    const [departments, setDepartments] = useState([]);
    useEffect(() => { getDepartmentsWithIds().then(data => { setDepartments(data); }).catch(console.error); }, []);
    const list = userType === 'student' ? students : faculty;

    const filtered = list.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.roll_no || u.rollNo || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = async () => {
        if (!newUser.name || !(newUser.role === 'student' ? newUser.rollNo : newUser.username) || !newUser.password || !newUser.email || !newUser.phone) return;
        try { await addUser({ ...newUser, username: newUser.role === 'student' ? newUser.rollNo : newUser.username }); } catch (err) { alert(err.message); return; }
        setShowAdd(false);
        setNewUser({ name: '', username: '', password: '', email: '', phone: '', department: '', role: newUser.role, studentType: 'regular', rollNo: '', designation: '' });
        onRefresh();
    };

    const handleDelete = async (id) => {
        if (window.confirm('Remove this user?')) { try { await deleteUser(id); } catch (err) { alert(err.message); return; } onRefresh(); }
    };

    const handlePromote = async (id) => {
        if (window.confirm('Promote this user to Admin? They will no longer be a Student/Faculty.')) {
            try { await promoteToAdmin(id); } catch (err) { alert(err.message); return; }
            onRefresh();
        }
    };

    return (
        <>
            {/* Sub-tab toggle */}
            <div style={{ displ…4484 tokens truncated… sourceUrl: sourceUrl.trim(), issuedOn: issuedOn || null, priority }); } catch (err) { alert(err.message); return; }
        getCirculars().then(setCirculars);
        setTitle(''); setBody(''); setSourceUrl(''); setIssuedOn(''); setPri('normal'); setShowForm(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this circular?')) return;
        try { await deleteCircular(id); } catch (err) { alert(err.message); return; }
        getCirculars().then(setCirculars);
    };

    return (
        <>
            <div style={{ marginBottom: 20 }}>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showForm ? 'close' : 'add'}</span>
                    {showForm ? 'Cancel' : 'Post New Circular'}
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: 20 }}>campaign</span>
                            <h3>New Circular</h3>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label className="form-label">Title</label>
                            <input className="input" placeholder="e.g. Activity Points Deadline Extended"
                                value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Message</label>
                            <textarea className="input" rows={4} placeholder="Write the full announcement here..."
                                value={body} onChange={e => setBody(e.target.value)} style={{ resize: 'vertical' }} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Official source link</label>
                                <input className="input" type="url" placeholder="https://ktu.edu.in/..."
                                    value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Circular issue date</label>
                                <input className="input" type="date" value={issuedOn} onChange={e => setIssuedOn(e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {Object.entries(PRIORITY_COLORS).map(([key, val]) => (
                                    <button key={key} className={`btn btn-sm ${priority === key ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{ flex: 1 }} onClick={() => setPri(key)}>{val.label}</button>
                                ))}
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handlePost}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
                            Post Circular
                        </button>
                    </div>
                </div>
            )}

            {circulars.length === 0 ? (
                <div className="empty-state">
                    <span className="material-symbols-outlined">campaign</span>
                    <p>No circulars posted yet</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {circulars.map(circ => {
                        const pc = PRIORITY_COLORS[circ.priority] || PRIORITY_COLORS.normal;
                        return (
                            <div key={circ.id} style={{ padding: '16px 18px', borderRadius: 'var(--radius)', background: pc.bg, border: `1px solid ${pc.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: pc.text, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20, background: `color-mix(in srgb, ${pc.text} 12%, transparent)` }}>
                                            {circ.priority || 'normal'}
                                        </span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {(circ.issued_on ? new Date(`${circ.issued_on}T00:00:00`) : new Date(circ.created_at || circ.createdAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <button className="btn btn-danger btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}
                                        onClick={() => handleDelete(circ.id)}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                                    </button>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>{circ.title}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{circ.content || circ.body}</div>
                                {circ.source_url && <a href={circ.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>View official source
                                </a>}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}

/* ═══════════════════════════════════════════════════
   POINT GRADING TAB
════════════════════════════════════════════════════ */
function PointGradingTab() {
    const [overrides, setOverrides] = useState({});
    const [editing, setEditing] = useState(null);
    const [searchAct, setSearchAct] = useState('');
    const [groupFilter, setGroupFilter] = useState(0);
    const [editNote, setEditNote] = useState('');

    useEffect(() => { getPointOverrides().then(setOverrides).catch(console.error); }, []);

    const allActivities = Object.values(ACTIVITIES);
    const filtered = allActivities.filter(a => {
        const matchGroup = !groupFilter || a.group === groupFilter;
        const matchSearch = !searchAct || a.name.toLowerCase().includes(searchAct.toLowerCase());
        return matchGroup && matchSearch;
    });

    const startEdit = (a) => {
        const ov = overrides[a.id] || {};
        setEditNote(ov.note || '');
        setEditing(a.id);
    };

    const saveEdit = async (activityId) => {
        const newOv = {};
        if (editNote.trim()) newOv.note = editNote.trim();
        try {
            if (Object.keys(newOv).length > 0) { await savePointOverride(activityId, newOv); }
            else { await deletePointOverride(activityId); }
        } catch (err) { alert(err.message); return; }
        getPointOverrides().then(setOverrides);
        setEditing(null);
    };

    const clearOv = async (id) => {
        try { await deletePointOverride(id); } catch (err) { alert(err.message); return; }
        getPointOverrides().then(setOverrides);
    };

    return (
        <>
            <div className="alert" style={{ background: 'rgba(45,91,227,0.06)', border: '1px solid rgba(45,91,227,0.15)', marginBottom: 20 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--accent)' }}>info</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    This catalog is mapped to the 2024 handbook. Totals are estimates until faculty verify eligibility and evidence. Admin notes never change calculated points.
                </span>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {[0, 1, 2, 3].map(g => (
                    <button key={g} className={`btn btn-sm ${groupFilter === g ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setGroupFilter(g)}>
                        {g === 0 ? 'All Groups' : `Group ${g}`}
                    </button>
                ))}
                <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
                    <span className="search-box-icon"><span className="material-symbols-outlined">search</span></span>
                    <input className="input" placeholder="Search activities…"
                        value={searchAct} onChange={e => setSearchAct(e.target.value)} />
                </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                {filtered.length} activities · {Object.keys(overrides).length} with custom notes
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(a => {
                    const ov = overrides[a.id];
                    const isEditing = editing === a.id;
                    return (
                        <div key={a.id} style={{ padding: '14px 16px', borderRadius: 'var(--radius)', border: `1px solid ${ov ? 'rgba(45,91,227,0.25)' : 'var(--border)'}`, background: ov ? 'rgba(45,91,227,0.04)' : 'var(--surface)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                                        Group {a.group} · {a.category} ·
                                        <span style={{ color: 'var(--accent)', fontWeight: 700, marginLeft: 4 }}>
                                            Max {a.maxPoints} pts
                                        </span>
                                    </div>
                                    {ov?.note && !isEditing && (
                                        <div style={{ fontSize: 12, color: '#06b6d4', marginTop: 5, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit_note</span>
                                            {ov.note}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {ov && !isEditing && (
                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--danger)' }} onClick={() => clearOv(a.id)}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                                        </button>
                                    )}
                                    {!isEditing && (
                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => startEdit(a)}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                                            Edit
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isEditing && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Admin Note</label>
                                        <input className="input" placeholder="Add an internal clarification note"
                                            value={editNote} onChange={e => setEditNote(e.target.value)} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setEditing(null)}>Cancel</button>
                                        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => saveEdit(a.id)}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>save</span>
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════
   PROFILE TAB
════════════════════════════════════════════════════ */
function ProfileTab({ user, onLogout, onUpdateUser }) {
    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';
    const [uploading, setUploading] = useState(false);
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

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', gap: 20 }}>
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
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{user?.name}</h2>
                            <span className="badge badge-info" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}>Admin</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>System Administrator · KTU APMS</p>
                    </div>
                </div>
                <div style={{ padding: 24 }}>
                    <div className="profile-info-grid">
                        {[
                            ['Username', user?.username ? `@${user.username}` : 'N/A'],
                            ['Role', 'System Administrator'],
                            ['Email', user?.email || 'N/A'],
                            ['Access Level', 'Full Access'],
                        ].map(([label, val]) => (
                            <div className="profile-info-item" key={label}>
                                <label>{label}</label>
                                <p>{val}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="settings-item" onClick={onLogout} style={{ borderColor: 'color-mix(in srgb, var(--danger) 25%, transparent)', cursor: 'pointer' }}>
                <div className="settings-icon" style={{ background: 'var(--danger-bg)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--danger)', fontSize: 20 }}>logout</span>
                </div>
                <div className="settings-info">
                    <h4 style={{ color: 'var(--danger)' }}>Sign Out</h4>
                    <p>Sign out of admin account</p>
                </div>
            </div>
        </div>
    );
}
