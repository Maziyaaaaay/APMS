import { createRouter } from '../lib/router.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import supabase from '../db/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { ACTIVITIES, CATALOG_VERSION, calculatePoints } from '../../client/src/utils/points.js';

const router = createRouter();
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
      .eq('account_status', 'approved')
      .eq('department_id', req.user.departmentId);
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

// Issue a single-object upload capability; no service key is sent to the browser.
router.post('/upload-url', requireRole('student'), async (req, res) => {
  const { mimeType, size } = req.body;
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType) || !Number.isInteger(size) || size <= 0 || size > 10 * 1024 * 1024) {
    return res.status(400).json({ error: 'Choose a PDF, JPG, or PNG up to 10 MB.' });
  }
  const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : 'jpg';
  const objectPath = `${req.user.id}/${randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from('apms-certificates').createSignedUploadUrl(objectPath, { upsert: false });
  if (error) return res.status(400).json({ error: 'Could not prepare the secure upload.' });
  const receipt = jwt.sign({ purpose: 'certificate-upload', userId: req.user.id, objectPath, mimeType, size }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ signedUrl: data.signedUrl, receipt });
});

// POST /api/certificates — student submits
router.post('/', requireRole('student'), async (req, res) => {
  const { activityId, levelSelected, hours, description, eventName, activityDate, fileUrl, fileName, uploadReceipt } = req.body;
  if (!activityId) return res.status(400).json({ error: 'activityId is required' });
  const activity = ACTIVITIES[activityId];
  if (!activity) return res.status(400).json({ error: 'Choose an activity from the current catalog.' });
  if (!String(eventName || '').trim() || String(eventName).trim().length > 180) return res.status(400).json({ error: 'A valid event or activity name is required.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(activityDate || '')) || Number.isNaN(Date.parse(`${activityDate}T00:00:00Z`))) return res.status(400).json({ error: 'A valid activity date is required.' });
  if (activityDate > new Date().toISOString().slice(0, 10)) return res.status(400).json({ error: 'Activity records must be for a completed activity.' });
  if (!fileUrl && !uploadReceipt) return res.status(400).json({ error: 'A certificate document is required.' });
  if (activity.type === 'hours' && (!Number.isInteger(Number(hours)) || Number(hours) <= 0)) return res.status(400).json({ error: 'Enter the completed course duration in whole hours.' });
  if ((activity.type === 'level' || activity.type === 'choice') && !activity.levels.some(level => level.label === levelSelected)) return res.status(400).json({ error: 'Choose a valid points option for this activity.' });
  const submittedPoints = calculatePoints(activityId, levelSelected, hours);

  let objectPath = null;
  let fileMimeType = null;
  let fileSizeBytes = null;
  if (uploadReceipt) {
    let receipt;
    try { receipt = jwt.verify(uploadReceipt, process.env.JWT_SECRET); }
    catch { return res.status(400).json({ error: 'Upload expired. Upload the document again.' }); }
    if (receipt.purpose !== 'certificate-upload' || receipt.userId !== req.user.id) return res.status(403).json({ error: 'Invalid upload ownership.' });
    const { data: info, error: infoError } = await supabase.storage.from('apms-certificates').info(receipt.objectPath);
    if (infoError || !info) return res.status(400).json({ error: 'Document upload is incomplete. Try again.' });
    const metadata = info.metadata || {};
    if (Number(metadata.size) !== receipt.size || metadata.mimetype !== receipt.mimeType) return res.status(400).json({ error: 'Uploaded document does not match the declared file.' });
    objectPath = receipt.objectPath;
    fileMimeType = receipt.mimeType;
    fileSizeBytes = receipt.size;
  } else if (fileUrl) {
    const match = /^data:(application\/pdf|image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(fileUrl);
    if (!match) return res.status(400).json({ error: 'Upload a PDF, JPG, or PNG certificate.' });
    fileMimeType = match[1];
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) return res.status(413).json({ error: 'Certificate files must be 10 MB or smaller.' });
    const extension = fileMimeType === 'application/pdf' ? 'pdf' : fileMimeType === 'image/png' ? 'png' : 'jpg';
    objectPath = `${req.user.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('apms-certificates')
      .upload(objectPath, bytes, { contentType: fileMimeType, upsert: false });
    if (uploadError) return res.status(400).json({ error: `Certificate upload failed: ${uploadError.message}` });
    fileSizeBytes = bytes.length;
  }

  const { data, error } = await supabase
    .from('certificates')
    .insert({
      student_id: req.user.id,
      activity_id: activityId,
      catalog_version: CATALOG_VERSION,
      activity_snapshot: activity,
      status: 'pending',
      level_selected: levelSelected,
      hours: activity.type === 'hours' ? Number(hours) : null,
      description,
      event_name: String(eventName).trim(),
      activity_date: activityDate,
      points_awarded: submittedPoints,
      file_url: objectPath,
      file_name: fileName || null,
      file_mime_type: fileMimeType,
      file_size_bytes: fileSizeBytes,
    })
    .select('*, student:student_id(id, name, email, roll_no, department, class, year, semester, student_type)')
    .single();

  if (error) {
    if (objectPath && !uploadReceipt) await supabase.storage.from('apms-certificates').remove([objectPath]);
    return res.status(400).json({ error: error.message });
  }
  res.status(201).json(data);
});

