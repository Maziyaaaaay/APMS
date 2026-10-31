import { createRouter } from '../lib/router.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../db/supabase.js';
import { EtlabError, normalizeRegistrationNumber, readEtlabSignupProof, verifyEtlabStudent } from '../lib/etlab.js';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

const router = createRouter();
const validEmail = value => typeof value === 'string' && value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const validPhone = value => typeof value === 'string' && /^\+?[0-9][0-9\s().-]{7,19}$/.test(value.trim());
const resetRequestBuckets = new Map();

function rateLimited(key) {
  const now = Date.now();
  for (const [bucket, value] of resetRequestBuckets) if (value.until <= now) resetRequestBuckets.delete(bucket);
  const current = resetRequestBuckets.get(key);
  if (current && current.count >= 4) return true;
  resetRequestBuckets.set(key, { count: (current?.count || 0) + 1, until: current?.until || now + 15 * 60_000 });
  return false;
}

router.post('/password-reset/request', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (rateLimited(`${req.ip}:${email}`)) return res.status(429).json({ error: 'Too many reset requests. Wait 15 minutes and try again.' });
  const generic = 'If an approved account uses that email, a reset link has been sent.';
  const smtpReady = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].every(key => typeof process.env[key] === 'string' && process.env[key].trim());
  if (!smtpReady) {
    console.error('Password reset email is not configured: SMTP_HOST, SMTP_USER, and SMTP_PASS are required.');
    return res.status(503).json({ error: 'Password reset email is not configured yet. Please contact the APMS administrator.' });
  }
  // Disabled/rejected historical accounts may share an email with a current
  // account. Only approved accounts can request a reset, so exclude inactive
  // records before asking PostgREST for a single row.
  const { data: user, error } = await supabase
    .from('users')
    .select('id,email,name')
    .eq('email', email)
    .eq('account_status', 'approved')
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Could not process the request. Try again later.' });
  if (!user) return res.json({ message: generic });
  await supabase.from('password_reset_tokens').delete().eq('user_id', user.id);
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { error: insertError } = await supabase.from('password_reset_tokens').insert({ user_id: user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 30 * 60_000).toISOString() });
  if (insertError) return res.status(503).json({ error: 'Password reset is not available yet. Contact your APMS administrator.' });
  try {
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) throw new Error('SMTP_PORT must be a valid port number.');
    const secure = process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && smtpPort === 465);
    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: smtpPort, secure, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    const link = new URL('/reset-password', process.env.APP_URL || process.env.APP_BASE_URL || 'https://ktuapms.vercel.app'); link.searchParams.set('token', token);
    const from = { name: process.env.SMTP_FROM_NAME || 'KTU APMS', address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER };
    await transporter.sendMail({ from, to: email, subject: 'Reset your KTU APMS password', text: `Hello ${user.name},\n\nReset your password within 30 minutes: ${link}\n\nIf you did not request this, ignore this email.`, html: `<p>Hello,</p><p><a href="${link}">Reset your KTU APMS password</a>. This link expires in 30 minutes.</p><p>If you did not request this, ignore this email.</p>` });
  } catch (e) {
    await supabase.from('password_reset_tokens').delete().eq('token_hash', tokenHash);
    console.error('Password reset email failed:', e.message);
    return res.status(503).json({ error: 'Could not send the email. Please try again later or contact your administrator.' });
  }
  return res.json({ message: generic });
});

router.post('/password-reset/complete', async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (token.length < 40 || token.length > 100) return res.status(400).json({ error: 'Reset link is invalid or expired. Request a new one.' });
  if (password.length < 12 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Password must be at least 12 characters and no more than 72 bytes.' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { data: completed, error: completeError } = await supabase.rpc('apms_consume_password_reset', {
    p_token_hash: tokenHash,
    p_password_hash: await bcrypt.hash(password, 12),
  });
  if (completeError) return res.status(500).json({ error: 'Password reset is temporarily unavailable. Contact your administrator.' });
  if (!completed) return res.status(400).json({ error: 'Reset link is invalid, expired, or already used. Request a new one.' });
  return res.json({ message: 'Password updated. You can now sign in.' });
});

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
      ? (user.role === 'student' ? 'Your account is waiting for your department faculty advisor to approve it.' : 'Your account is waiting for administrator approval.')
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
    phone:         user.phone,
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

