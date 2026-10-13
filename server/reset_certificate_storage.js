// One-time destructive companion to db/reset_accounts_and_activity.sql.
// Run only after a verified backup and after the SQL data reset has succeeded.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

if (process.env.CONFIRM_APMS_STORAGE_PURGE !== 'APMS-PURGE-CERTIFICATE-FILES') {
  throw new Error('Certificate storage purge blocked. Set CONFIRM_APMS_STORAGE_PURGE after verifying the backup and SQL reset.');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const BUCKET = 'apms-certificates';

async function listAllFiles(prefix = '') {
  const files = [];
  const folders = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) files.push(path);
      else folders.push(path);
    }
    if (data.length < 100) break;
    offset += data.length;
  }
  for (const folder of folders) files.push(...await listAllFiles(folder));
  return files;
}

const paths = await listAllFiles();
for (let i = 0; i < paths.length; i += 100) {
  const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100));
  if (error) throw error;
}
console.log(`Removed ${paths.length} private certificate file(s) from ${BUCKET}.`);
