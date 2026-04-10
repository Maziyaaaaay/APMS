import express from 'express';
import supabase from '../db/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/circulars — all roles can read
router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('circulars').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/circulars — admin only
router.post('/', requireRole('admin'), async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });
  const { data, error } = await supabase.from('circulars').insert({ title, content }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/circulars/:id — admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { error } = await supabase.from('circulars').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
