import express from 'express';
import supabase from '../db/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/overrides — all roles can read (needed for points display)
router.get('/', async (_req, res) => {
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
  if (!override) return res.status(400).json({ error: 'override object is required' });
  const { error } = await supabase.from('point_overrides').upsert({
    activity_id: req.params.activityId,
    override,
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