// GET /api/certificates/:id/file-url — private, short-lived file access.
router.get('/:id/file-url', async (req, res) => {
  const { data: cert, error } = await supabase.from('certificates')
    .select('id, student_id, file_url, file_mime_type, file_name, student:student_id(department_id, account_status)')
    .eq('id', req.params.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!cert || !cert.file_url) return res.status(404).json({ error: 'Certificate file not found.' });
  if (req.user.role === 'student' && cert.student_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (req.user.role === 'faculty' && (cert.student?.department_id !== req.user.departmentId || cert.student?.account_status !== 'approved')) return res.status(403).json({ error: 'You can only access files from approved students in your department.' });
  if (!['student', 'faculty', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { data: signed, error: signError } = await supabase.storage.from('apms-certificates')
    .createSignedUrl(cert.file_url, 60);
  if (signError) return res.status(500).json({ error: signError.message });
  res.json({ url: signed.signedUrl, mimeType: cert.file_mime_type, fileName: cert.file_name });
});

// PUT /api/certificates/:id — faculty/admin reviews
router.put('/:id', requireRole('faculty', 'admin'), async (req, res) => {
  const { status, pointsAwarded, notes } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be "approved" or "rejected"' });
  }

  const { data: current, error: currentError } = await supabase.from('certificates')
    .select('id, student_id, status, points_awarded, activity_id, activity_snapshot, student:student_id(department_id, account_status)')
    .eq('id', req.params.id).maybeSingle();
  if (currentError) return res.status(500).json({ error: currentError.message });
  if (!current) return res.status(404).json({ error: 'Certificate not found.' });
  if (current.status !== 'pending') return res.status(409).json({ error: 'This submission has already been reviewed.' });
  if (req.user.role === 'faculty' && (current.student?.department_id !== req.user.departmentId || current.student?.account_status !== 'approved')) {
    return res.status(403).json({ error: 'You can only review submissions from your department.' });
  }
  if (status === 'rejected' && !String(notes || '').trim()) return res.status(400).json({ error: 'Explain why the submission is being rejected.' });
  const awarded = status === 'rejected' ? 0 : Number(pointsAwarded);
  const activity = current.activity_snapshot || ACTIVITIES[current.activity_id];
  if (!activity || !Number.isInteger(awarded) || awarded < 0 || awarded > activity.maxPoints) {
    return res.status(400).json({ error: `Points must be a whole number between 0 and this activity's ${activity?.maxPoints ?? 0}-point maximum.` });
  }
  if (awarded !== Number(current.points_awarded ?? 0) && !String(notes || '').trim()) {
    return res.status(400).json({ error: 'Add a note explaining any adjustment to the catalog-calculated points.' });
  }
  const { data, error } = await supabase
    .from('certificates')
    .update({
      status,
      points_awarded: awarded,
      notes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: req.user.id,
    })
    .eq('id', req.params.id).eq('status', 'pending')
    .select('*, student:student_id(id, name, email, roll_no, department, class, year, semester, student_type)')
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(409).json({ error: 'This submission has already been reviewed.' });
  res.json(data);
});

// DELETE /api/certificates/:id — student can delete own pending cert
router.delete('/:id', async (req, res) => {
  // Fetch cert first to check ownership
  const { data: cert, error: fetchErr } = await supabase
    .from('certificates').select('student_id, status, file_url').eq('id', req.params.id).single();
  if (fetchErr) return res.status(404).json({ error: 'Certificate not found' });

  if (req.user.role === 'student') {
    if (cert.student_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (cert.status !== 'pending') return res.status(400).json({ error: 'Can only delete pending certificates' });
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (cert.status !== 'pending') return res.status(409).json({ error: 'Reviewed evidence is retained for the audit trail.' });
  const { data: removed, error } = await supabase.from('certificates').delete().eq('id', req.params.id).eq('status', 'pending').select('id').maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!removed) return res.status(409).json({ error: 'This submission was reviewed while you were deleting it. Refresh to see its status.' });
  if (cert.file_url) await supabase.storage.from('apms-certificates').remove([cert.file_url]);
  res.json({ success: true });
});

export default router;
