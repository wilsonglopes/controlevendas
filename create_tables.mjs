import { supabase } from './scripts-config.mjs'

// Try to use rpc to run raw SQL
async function createTables() {
  console.log('Attempting to create tables via Supabase RPC...')

  // Test if tables exist by trying to select from them
  const { data: testData, error: testError } = await supabase
    .from('crm_customers')
    .select('id')
    .limit(1)
  
  if (!testError) {
    console.log('Tables already exist! crm_customers found.')
    return true
  }
  
  console.log('Tables do not exist. Error:', testError.message)
  console.log('Code:', testError.code)
  
  // Try using rpc to execute SQL
  const sql = `
    CREATE TABLE IF NOT EXISTS public.crm_customers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS public.crm_products (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS public.crm_sales (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      customer_id UUID REFERENCES public.crm_customers(id) ON DELETE SET NULL,
      total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'Pago',
      delivery_status TEXT NOT NULL DEFAULT 'Pendente',
      tracking_code TEXT,
      items JSONB DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
  
  // Try rpc exec_sql (common in supabase setups)
  const { data, error } = await supabase.rpc('exec', { sql })
  if (error) {
    console.log('RPC exec failed:', error.message)
  } else {
    console.log('Tables created via RPC exec!')
    return true
  }

  return false
}

createTables().then(success => {
  if (success) {
    console.log('DONE: Tables are ready.')
  } else {
    console.log('FAILED: Could not create tables automatically.')
    console.log('\nManual setup required. Run this SQL in Supabase SQL Editor:')
    console.log('https://supabase.com/dashboard/project/sxsrlrxtfdnnagqyuhnh/sql/new')
  }
  process.exit(0)
}).catch(e => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
