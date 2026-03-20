import { supabase } from './scripts-config.mjs'

async function fix() {
  console.log('🔄 Corrigindo valores em crm_sales...');
  const { data: vendas, error } = await supabase.from('crm_sales').select('*');
  if (error) {
    console.error('Erro:', error);
    return;
  }

  let updated = 0;
  for (const venda of vendas) {
    // Dividir por 10 para consertar o erro de importação do WooCommerce (onde '129.90' virou '1299')
    const novoTotal = venda.total_amount / 10;
    
    // Tenta arrumar também o JSON dos itens
    let novosItens = venda.items;
    if (venda.items && venda.items.length > 0) {
      novosItens = venda.items.map(item => ({
        ...item,
        price: (item.price || 0) / 10
      }));
    }

    const { error: errUp } = await supabase
      .from('crm_sales')
      .update({ total_amount: novoTotal, items: novosItens })
      .eq('id', venda.id);

    if (errUp) {
      console.error(`Erro ao atualizar venda ${venda.id}`, errUp);
    } else {
      updated++;
    }
  }

  console.log(`✅ ${updated} vendas corrigidas no banco de dados!`);
}

fix();
