import { supabase } from './scripts-config.mjs'

async function check() {
  const { data: pedidosWoo } = await supabase.from('pedidos_woo').select('*').limit(15);
  pedidosWoo.forEach(p => console.log(`ID: ${p.id_pedido} | Total: ${p.total}`));
}

check()
