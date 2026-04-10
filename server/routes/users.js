import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../db/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
router.use(authMiddleware);

// GET /api/users — admin gets all, faculty gets their dept students, student not allowed
router.get('/', async (req, res) => {
  let query = supabase.from('users').select('id, role, username, name, email, roll_no, department, class, year, semester, student_type, designation, profile_url, created_at');

  if (req.user.role === 'student') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.user.role === 'faculty') {
    query = query.eq('role', 'student').eq('department', req.user.department);
  }

  const { data, error } = await query.order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/users/:id — get own profile or admin
router.get('/:id', async (req, res) => {
  if (req.user.role === 'student' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { data, error } = await supabase
    .from('users')
    .select('id, role, username, name, email, roll_no, department, class, year, semester, student_type, designation, profile_url')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

// POST /api/users — admin only
router.post('/', requireRole('admin'), async (req, res) => {
  const { role, username, password, name, email, rollNo, department, class: cls, year, semester, studentType, designation } = req.body;
  if (!username || !password || !role || !name) {
    return res.status(400).json({ error: 'username, password, role, name are required' });
  }
  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase.from('users').insert({
    role, username, password_hash, name, email,
    roll_no: rollNo, department, class: cls, year, semester,
    student_type: studentType, designation,
  }).select('id, role, username, name, email, roll_no, department, class, year, semester, student_type, designation, profile_url').single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/users/:id — admin or self
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { password, profileUrl, ...rest } = req.body;
  const update = {};

  if (profileUrl !== undefined) {
    update.profile_url = profileUrl;
  }

  if (req.user.role === 'admin') {
    // Admin can update everything
    if (rest.role) update.role = rest.role;
    if (rest.username) update.username = rest.username;
    if (rest.name) update.name = rest.name;
    if (rest.email) update.email = rest.email;
    if (rest.rollNo !== undefined) update.roll_no = rest.rollNo;
    if (rest.department !== undefined) update.department = rest.department;
    if (rest.class !== undefined) update.class = rest.class;
    if (rest.year !== undefined) update.year = rest.year;
    if (rest.semester !== undefined) update.semester = rest.semester;
    if (rest.studentType !== undefined) update.student_type = rest.studentType;
    if (rest.designation !== undefined) update.designation = rest.designation;
  } else {
    // Self update, only safe fields (username is NOT editable)
    if (rest.name) update.name = rest.name;
    if (rest.email !== undefined) update.email = rest.email;
    if (req.user.role === 'student') {
      if (rest.rollNo !== undefined) update.roll_no = rest.rollNo;
      if (rest.department !== undefined) update.department = rest.department;
      if (rest.year !== undefined) update.year = rest.year;
    }
    if (req.user.role === 'faculty') {
      if (rest.designation !== undefined) update.designation = rest.designation;
      if (rest.department !== undefined) update.department = rest.department;
    }
  }

  if (password) update.password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase.from('users').update(update)
    .eq('id', req.params.id)
    .select('id, role, username, name, email, roll_no, department, class, year, semester, student_type, designation, profile_url').single();
  
  if (error) return res.status(400).json({ error: error.message });

  const mappedUser = {
    id:            data.id,
    role:          data.role,
    username:      data.username,
    name:          data.name,
    email:         data.email,
    rollNo:        data.roll_no,
    department:    data.department,
    class:         data.class,
    year:          data.year,
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

// DELETE /api/users/:id — admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { error } = await supabase.from('users').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
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
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', req.params.id)
    .select('id, role, username, name')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
