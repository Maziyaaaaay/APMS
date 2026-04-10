import express from 'express';
import supabase from '../db/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/departments — all roles can read
router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('departments').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/departments — admin only
router.post('/', requireRole('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const { data, error } = await supabase.from('departments').insert({ name }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/departments/:id — admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { error } = await supabase.from('departments').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
