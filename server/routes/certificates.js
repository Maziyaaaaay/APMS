import express from 'express';
import supabase from '../db/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/certificates
// - student: own certificates only
// - faculty: all from their department (joined via student)
// - admin: all certificates
router.get('/', async (req, res) => {
  if (req.user.role === 'student') {
    const { data, error } = await supabase
      .from('certificates')
      .select('*, student:student_id(id, name, email, roll_no, department, class, year, semester, student_type)')
      .eq('student_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.user.role === 'faculty') {
    // Get students in faculty's department first
    const { data: students, error: sErr } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'student')
      .eq('department', req.user.department);
    if (sErr) return res.status(500).json({ error: sErr.message });
    const studentIds = students.map(s => s.id);
    if (studentIds.length === 0) return res.json([]);

    const { data, error } = await supabase
      .from('certificates')
      .select('*, student:student_id(id, name, email, roll_no, department, class, year, semester, student_type)')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // admin — all
  const { data, error } = await supabase
    .from('certificates')
    .select('*, student:student_id(id, name, email, roll_no, department, class, year, semester, student_type)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/certificates — student submits
router.post('/', requireRole('student'), async (req, res) => {
  const { activityId, levelSelected, hours, description, fileUrl, pointsAwarded } = req.body;
  if (!activityId) return res.status(400).json({ error: 'activityId is required' });

  const { data, error } = await supabase
    .from('certificates')
    .insert({
      student_id: req.user.id,
      activity_id: activityId,
      status: 'pending',
      points_awarded: pointsAwarded,
      level_selected: levelSelected,
      hours,
      description,
      file_url: fileUrl,
    })
    .select('*, student:student_id(id, name, email, roll_no, department, class, year, semester, student_type)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/certificates/:id — faculty/admin reviews
router.put('/:id', requireRole('faculty', 'admin'), async (req, res) => {
  const { status, pointsAwarded, notes } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be "approved" or "rejected"' });
  }

  const { data, error } = await supabase
    .from('certificates')
    .update({
      status,
      points_awarded: pointsAwarded,
      notes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: req.user.id,
    })
    .eq('id', req.params.id)
    .select('*, student:student_id(id, name, email, roll_no, department, class, year, semester, student_type)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/certificates/:id — student can delete own pending cert
router.delete('/:id', async (req, res) => {
  // Fetch cert first to check ownership
  const { data: cert, error: fetchErr } = await supabase
    .from('certificates').select('student_id, status').eq('id', req.params.id).single();
  if (fetchErr) return res.status(404).json({ error: 'Certificate not found' });

  if (req.user.role === 'student') {
    if (cert.student_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (cert.status !== 'pending') return res.status(400).json({ error: 'Can only delete pending certificates' });
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { error } = await supabase.from('certificates').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
