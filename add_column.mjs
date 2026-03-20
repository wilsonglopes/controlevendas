import { supabase } from './scripts-config.mjs'

async function run() {
  const sql = `ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS address_number TEXT;`
  // Some environments may not have a generic 'exec' PRC exposed. If so, we can query it directly using postgres connection string, but we only have supabase key here.
  // We can try to use standard rest API trick if no exec function.
  // However, I will try exec first.
  const { data, error } = await supabase.rpc('exec', { sql })
  if (error) {
    console.error('Error adding column, you may need to add it manually in Supabase SQL editor:', error.message)
    console.log(sql);
  } else {
    console.log('Column address_number added successfully')
  }
}
run()
