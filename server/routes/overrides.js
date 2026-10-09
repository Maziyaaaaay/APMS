import { createRouter } from '../lib/router.js';
import supabase from '../db/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { ACTIVITIES } from '../../client/src/utils/points.js';

const router = createRouter();
router.use(authMiddleware);

// GET /api/overrides — all roles can read (needed for points display)
router.get('/', requireRole('admin'), async (_req, res) => {
  const { data, error } = await supabase.from('point_overrides').select('*');
  if (error) return res.status(500).json({ error: error.message });
  // Return as a map { activityId: override } to match old storage format
  const map = {};
  for (const row of data) map[row.activity_id] = row.override;
  res.json(map);
});

// PUT /api/overrides/:activityId — admin only (upsert)
router.put('/:activityId', requireRole('admin'), async (req, res) => {
  const { override } = req.body;
  if (!ACTIVITIES[req.params.activityId]) return res.status(404).json({ error: 'Activity not found.' });
  if (!override || typeof override.note !== 'string' || !override.note.trim() || Object.keys(override).some(key => key !== 'note')) {
    return res.status(400).json({ error: 'Only a non-empty administrator note can be saved here. Official KTU point limits are fixed.' });
  }
  const { error } = await supabase.from('point_overrides').upsert({
    activity_id: req.params.activityId,
    override: { note: override.note.trim().slice(0, 1000) },
    updated_at: new Date().toISOString(),
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// DELETE /api/overrides/:activityId — admin only
router.delete('/:activityId', requireRole('admin'), async (req, res) => {
  const { error } = await supabase.from('point_overrides').delete().eq('activity_id', req.params.activityId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
