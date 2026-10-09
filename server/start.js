import 'dotenv/config';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters in the backend environment.');
}
if (process.env.APMS_BOOTSTRAP_ADMIN === 'true') {
  const { default: supabase } = await import('./db/supabase.js');
  const { count, error } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_super_admin', true);
  if (error) throw new Error('Apply the APMS v2 schema before starting the API: ' + error.message);
  if (count === 0) {
    const { seed } = await import('./seed.js');
    await seed();
  }
}
const { default: app } = await import('./index.js');
const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', () => console.log(`APMS backend running on http://localhost:${port}`));
