// seed.js — seeds only the super admin account
// Run: node seed.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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

async function seed() {
  console.log('🌱 Seeding database...\n');

  // ─── Departments ─────────────────────────────────────────────────────
  console.log('📁 Seeding departments...');
  for (const name of DEPARTMENTS) {
    const { error } = await supabase
      .from('departments')
      .upsert({ name }, { onConflict: 'name' });
    if (error) console.warn(`  ⚠️  Dept "${name}": ${error.message}`);
    else console.log(`  ✅ ${name}`);
  }

  // ─── Super Admin ─────────────────────────────────────────────────────
  console.log('\n👑 Seeding super admin...');
  const password_hash = await bcrypt.hash('admin@coet26', 12);
  const { error: adminError } = await supabase
    .from('users')
    .upsert(
      {
        role:           'admin',
        is_super_admin: true,
        username:       'superadmin',
        password_hash,
        name:           'Super Admin',
        email:          'admin@coet.edu',
      },
      { onConflict: 'username' }
    );

  if (adminError) console.warn(`  ⚠️  Super admin: ${adminError.message}`);
  else console.log('  ✅ super admin (super_admin)');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Username : superadmin');
  console.log('  Password : admin@coet26');
  console.log('  Role     : admin\n');
}

seed().catch(console.error);
