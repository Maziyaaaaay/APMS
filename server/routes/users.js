import { createRouter } from '../lib/router.js';
import bcrypt from 'bcryptjs';
import supabase from '../db/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = createRouter();
router.use(authMiddleware);
const validEmail = value => typeof value === 'string' && value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const validPhone = value => typeof value === 'string' && /^\+?[0-9][0-9\s().-]{7,19}$/.test(value.trim());

// GET /api/users — admin gets all, faculty gets their dept students, student not allowed
router.get('/', async (req, res) => {
  let query = supabase.from('users').select('id, role, is_super_admin, account_status, username, name, email, phone, roll_no, department, department_id, class, year, semester, student_type, designation, profile_url, created_at, approved_at');

  if (req.user.role === 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.user.role === 'faculty') {
    query = query.eq('role', 'student').eq('department_id', req.user.departmentId).eq('account_status', 'approved');
  }

  const { data, error } = await query.order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/users/approval-requests — each role sees only its own approval queue.
router.get('/approval-requests', requireRole('admin', 'faculty'), async (req, res) => {
  const targetRole = req.user.role === 'admin' ? 'faculty' : 'student';
  let query = supabase.from('users')
    .select('id, role, account_status, username, name, email, phone, roll_no, department, department_id, designation, year, created_at')
    .eq('role', targetRole).eq('account_status', 'pending');
  if (req.user.role === 'faculty') query = query.eq('department_id', req.user.departmentId);
  const { data, error } = await query.order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/users/:id — get own profile or admin
router.get('/:id', async (req, res) => {
  if (req.user.role === 'student' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.user.role === 'faculty' && req.user.id !== req.params.id) {
    const { data: target, error: targetError } = await supabase.from('users')
      .select('role, department_id, account_status').eq('id', req.params.id).maybeSingle();
    if (targetError) return res.status(500).json({ error: targetError.message });
    if (!target || target.role !== 'student' || target.account_status !== 'approved' || target.department_id !== req.user.departmentId) {
      return res.status(403).json({ error: 'Faculty can only view profiles of students in their department.' });
    }
  }
  const { data, error } = await supabase
    .from('users')
    .select('id, role, username, name, email, phone, roll_no, department, class, year, semester, student_type, designation, profile_url, profile_banner_url')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

// POST /api/users — admin only
router.post('/', requireRole('admin'), async (req, res) => {
  const { role, password, name, email, phone, rollNo, department, class: cls, year, semester, studentType, designation } = req.body;
  const username = role === 'student' ? String(rollNo || '').trim().toUpperCase() : String(req.body.username || '').trim().toLowerCase();
  if (!username || !password || !role || !name) {
    return res.status(400).json({ error: 'username, password, role, name are required' });
  }
  if (!['student', 'faculty', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  if (!validEmail(email) || !validPhone(phone)) return res.status(400).json({ error: 'A valid email address and phone number are required.' });
  if (role === 'admin' && !req.user.isSuperAdmin) return res.status(403).json({ error: 'Only the super admin can create admins.' });
  let departmentId = null;
  if (department) {
    const { data: departmentRow, error: departmentError } = await supabase.from('departments').select('id').eq('name', department).maybeSingle();
    if (departmentError) return res.status(500).json({ error: departmentError.message });
    if (!departmentRow) return res.status(400).json({ error: 'Choose a valid department.' });
    departmentId = departmentRow.id;
  }
  if (['student', 'faculty'].includes(role) && !departmentId) return res.status(400).json({ error: 'Department is required.' });
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Password must have at least 12 characters and at most 72 UTF-8 bytes.' });
  const password_hash = await bcrypt.hash(password, 12);
  const { data, error } = await supabase.from('users').insert({
    role, account_status: 'approved', username, password_hash, name, email: email?.trim().toLowerCase() || null, phone: phone?.trim() || null,
    approved_by: req.user.id, last_modified_by: req.user.id,
    roll_no: rollNo, department, department_id: departmentId, class: cls, year, semester,
    student_type: role === 'student' ? (studentType || 'regular') : null, designation,
  }).select('id, role, account_status, username, name, email, phone, roll_no, department, class, year, semester, student_type, designation, profile_url').single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/users/:id — admin or self
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { password, profileUrl, profileBannerUrl, ...rest } = req.body;
  const update = { last_modified_by: req.user.id };

  if (req.user.role === 'admin' && req.user.id !== req.params.id) {
    const { data: target, error: targetError } = await supabase.from('users')
      .select('is_super_admin, role').eq('id', req.params.id).maybeSingle();
    if (targetError) return res.status(500).json({ error: targetError.message });
    if (target?.is_super_admin) return res.status(403).json({ error: 'The super admin profile can only be changed by its owner.' });
    if (target?.role === 'admin' && !req.user.isSuperAdmin) return res.status(403).json({ error: 'Only the super admin can manage admin accounts.' });
    if (password) return res.status(403).json({ error: 'Administrators cannot set another user’s password through profile editing.' });
  }

  if (profileUrl !== undefined) {
    update.profile_url = profileUrl;
  }
  if (profileBannerUrl !== undefined) {
    if (profileBannerUrl === null) {
      update.profile_banner_url = null;
    } else {
      const banner = typeof profileBannerUrl === 'string' && profileBannerUrl.length <= 3000000
        ? /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(profileBannerUrl)
        : null;
      if (!banner) return res.status(400).json({ error: 'Choose a valid JPG or PNG banner image up to 10 MB.' });
      const bytes = Buffer.from(banner[2], 'base64');
      const isPng = banner[1] === 'png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isJpeg = banner[1] === 'jpeg' && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      if (!bytes.length || bytes.length > 2200000 || (!isPng && !isJpeg)) {
        return res.status(400).json({ error: 'The banner image is invalid or too large after compression.' });
      }
      update.profile_banner_url = profileBannerUrl;
    }
  }

  if (req.user.role === 'admin') {
    // Admin can update everything
    // Role changes use the dedicated super-admin endpoint with stronger checks.
    if (rest.username) update.username = rest.username;
    if (rest.name) update.name = rest.name;
    if (rest.email !== undefined) {
      if (rest.email && !validEmail(rest.email)) return res.status(400).json({ error: 'Enter a valid email address.' });
      update.email = rest.email?.trim().toLowerCase() || null;
    }
    if (rest.phone !== undefined) {
      if (rest.phone && !validPhone(rest.phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
      update.phone = rest.phone?.trim() || null;
    }
    if (rest.rollNo !== undefined) update.roll_no = rest.rollNo;
    if (rest.department !== undefined && req.user.isSuperAdmin) {
      const { data: departmentRow, error: departmentError } = await supabase.from('departments').select('id').eq('name', rest.department).maybeSingle();
      if (departmentError) return res.status(500).json({ error: departmentError.message });
      if (!departmentRow) return res.status(400).json({ error: 'Choose a valid department.' });
      update.department = rest.department;
      update.department_id = departmentRow.id;
    }
    if (rest.class !== undefined) update.class = rest.class;
    if (rest.year !== undefined) update.year = rest.year;
    if (rest.semester !== undefined) update.semester = rest.semester;
    if (rest.studentType !== undefined) update.student_type = rest.studentType;
    if (rest.designation !== undefined) update.designation = rest.designation;
  } else {
    // Self update, only safe fields (username is NOT editable)
    if (rest.name) update.name = rest.name;
    if (rest.email !== undefined) {
      if (rest.email && !validEmail(rest.email)) return res.status(400).json({ error: 'Enter a valid email address.' });
      update.email = rest.email?.trim().toLowerCase() || null;
    }
    if (rest.phone !== undefined) {
      if (rest.phone && !validPhone(rest.phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
      update.phone = rest.phone?.trim() || null;
    }
    if (req.user.role === 'student') {
      if (rest.rollNo !== undefined) {
        const rollNo = String(rest.rollNo || '').trim().toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9._-]{2,63}$/.test(rollNo)) return res.status(400).json({ error: 'Enter a valid KTU registration number.' });
        update.roll_no = rollNo;
        update.username = rollNo;
      }
      // Department membership is controlled by an administrator, never by the account holder.
      if (rest.year !== undefined) update.year = rest.year;
    }
    if (req.user.role === 'faculty') {
      if (rest.designation !== undefined) update.designation = rest.designation;
      // Department membership is assigned by an administrator.
    }
  }

  if (password) {
    if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Password must have at least 12 characters and at most 72 UTF-8 bytes.' });
    update.password_hash = await bcrypt.hash(password, 12);
  }

  const { data, error } = await supabase.from('users').update(update)
    .eq('id', req.params.id)
    .select('id, role, username, name, email, phone, roll_no, department, class, year, semester, student_type, designation, profile_url, profile_banner_url, session_version').single();

  if (error) return res.status(400).json({ error: error.message });

  const mappedUser = {
    id:            data.id,
    sessionVersion: data.session_version,
    role:          data.role,
    username:      data.username,
    name:          data.name,
    email:         data.email,
    phone:         data.phone,
    rollNo:        data.roll_no,
    department:    data.department,
    class:         data.class,
    year:          data.year,
    semester:      data.semester,
    studentType:   data.student_type,
    designation:   data.designation,
    profileUrl:    data.profile_url,
    profileBannerUrl: data.profile_banner_url,
  };

  if (req.user.id === req.params.id) {
    mappedUser.isSuperAdmin = req.user.isSuperAdmin;
    const { profileUrl, profileBannerUrl, ...jwtPayload } = mappedUser;
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ user: mappedUser, token });
  }

  res.json({ user: mappedUser });
});

// DELETE /api/users/:id — admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  if (req.user.id === req.params.id) return res.status(400).json({ error: 'You cannot disable your own account.' });
  const { data: target, error: targetError } = await supabase.from('users').select('role, is_super_admin, account_status').eq('id', req.params.id).maybeSingle();
  if (targetError) return res.status(500).json({ error: targetError.message });
  if (!target || target.is_super_admin) return res.status(403).json({ error: 'This account cannot be disabled here.' });
  if (target.role === 'admin' && !req.user.isSuperAdmin) return res.status(403).json({ error: 'Only the super admin can disable admins.' });
  const { data, error } = await supabase.from('users').update({
    account_status: 'disabled', approved_by: req.user.id, last_modified_by: req.user.id,
    review_note: 'Account disabled by administrator.',
  }).eq('id', req.params.id).eq('account_status', target.account_status).select('id').maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(409).json({ error: 'The account changed. Refresh and try again.' });
  res.json({ success: true });
});

// PATCH /api/users/:id/role — super admin only: promote a user to admin (or change role)
router.patch('/:id/role', requireRole('admin'), async (req, res) => {
  // Only super admins can grant admin role
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Only the super admin can change user roles.' });
  }
  const { role } = req.body;
  if (!['student', 'faculty', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  const { data: target, error: targetError } = await supabase.from('users').select('is_super_admin, role, account_status, department, student_type').eq('id', req.params.id).maybeSingle();
  if (targetError) return res.status(500).json({ error: targetError.message });
  if (target?.is_super_admin) return res.status(403).json({ error: 'The super admin account cannot be changed here.' });
  if (!target || !['student', 'faculty', 'admin'].includes(target.role)) return res.status(404).json({ error: 'User not found.' });
  if (target.account_status !== 'approved') return res.status(409).json({ error: 'Approve the account before changing its role.' });
  if (['student', 'faculty'].includes(role) && !target.department) {
    return res.status(400).json({ error: 'Assign a department before changing this account to a student or faculty role.' });
  }
  const { data, error } = await supabase
    .from('users')
    .update({ role, last_modified_by: req.user.id, review_note: 'Role changed by super admin.', student_type: role === 'student' ? (target.student_type || 'regular') : null })
    .eq('id', req.params.id)
    .select('id, role, username, name')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// PATCH /api/users/:id/approval — admins approve faculty; faculty approve their students.
router.patch('/:id/approval', requireRole('admin', 'faculty'), async (req, res) => {
  const { status, note } = req.body;
  if (!['approved', 'rejected', 'disabled'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved, rejected, or disabled.' });
  }
  const { data: existing, error: lookupError } = await supabase.from('users')
    .select('id, role, account_status, is_super_admin').eq('id', req.params.id).maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  const requiredRole = req.user.role === 'admin' ? 'faculty' : 'student';
  if (!existing || existing.is_super_admin || existing.role !== requiredRole) {
    return res.status(404).json({ error: `Pending ${requiredRole} account not found.` });
  }
  if (existing.account_status !== 'pending') return res.status(409).json({ error: 'This account is no longer waiting for approval.' });
  if (req.user.role === 'faculty') {
    const { data: target, error: targetError } = await supabase.from('users').select('department_id').eq('id', req.params.id).maybeSingle();
    if (targetError) return res.status(500).json({ error: targetError.message });
    if (!target || target.department_id !== req.user.departmentId) return res.status(403).json({ error: 'Faculty can only approve students in their own department.' });
  }
  const { data, error } = await supabase.from('users').update({
    account_status: status,
    approved_at: status === 'approved' ? new Date().toISOString() : null,
    approved_by: req.user.id, last_modified_by: req.user.id, review_note: String(note || '').trim() || null,
  }).eq('id', req.params.id).eq('account_status', existing.account_status)
    .select('id, role, account_status, username, name, email, phone, roll_no, department, created_at, approved_at').maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(409).json({ error: 'The account changed. Refresh and try again.' });
  res.json(data);
});

// Atomic owner handover; existing sessions of both accounts are revoked by the database.
router.post('/:id/transfer-ownership', requireRole('admin'), async (req, res) => {
  if (!req.user.isSuperAdmin) return res.status(403).json({ error: 'Only the super admin can transfer ownership.' });
  if (typeof req.body.password !== 'string') return res.status(400).json({ error: 'Enter your current password.' });
  const { data: owner, error: ownerError } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single();
  if (ownerError) return res.status(500).json({ error: 'Could not verify the current administrator.' });
  if (!await bcrypt.compare(req.body.password, owner.password_hash)) return res.status(401).json({ error: 'Your current password is incorrect.' });
  const { error } = await supabase.rpc('apms_transfer_super_admin', { p_actor_id: req.user.id, p_target_id: req.params.id });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
