import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../db/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
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
        .eq('roll_no', username)
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

  const safeUser = {
    id:            user.id,
    role:          user.role,
    isSuperAdmin:  user.is_super_admin,
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
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const insertData = {
    role, username, password_hash, name, email: email || null,
    profile_url:  profileUrl || null,
    roll_no:      role === 'student' ? (rollNo || null) : null,
    department:   department || null,
    year:         role === 'student' ? (year ? parseInt(year) : null) : null,
    student_type: role === 'student' ? (studentType || 'regular') : null,
    designation:  role === 'faculty' ? (designation || null) : null,
  };

  const { data, error } = await supabase
    .from('users')
    .insert(insertData)
    .select('id, role, username, name, email, roll_no, department, student_type, designation')
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
