import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../utils/auth';
import {
    getUsers, getCertificates, addUser, deleteUser, updateUser,
    getDepartmentsWithIds, addDepartment, removeDepartment,
    getCirculars, addCircular, deleteCircular,
    getPointOverrides, savePointOverride, deletePointOverride,
    promoteToAdmin,
} from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';
import { ACTIVITIES, calculateStudentSummary } from '../utils/points';

const NAV_ITEMS = [
    { key: 'dashboard',    icon: 'dashboard',          label: 'Dashboard'     },
    { key: 'users',        icon: 'manage_accounts',    label: 'Manage Users'  },
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
    const [certs, setCerts] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        if (!user) { navigate('/'); return; }
        refresh();
    }, []);

    const refresh = async () => {
        try {
            const [usersData, certsData] = await Promise.all([getUsers(), getCertificates()]);
            setUsers(usersData); setCerts(certsData);
        } catch (err) { console.error('Failed to load:', err); }
    };
    const handleLogout = () => { logout(); navigate('/'); };
    const toggleDark = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
    };

    const students = users.filter(u => u.role === 'student');
    const faculty  = users.filter(u => u.role === 'faculty');
    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';

    const PAGE_TITLES = {
        dashboard:   'Dashboard',
        users:       'Manage Users',
        departments: 'Departments',
        circulars:   'Circulars & Announcements',
        points:      'Activity Point Grading',
        profile:     'Profile',
    };

    return (
        <div className="portal-layout">
            {/* Sidebar overlay (mobile) */}
            <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">
                        <span className="material-symbols-outlined">admin_panel_settings</span>
                    </div>
                    <div className="sidebar-brand-text">
                        <h1>KTU APMS</h1>
                        <p>Admin Panel</p>
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
                        <button className="topbar-menu-btn" onClick={() => setSidebarOpen(o => !o)}>
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

                <div className="page-content">
                    {tab === 'dashboard'   && <DashboardTab students={students} faculty={faculty} certs={certs} onNavigate={setTab} />}
                    {tab === 'users'       && <UsersTab students={students} faculty={faculty} certs={certs} onRefresh={refresh} currentUser={user} />}
                    {tab === 'departments' && <DepartmentsTab />}
                    {tab === 'circulars'   && <CircularsTab />}
                    {tab === 'points'      && <PointGradingTab />}
                    {tab === 'profile'     && <ProfileTab user={user} onLogout={handleLogout} onUpdateUser={setUser} />}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   DASHBOARD TAB
════════════════════════════════════════════════════ */
function DashboardTab({ students, faculty, certs, onNavigate }) {
    const totalApproved = certs.filter(c => c.status === 'approved').length;
    const totalPending  = certs.filter(c => c.status === 'pending').length;
    const eligible      = students.filter(s => {
        const sc = certs.filter(c => (c.student_id || c.studentId) === s.id);
        return calculateStudentSummary(sc, s.student_type || s.studentType || 'regular').eligible;
    }).length;

    const stats = [
        { icon: 'school',        label: 'Total Students', val: students.length,  color: 'var(--accent)',   bg: 'rgba(45,91,227,0.1)',  tab: 'users'       },
        { icon: 'supervisor_account', label: 'Faculty Advisors', val: faculty.length,   color: '#06b6d4',        bg: 'rgba(6,182,212,0.1)',  tab: 'users'       },
        { icon: 'description',   label: 'Total Certs',   val: certs.length,     color: '#7c3aed',         bg: 'rgba(124,58,237,0.1)', tab: null          },
        { icon: 'verified',      label: 'Approved',      val: totalApproved,    color: 'var(--success)',  bg: 'rgba(16,185,129,0.1)', tab: null          },
        { icon: 'schedule',      label: 'Pending',       val: totalPending,     color: 'var(--warning)',  bg: 'rgba(245,158,11,0.1)', tab: null          },
        { icon: 'military_tech', label: 'Eligible',      val: eligible,         color: '#f59e0b',         bg: 'rgba(245,158,11,0.1)', tab: null          },
    ];

    const recentCerts = [...certs]
        .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
        .slice(0, 8);

    return (
        <>
            {/* KPI Stats */}
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 24 }}>
                {stats.map(s => (
                    <div
                        key={s.label}
                        className="stat-card"
                        style={s.tab ? { cursor: 'pointer' } : {}}
                        onClick={s.tab ? () => onNavigate(s.tab) : undefined}
                    >
                        <div className="stat-card-top">
                            <span className="stat-card-label">{s.label}</span>
                            <span className="stat-card-icon">
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="material-symbols-outlined" style={{ color: s.color, fontSize: 18 }}>{s.icon}</span>
                                </div>
                            </span>
                        </div>
                        <div className="stat-card-val" style={{ color: s.color }}>{s.val}</div>
                        <div className="stat-card-sub">{s.tab ? 'Click to manage →' : 'Total in system'}</div>
                    </div>
                ))}
            </div>

            {/* Recent Activity Table */}
            <div className="table-card">
                <div className="table-card-header">
                    <h3>Recent Certificate Activity</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Latest 8 submissions</span>
                </div>
                {recentCerts.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined">description</span>
                        <p>No certificate activity yet</p>
                    </div>
                ) : (
                    <div className="table-overflow">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Activity</th>
                                    <th>Level</th>
                                    <th>Submitted</th>
                                    <th className="td-center">Points</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentCerts.map(c => {
                                    const act = ACTIVITIES[c.activity_id || c.activityId];
                                    return (
                                        <tr key={c.id}>
                                            <td className="td-bold">{act?.name || c.activityName || c.activity_id || c.activityId}</td>
                                            <td className="td-muted">{c.level_selected || c.selectedLevel || 'N/A'}</td>
                                            <td className="td-muted">{new Date(c.created_at || c.createdAt).toLocaleDateString('en-IN')}</td>
                                            <td className="td-center td-bold" style={{ color: 'var(--accent)' }}>{c.points_awarded ?? c.pointsAwarded}</td>
                                            <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════
   MANAGE USERS TAB
════════════════════════════════════════════════════ */
function UsersTab({ students, faculty, certs, onRefresh, currentUser }) {
    const [userType, setUserType] = useState('student');
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '', username: '', password: '', email: '',
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
        if (!newUser.name || !newUser.username || !newUser.password) return;
        try { await addUser({ ...newUser }); } catch (err) { alert(err.message); return; }
        setShowAdd(false);
        setNewUser({ name: '', username: '', password: '', email: '', department: '', role: newUser.role, studentType: 'regular', rollNo: '', designation: '' });
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[
                    { key: 'student', label: `Students (${students.length})`, icon: 'school' },
                    { key: 'faculty', label: `Faculty (${faculty.length})`, icon: 'supervisor_account' },
                ].map(t => (
                    <button key={t.key} className={`btn ${userType === t.key ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => { setUserType(t.key); setSearch(''); setShowAdd(false); }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Search + Add Row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div className="search-box" style={{ flex: 1 }}>
                    <span className="search-box-icon"><span className="material-symbols-outlined">search</span></span>
                    <input className="input" placeholder={`Search ${userType}s…`}
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showAdd ? 'close' : 'person_add'}</span>
                    {showAdd ? 'Cancel' : `Create User`}
                </button>
            </div>

            {/* Add Form */}
            {showAdd && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: 20 }}>person_add</span>
                            <h3>Add New User</h3>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className="input" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input className="input" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select className="input" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                                    <option value="student">Student</option>
                                    <option value="faculty">Faculty Advisor</option>
                                    {currentUser?.isSuperAdmin && <option value="admin">Admin</option>}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="input" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <select className="input" value={newUser.department} onChange={e => setNewUser(p => ({ ...p, department: e.target.value }))}>
                                    <option value="">— Select Department —</option>
                                    {departments.map(d => <option key={d.id || d.name || d} value={d.name || d}>{d.name || d}</option>)}
                                </select>
                            </div>
                            {newUser.role === 'student' && (
                                <div className="form-group">
                                    <label className="form-label">Roll Number</label>
                                    <input className="input" value={newUser.rollNo} onChange={e => setNewUser(p => ({ ...p, rollNo: e.target.value }))} />
                                </div>
                            )}
                            {newUser.role === 'faculty' && (
                                <div className="form-group">
                                    <label className="form-label">Designation</label>
                                    <input className="input" value={newUser.designation} onChange={e => setNewUser(p => ({ ...p, designation: e.target.value }))} />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input className="input" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                            </div>
                        </div>
                        {newUser.role === 'student' && (
                            <div className="form-group">
                                <label className="form-label">Student Type</label>
                                <select className="input" value={newUser.studentType} onChange={e => setNewUser(p => ({ ...p, studentType: e.target.value }))}>
                                    <option value="regular">Regular (120 pts)</option>
                                    <option value="lateral">Lateral Entry (90 pts)</option>
                                    <option value="pwd">PwD (60 pts)</option>
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAdd}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                                Create Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User List */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <span className="material-symbols-outlined">{userType === 'student' ? 'school' : 'supervisor_account'}</span>
                    <p>No {userType}s found</p>
                </div>
            ) : (
                <div className="table-card">
                    <div className="table-card-header">
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} {userType}{filtered.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="table-overflow">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>{userType === 'student' ? 'Roll No' : 'Designation'}</th>
                                    <th>Department</th>
                                    <th>Username</th>
                                    {userType === 'student' && <th className="td-center">Points</th>}
                                    {userType === 'student' && <th>Status</th>}
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => {
                                    const userCerts = certs.filter(c => (c.student_id || c.studentId) === u.id);
                                    const summary = userType === 'student' ? calculateStudentSummary(userCerts, u.student_type || u.studentType || 'regular') : null;
                                    const initials = u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
                                    return (
                                        <tr key={u.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                                                        {u.profile_url || u.profileUrl ? (
                                                            <img src={u.profile_url || u.profileUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : initials}
                                                    </div>
                                                    <div>
                                                        <div className="td-bold">{u.name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="td-muted">{u.roll_no || u.rollNo || u.designation || '—'}</td>
                                            <td className="td-muted">{u.department || '—'}</td>
                                            <td className="td-muted">@{u.username}</td>
                                            {userType === 'student' && <td className="td-center td-bold" style={{ color: 'var(--accent)' }}>{summary?.total}</td>}
                                            {userType === 'student' && (
                                                <td>
                                                    {summary?.eligible
                                                        ? <span className="badge badge-approved">Eligible</span>
                                                        : <span className="badge badge-pending">In Progress</span>
                                                    }
                                                </td>
                                            )}
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {currentUser?.isSuperAdmin && (
                                                        <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => handlePromote(u.id)} title="Promote to Admin">
                                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>shield</span>
                                                        </button>
                                                    )}
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}

/* ═══════════════════════════════════════════════════
   DEPARTMENTS TAB
════════════════════════════════════════════════════ */
function DepartmentsTab() {
    const [depts, setDepts] = useState([]);
    const [newDept, setNewDept] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => { getDepartmentsWithIds().then(setDepts).catch(console.error); }, []);

    const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

    const handleAdd = async () => {
        const trimmed = newDept.trim();
        const names = depts.map(d => d.name);
        if (!trimmed || names.includes(trimmed)) return;
        try { await addDepartment(trimmed); } catch (err) { alert(err.message); return; }
        getDepartmentsWithIds().then(setDepts);
        setNewDept('');
        flash();
    };

    const handleRemove = async (dept) => {
        if (!window.confirm(`Remove "${dept.name}"? This won't delete existing students in this dept.`)) return;
        try { await removeDepartment(dept.id); } catch (err) { alert(err.message); return; }
        getDepartmentsWithIds().then(setDepts);
        flash();
    };

    return (
        <>
            {saved && (
                <div className="alert alert-success" style={{ marginBottom: 16 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    Departments updated successfully
                </div>
            )}

            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: 20 }}>add_circle</span>
                        <h3>Add New Department</h3>
                    </div>
                </div>
                <div className="card-body">
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input className="input" style={{ flex: 1 }}
                            placeholder="e.g. Biotechnology Engineering"
                            value={newDept}
                            onChange={e => setNewDept(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        />
                        <button className="btn btn-primary" onClick={handleAdd}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                            Add
                        </button>
                    </div>
                </div>
            </div>

            <div className="table-card">
                <div className="table-card-header">
                    <h3>Active Departments</h3>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{depts.length} total</span>
                </div>
                <div className="table-overflow">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Department Name</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {depts.map((dept, i) => (
                                <tr key={dept.id || dept}>
                                    <td className="td-muted" style={{ width: 40 }}>{i + 1}</td>
                                    <td className="td-bold">{dept.name || dept}</td>
                                    <td>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleRemove(dept)}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

/* ═══════════════════════════════════════════════════
   CIRCULARS TAB
════════════════════════════════════════════════════ */
function CircularsTab() {
    const [circulars, setCirculars] = useState([]);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [priority, setPri] = useState('normal');
    const [showForm, setShowForm] = useState(false);

    useEffect(() => { getCirculars().then(setCirculars).catch(console.error); }, []);

    const PRIORITY_COLORS = {
        normal: { bg: 'rgba(45,91,227,0.08)', text: 'var(--accent)',   border: 'rgba(45,91,227,0.2)',   label: 'Normal' },
        urgent: { bg: 'rgba(239,68,68,0.08)', text: 'var(--danger)',   border: 'rgba(239,68,68,0.2)',   label: 'Urgent' },
        info:   { bg: 'rgba(6,182,212,0.08)', text: '#06b6d4',         border: 'rgba(6,182,212,0.2)',   label: 'Info'   },
    };

    const handlePost = async () => {
        if (!title.trim() || !body.trim()) return;
        try { await addCircular({ title: title.trim(), content: body.trim() }); } catch (err) { alert(err.message); return; }
        getCirculars().then(setCirculars);
        setTitle(''); setBody(''); setPri('normal'); setShowForm(false);
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
                                            {new Date(circ.created_at || circ.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <button className="btn btn-danger btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}
                                        onClick={() => handleDelete(circ.id)}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                                    </button>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>{circ.title}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{circ.content || circ.body}</div>
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
    const [editMax, setEditMax] = useState('');

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
        setEditMax(ov.maxPoints !== undefined ? String(ov.maxPoints) : '');
        setEditing(a.id);
    };

    const saveEdit = async (activityId) => {
        const newOv = {};
        if (editNote.trim()) newOv.note = editNote.trim();
        if (editMax !== '' && !isNaN(editMax)) newOv.maxPoints = parseInt(editMax);
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
                    Base values come from the official KTU 2024 handbook. You can add admin notes or adjust max point caps per activity.
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
                                            Max {ov?.maxPoints !== undefined ? ov.maxPoints : a.maxPoints} pts
                                        </span>
                                        {ov?.maxPoints !== undefined && (
                                            <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>(base: {a.maxPoints})</span>
                                        )}
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
                                    <div className="form-row">
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Override Max Points</label>
                                            <input className="input" type="number" placeholder={`Default: ${a.maxPoints}`}
                                                value={editMax} onChange={e => setEditMax(e.target.value)} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Admin Note</label>
                                            <input className="input" placeholder="e.g. Only applicable from S3 onwards"
                                                value={editNote} onChange={e => setEditNote(e.target.value)} />
                                        </div>
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
