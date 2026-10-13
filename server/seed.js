// Seeds reference departments and provisions the first super admin from secrets.
// Run only after the schema migrations have been applied.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Mechanical Engineering',
  'Electrical and Computer Science',
];

export async function seed() {
  const username = process.env.SUPER_ADMIN_USERNAME?.trim();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME?.trim();
  const email = process.env.SUPER_ADMIN_EMAIL?.trim() || null;
  if (!username || !password || !name || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error('Set SUPER_ADMIN_USERNAME, SUPER_ADMIN_NAME, and a SUPER_ADMIN_PASSWORD of at least 12 characters and at most 72 UTF-8 bytes in the protected environment.');
  }
  console.log('🌱 Seeding database...\n');

  // ─── Departments ─────────────────────────────────────────────────────
  console.log('📁 Seeding departments...');
  for (const name of DEPARTMENTS) {
    const { error } = await supabase
      .from('departments')
      .upsert({ name }, { onConflict: 'name' });
    if (error) throw new Error(`Could not seed department "${name}": ${error.message}`);
    console.log(`  ✅ ${name}`);
  }

  // ─── Super Admin ─────────────────────────────────────────────────────
  console.log('\n👑 Seeding super admin...');
  const { data: existing, error: lookupError } = await supabase.from('users')
    .select('id').eq('is_super_admin', true).limit(1);
  if (lookupError) throw lookupError;
  if (existing.length) {
    console.log('A super admin already exists; leaving credentials and account unchanged.');
  } else {
    const password_hash = await bcrypt.hash(password, 12);
    const { error: adminError } = await supabase.from('users').insert({
      role: 'admin', is_super_admin: true, account_status: 'approved',
      username, password_hash, name, email,
    });
    if (adminError) throw adminError;
    console.log(`Provisioned the initial super admin account: ${username}`);
  }

  console.log('\n🎉 Seeding complete!');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch(error => { console.error(error.message); process.exitCode = 1; });
}
