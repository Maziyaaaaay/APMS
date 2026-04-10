import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function cleanUp() {
  const { data, error } = await supabase
    .from('users')
    .delete()
    .eq('username', 'super admin');
    
  if (error) {
    console.error('Error deleting user:', error.message);
  } else {
    console.log('✅ old super admin user deleted.');
  }
}

cleanUp().catch(console.error);
