import { createRouter } from '../lib/router.js';
import bcrypt from 'bcryptjs';
import supabase from '../db/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { inferKtuBatchYear } from '../lib/validation.js';

const router = createRouter();
router.use(authMiddleware);
const validEmail = value => typeof value === 'string' && value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const validPhone = value => typeof value === 'string' && /^\+?[0-9][0-9\s().-]{7,19}$/.test(value.trim());

// GET /api/users — admin gets all, faculty gets their dept students, student not allowed
router.get('/', async (req, res) => {
  let query = supabase.from('users').select('id, role, is_super_admin, account_status, username, name, email, phone, roll_no, department, department_id, class, year, semester, batch_year, evaluation_batches, student_type, designation, profile_url, created_at, approved_at');

  if (req.user.role === 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.user.role === 'faculty') {
    if (!req.user.evaluationBatches?.length) return res.json([]);
    query = query.eq('role', 'student').eq('department_id', req.user.departmentId).eq('account_status', 'approved')
      .in('batch_year', req.user.evaluationBatches);
  }

  const { data, error } = await query.order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/users/approval-requests — each role sees only its own approval queue.
router.get('/approval-requests', requireRole('admin', 'faculty'), async (req, res) => {
  const targetRole = req.user.role === 'admin' ? 'faculty' : 'student';
  let query = supabase.from('users')
    .select('id, role, account_status, username, name, email, phone, roll_no, department, department_id, designation, year, batch_year, evaluation_batches, created_at')
    .eq('role', targetRole).eq('account_status', 'pending');
  if (req.user.role === 'faculty') {
    if (!req.user.evaluationBatches?.length) return res.json([]);
    query = query.eq('department_id', req.user.departmentId).in('batch_year', req.user.evaluationBatches);
  }
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
      .select('role, department_id, account_status, batch_year').eq('id', req.params.id).maybeSingle();
    if (targetError) return res.status(500).json({ error: targetError.message });
    if (!target || target.role !== 'student' || target.account_status !== 'approved' || target.department_id !== req.user.departmentId || !req.user.evaluationBatches?.includes(target.batch_year)) {
      return res.status(403).json({ error: 'Faculty can only view profiles of students in their assigned batches.' });
    }
  }
  const { data, error } = await supabase
    .from('users')
    .select('id, role, username, name, email, phone, roll_no, department, class, year, semester, batch_year, evaluation_batches, student_type, designation, profile_url')
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
  const suppliedBatchYear = req.body.batchYear === undefined || req.body.batchYear === '' ? null : Number(req.body.batchYear);
  const batchYear = role === 'student' ? (suppliedBatchYear || inferKtuBatchYear(String(rollNo || ''))) : null;
  if (role === 'student' && batchYear !== null && (!Number.isInteger(batchYear) || batchYear < 2000 || batchYear > 2100)) return res.status(400).json({ error: 'Choose a valid admission batch year.' });
  if (role === 'student' && batchYear === null) return res.status(400).json({ error: 'Enter a valid KTU registration number with an identifiable admission year, or set the batch year.' });
  const { data, error } = await supabase.from('users').insert({
    role, account_status: 'approved', username, password_hash, name, email: email?.trim().toLowerCase() || null, phone: phone?.trim() || null,
    approved_by: req.user.id, last_modified_by: req.user.id,
    roll_no: rollNo, department, department_id: departmentId, class: cls, year, semester, batch_year: batchYear,\n    evaluation_batches: role === 'faculty' && Array.isArray(req.body.evaluationBatches) ? req.body.evaluationBatches : [],
    student_type: role === 'student' ? (studentType || 'regular') : null, designation,
  }).select('id, role, account_status, username, name, email, phone, roll_no, department, class, year, semester, batch_year, evaluation_batches, student_type, designation, profile_url').single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/users/:id — admin or self
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { password, profileUrl, ...rest } = req.body;
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
    if (rest.batchYear !== undefined && req.user.isSuperAdmin) {
      const value = rest.batchYear === null || rest.batchYear === '' ? null : Number(rest.batchYear);
      if (value !== null && (!Number.isInteger(value) || value < 2000 || value > 2100)) return res.status(400).json({ error: 'Choose a valid admission batch year.' });
      update.batch_year = value;
    }
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
        const batchYear = inferKtuBatchYear(rollNo);
        if (batchYear === null) return res.status(400).json({ error: 'The admission batch cannot be identified from that KTU registration number.' });
        update.roll_no = rollNo;
        update.username = rollNo;
        update.batch_year = batchYear;
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
    .select('id, role, username, name, email, phone, roll_no, department, class, year, semester, batch_year, evaluation_batches, student_type, designation, profile_url, session_version').single();

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
    batchYear:     data.batch_year,
    evaluationBatches: data.evaluation_batches || [],
    semester:      data.semester,
    studentType:   data.student_type,
    designation:   data.designation,
    profileUrl:    data.profile_url,
  };

  if (req.user.id === req.params.id) {
    mappedUser.isSuperAdmin = req.user.isSuperAdmin;
    const { profileUrl, ...jwtPayload } = mappedUser;
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ user: mappedUser, token });
  }

  res.json({ user: mappedUser });
});

