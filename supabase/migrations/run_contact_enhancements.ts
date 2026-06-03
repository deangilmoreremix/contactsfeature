import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const migrate = async () => {
  const { error } = await supabaseAdmin.rpc('migrate_contact_enhancements');
  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  console.log('Migration completed successfully');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}
