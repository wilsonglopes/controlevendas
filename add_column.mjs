import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxsrlrxtfdnnagqyuhnh.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c3Jscnh0ZmRubmFncXl1aG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDUzNiwiZXhwIjoyMDg4ODMwNTM2fQ.PfDWhneI1uC59ozTNKUNFrQQFiio5ePDhPoOg_qSMpQ'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

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