// Faculty may choose an initial assignment once; changes are admin-managed.
router.patch('/:id/evaluation-batches', requireRole('faculty'), async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'You can only set your own initial batch assignment.' });
  const batches = req.body.evaluationBatches;
  if (!Array.isArray(batches) || batches.length < 1 || batches.length > 8
    || batches.some(batch => !Number.isInteger(batch) || batch < 2000 || batch > 2100)
    || new Set(batches).size !== batches.length) return res.status(400).json({ error: 'Choose one or more valid student batches.' });
  if (req.user.evaluationBatches?.length) return res.status(409).json({ error: 'Your batch assignment is already set. Contact an administrator to change it.' });
  const { data, error } = await supabase.from('users').update({ evaluation_batches: batches, last_modified_by: req.user.id })
    .eq('id', req.user.id).eq('role', 'faculty').eq('account_status', 'approved').select('id, evaluation_batches').maybeSingle();
  if (error) {
    if (error.code === '23505' || error.message?.includes('already assigned')) return res.status(409).json({ error: 'That batch is already assigned to another faculty advisor. Choose a different batch.' });
    return res.status(400).json({ error: error.message });
  }
  if (!data) return res.status(409).json({ error: 'Your account changed. Refresh and try again.' });
  res.json({ success: true, evaluationBatches: data.evaluation_batches || [] });
});

// DELETE /api/users/:id — permanent removal by super admin or department faculty.
router.delete('/:id', requireRole('admin', 'faculty'), async (req, res) => {
  if (req.user.id === req.params.id) return res.status(400).json({ error: 'You cannot remove your own account.' });
  const { data: target, error: targetError } = await supabase.from('users').select('id, role, username, roll_no, is_super_admin, department_id, batch_year').eq('id', req.params.id).maybeSingle();
  if (targetError) return res.status(500).json({ error: targetError.message });
  if (!target || target.is_super_admin) return res.status(403).json({ error: 'This account cannot be removed.' });
  const isOwnDepartmentStudent = req.user.role === 'faculty'
    && target.role === 'student'
    && target.department_id === req.user.departmentId\n    && req.user.evaluationBatches?.includes(target.batch_year);
  if (!req.user.isSuperAdmin && !isOwnDepartmentStudent) {
    return res.status(403).json({ error: 'Faculty can permanently remove only students in their own department. Other accounts require the super admin.' });
  }

  let certificatePaths = [];
  if (target.role === 'student') {
    const { data, error } = await supabase.from('certificates').select('file_url').eq('student_id', target.id);
    if (error) return res.status(500).json({ error: 'Could not prepare the student records for removal.' });
    certificatePaths = (data || []).map(row => row.file_url).filter(Boolean);
  }

  const { error: removeError } = await supabase.rpc('apms_remove_user', {
    p_user_id: target.id,
    p_actor_id: req.user.id,
  });
  if (removeError) {
    if (removeError.message?.includes('function') || removeError.code === 'PGRST202') {
      return res.status(503).json({ error: 'Permanent removal is not enabled in the database yet. Apply migration 005, then retry.' });
    }
    return res.status(400).json({ error: removeError.message || 'Account removal failed.' });
  }

  // Do not report a successful removal until the database confirms that the
  // account, registration number, and cascading student records are gone.
  const verificationQueries = [
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('id', target.id),
    supabase.from('account_review_events').select('id', { count: 'exact', head: true }).or(`user_id.eq.${target.id},actor_id.eq.${target.id}`),
    supabase.from('password_reset_tokens').select('id', { count: 'exact', head: true }).eq('user_id', target.id),
  ];
  if (target.role === 'student') {
    if (target.roll_no) verificationQueries.push(supabase.from('users').select('id', { count: 'exact', head: true }).eq('roll_no', target.roll_no));
    verificationQueries.push(supabase.from('certificates').select('id', { count: 'exact', head: true }).eq('student_id', target.id));
  }
  const verification = await Promise.all(verificationQueries);
  if (verification.some(result => result.error)) {
    console.error('Account removal completed, but post-delete verification failed.');
    return res.status(500).json({ error: 'The account was removed, but APMS could not verify that all linked records were cleared. Contact the administrator before retrying signup.' });
  }
  if (verification.some(result => (result.count || 0) > 0)) {
    return res.status(500).json({ error: 'APMS could not confirm that the account and its linked records were fully removed. Contact the administrator before retrying signup.' });
  }

  let storageCleanupPending = false;
  for (let offset = 0; offset < certificatePaths.length; offset += 100) {
    const { error } = await supabase.storage.from('apms-certificates').remove(certificatePaths.slice(offset, offset + 100));
    if (error) storageCleanupPending = true;
  }
  res.json({ success: true, storageCleanupPending });
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
.select('id, role, account_status, is_super_admin, batch_year').eq('id', req.params.id).maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  const requiredRole = req.user.role === 'admin' ? 'faculty' : 'student';
  if (!existing || existing.is_super_admin || existing.role !== requiredRole) {
    return res.status(404).json({ error: `Pending ${requiredRole} account not found.` });
  }
  if (existing.account_status !== 'pending') return res.status(409).json({ error: 'This account is no longer waiting for approval.' });
  if (req.user.role === 'faculty') {
    const { data: target, error: targetError } = await supabase.from('users').select('department_id, batch_year').eq('id', req.params.id).maybeSingle();
    if (targetError) return res.status(500).json({ error: targetError.message });
    if (!target || target.department_id !== req.user.departmentId || !req.user.evaluationBatches?.includes(target.batch_year)) return res.status(403).json({ error: 'Faculty can only approve students in their assigned batches.' });
  }
  const { data, error } = await supabase.from('users').update({
    account_status: status,
    approved_at: status === 'approved' ? new Date().toISOString() : null,
    approved_by: req.user.id, last_modified_by: req.user.id, review_note: String(note || '').trim() || null,
  }).eq('id', req.params.id).eq('account_status', existing.account_status)
    .select('id, role, account_status, username, name, email, phone, roll_no, department, batch_year, created_at, approved_at').maybeSingle();
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
