import app from '../server/index.js';

let ready;
async function initialize() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must have at least 32 characters.');
  if (process.env.APMS_BOOTSTRAP_ADMIN === 'true') {
    const { default: supabase } = await import('../server/db/supabase.js');
    const { count, error } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_super_admin', true);
    if (error) throw error;
    if (count === 0) {
      const { seed } = await import('../server/seed.js');
      try { await seed(); }
      catch (failure) {
        const { count: owners, error: checkError } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_super_admin', true);
        if (checkError || owners !== 1) throw failure;
      }
    }
  }
}
export default async function handler(req, res) {
  try { await (ready ||= initialize().catch(error => { ready = null; throw error; })); }
  catch (error) { console.error('Initialization failed:', error.message); return res.status(503).json({ error: 'APMS setup is incomplete. Contact the administrator.' }); }
  return app(req, res);
}
