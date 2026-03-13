import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxsrlrxtfdnnagqyuhnh.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c3Jscnh0ZmRubmFncXl1aG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDUzNiwiZXhwIjoyMDg4ODMwNTM2fQ.PfDWhneI1uC59ozTNKUNFrQQFiio5ePDhPoOg_qSMpQ'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function check() {
  const { data: pedidosWoo } = await supabase.from('pedidos_woo').select('*').limit(15);
  pedidosWoo.forEach(p => console.log(`ID: ${p.id_pedido} | Total: ${p.total}`));
}

check()