router.post('/etlab/verify', async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const registrationNo = typeof req.body.registrationNo === 'string' ? req.body.registrationNo.trim() : '';
  if (!username || username.length > 100 || !password || password.length > 256 || !registrationNo || registrationNo.length > 64) {
    return res.status(400).json({ error: 'Enter your ET Lab username, password, and KTU registration number.' });
  }
  try {
    const identity = await verifyEtlabStudent({ username, password, registrationNo });
    return res.json({
      identity: {
        name: identity.name,
        registrationNo: identity.registrationNo,
        email: identity.email,
        phone: identity.phone,
        department: identity.department,
      },
      proof: identity.proof,
    });
  } catch (error) {
    if (error instanceof EtlabError) return res.status(error.status).json({ error: error.message, code: error.code });
    return res.status(502).json({ error: 'ET Lab verification failed. Please try again later.' });
  }
});

router.post('/signup', async (req, res) => {
  const { role, password, email, phone, rollNo, department, studentType, designation, year, profileUrl } = req.body;
  let name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const etlabVerificationToken = typeof req.body.etlabVerificationToken === 'string' ? req.body.etlabVerificationToken : '';
  const registrationNo = role === 'student' ? String(rollNo || '').trim().toUpperCase() : '';
  const username = role === 'student' ? registrationNo : (typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '');

  if (role === 'student') {
    const verifiedIdentity = readEtlabSignupProof(etlabVerificationToken);
    if (!verifiedIdentity) return res.status(401).json({ error: 'Verify your ET Lab identity again before creating your account.', code: 'etlab_verification_required' });
    if (normalizeRegistrationNumber(registrationNo) !== verifiedIdentity.registrationNo) {
      return res.status(400).json({ error: 'The verified ET Lab registration number changed. Verify your identity again.' });
    }
    // Use the verified name rather than trusting a client-supplied identity value.
    name = verifiedIdentity.name;
  }

  if (!username || !password || !name || !role || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, phone number, and password are required.' });
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
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!validPhone(phone)) return res.status(400).json({ error: 'Enter a valid phone number, including the country code if needed.' });
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'Password must have at least 12 characters and at most 72 UTF-8 bytes.' });
  }

  if (typeof username !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(username.trim())) return res.status(400).json({ error: role === 'student' ? 'Enter a valid KTU registration number.' : 'Use 3–64 letters, numbers, dots, underscores, or hyphens for your username.' });
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 150) return res.status(400).json({ error: 'Enter your full name (up to 150 characters).' });
  const password_hash = await bcrypt.hash(password, 12);

  const { data: departmentRow, error: departmentError } = await supabase.from('departments')
    .select('id, name').eq('name', department).maybeSingle();
  if (departmentError) return res.status(500).json({ error: departmentError.message });
  if (!departmentRow) return res.status(400).json({ error: 'Choose a valid department.' });

  const insertData = {
    role, account_status: 'pending', username, password_hash, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(),
    profile_url:  profileUrl || null,
    roll_no:      role === 'student' ? registrationNo : null,
    department:   department || null,
    department_id: departmentRow.id,
    year:         role === 'student' ? (year ? parseInt(year) : null) : null,
    student_type: role === 'student' ? (studentType || 'regular') : null,
    designation:  role === 'faculty' ? (designation || null) : null,
  };

  const { data, error } = await supabase
    .from('users')
    .insert(insertData)
    .select('id, role, account_status, username, name, email, phone, roll_no, department, student_type, designation')
    .single();

  if (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return res.status(409).json({ error: role === 'student' ? 'That KTU registration number is already registered.' : 'Username already taken. Please choose another.' });
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
