import { createRouter } from '../lib/router.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../db/supabase.js';

const router = createRouter();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { password, role } = req.body;
  const username = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  if (!username || typeof password !== 'string' || !password || !['student', 'faculty', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'username, password, and role are required' });
  }

  // Try matching by username first, then by roll_no
  // (Using separate queries avoids issues with PostgREST .or() filter syntax
  //  when usernames contain dots, commas, or other special characters)
  let user = null;
  {
    const { data, error: err1 } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .eq('username', username)
      .limit(1);
    if (err1) return res.status(500).json({ error: err1.message });
    if (data && data.length > 0) {
      user = data[0];
    } else {
      // Fallback: try matching by roll number
      const { data: data2, error: err2 } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .eq('roll_no', username.toUpperCase())
        .limit(1);
      if (err2) return res.status(500).json({ error: err2.message });
      if (data2 && data2.length > 0) {
        user = data2[0];
      }
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  if (user.account_status && user.account_status !== 'approved') {
    const message = user.account_status === 'pending'
      ? 'Your account is waiting for administrator approval.'
      : 'This account is not currently approved for access. Contact an administrator.';
    return res.status(403).json({ error: message, accountStatus: user.account_status });
  }

  const safeUser = {
    id:            user.id,
    sessionVersion: user.session_version,
    role:          user.role,
    isSuperAdmin:  user.is_super_admin,
    accountStatus: user.account_status || 'approved',
    username:      user.username,
    name:          user.name,
    email:         user.email,
    rollNo:        user.roll_no,
    department:    user.department,
    class:         user.class,
    year:          user.year,
    semester:      user.semester,
    studentType:   user.student_type,
    designation:   user.designation,
    profileUrl:    user.profile_url,
  };

  const { profileUrl, ...jwtPayload } = safeUser;
  const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: safeUser });
});

router.post('/signup', async (req, res) => {
  const { role, username, password, name, email, rollNo, department, studentType, designation, year, profileUrl } = req.body;

  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'username, password, name, and role are required' });
  }
  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be self-registered. Contact the system administrator.' });
  }
  if (!['student', 'faculty'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be student or faculty.' });
  }
  if (!department) {
    return res.status(400).json({ error: 'A department is required for student and faculty accounts.' });
  }
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'Password must have at least 12 characters and at most 72 UTF-8 bytes.' });
  }

  if (typeof username !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(username.trim())) return res.status(400).json({ error: 'Use 3–64 letters, numbers, dots, underscores, or hyphens for your username.' });
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 150) return res.status(400).json({ error: 'Enter your full name (up to 150 characters).' });
  const password_hash = await bcrypt.hash(password, 12);

  const { data: departmentRow, error: departmentError } = await supabase.from('departments')
    .select('id, name').eq('name', department).maybeSingle();
  if (departmentError) return res.status(500).json({ error: departmentError.message });
  if (!departmentRow) return res.status(400).json({ error: 'Choose a valid department.' });

  const insertData = {
    role, account_status: 'pending', username, password_hash, name, email: email || null,
    profile_url:  profileUrl || null,
    roll_no:      role === 'student' ? (rollNo || null) : null,
    department:   department || null,
    department_id: departmentRow.id,
    year:         role === 'student' ? (year ? parseInt(year) : null) : null,
    student_type: role === 'student' ? (studentType || 'regular') : null,
    designation:  role === 'faculty' ? (designation || null) : null,
  };

  const { data, error } = await supabase
    .from('users')
    .insert(insertData)
    .select('id, role, account_status, username, name, email, roll_no, department, student_type, designation')
    .single();

  if (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });
    }
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ success: true, user: data });
});

// POST /api/auth/logout  (stateless — client just discards the token)
router.post('/logout', (_req, res) => {
  res.json({ success: true });
});

export default router;
