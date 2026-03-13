import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxsrlrxtfdnnagqyuhnh.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c3Jscnh0ZmRubmFncXl1aG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDUzNiwiZXhwIjoyMDg4ODMwNTM2fQ.PfDWhneI1uC59ozTNKUNFrQQFiio5ePDhPoOg_qSMpQ'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function migrate() {
  console.log('🔄 Lendo pedidos_woo...')

  // 1. Ler todos os pedidos do WooCommerce
  const { data: pedidos, error } = await supabase
    .from('pedidos_woo')
    .select('*')
    .order('data_pedido')

  if (error) {
    console.error('❌ Erro ao ler pedidos_woo:', error.message)
    process.exit(1)
  }

  console.log(`📦 ${pedidos.length} pedidos encontrados.`)

  // 2. Agrupar clientes únicos por nome + telefone
  const clienteMap = new Map()
  for (const p of pedidos) {
    const chave = `${(p.nome || '').trim().toLowerCase()}|${(p.telefone || '').replace(/\D/g, '')}`
    if (!clienteMap.has(chave)) {
      clienteMap.set(chave, {
        name: (p.nome || 'Cliente sem nome').trim(),
        phone: p.telefone || null,
        address: p.endereco || null,
        city: p.cidade || null,
        state: p.estado || null,
        notes: p.pais && p.pais !== 'BR' ? `País: ${p.pais}` : null
      })
    }
  }

  console.log(`👥 ${clienteMap.size} clientes únicos identificados.`)

  // 3. Inserir clientes no crm_customers (pulando duplicatas por nome)
  const clientesArray = Array.from(clienteMap.values())
  const clienteIdMap = new Map() // chave → uuid inserido

  let clientesInseridos = 0
  for (const cliente of clientesArray) {
    const { data, error: err } = await supabase
      .from('crm_customers')
      .insert([cliente])
      .select('id, name, phone')

    if (err) {
      console.warn(`  ⚠️  Erro ao inserir cliente "${cliente.name}":`, err.message)
    } else {
      const chave = `${cliente.name.toLowerCase()}|${(cliente.phone || '').replace(/\D/g, '')}`
      clienteIdMap.set(chave, data[0].id)
      clientesInseridos++
    }
  }

  console.log(`✅ ${clientesInseridos} clientes inseridos em crm_customers.`)

  // 4. Mapear status do WooCommerce → CRM
  const mapPayment = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('completed') || s.includes('concluido') || s.includes('processing')) return 'Pago'
    if (s.includes('pending') || s.includes('pendente')) return 'Pendente'
    if (s.includes('cancelled') || s.includes('cancelado')) return 'Cancelado'
    if (s.includes('refund') || s.includes('reembolso')) return 'Reembolsado'
    return 'Pago'
  }

  const mapDelivery = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('completed') || s.includes('concluido')) return 'Entregue'
    if (s.includes('cancelled') || s.includes('cancelado')) return 'Cancelado'
    return 'Pendente'
  }

  // 5. Inserir vendas em crm_sales
  let vendasInseridas = 0
  for (const p of pedidos) {
    const chave = `${(p.nome || '').trim().toLowerCase()}|${(p.telefone || '').replace(/\D/g, '')}`
    const customerId = clienteIdMap.get(chave) || null

    const venda = {
      customer_id: customerId,
      total_amount: (parseFloat(p.total) || 0) / 10,
      payment_status: mapPayment(p.status),
      delivery_status: mapDelivery(p.status),
      tracking_code: null,
      items: p.qtd_itens ? [{ description: `${p.qtd_itens} item(s) do pedido #${p.id_pedido}`, quantity: p.qtd_itens, price: (parseFloat(p.total) || 0) / 10 }] : [],
      notes: `Importado do WooCommerce. Pedido #${p.id_pedido}. Status original: ${p.status || '-'}.`,
      created_at: p.data_pedido || new Date().toISOString()
    }

    const { error: errV } = await supabase.from('crm_sales').insert([venda])
    if (errV) {
      console.warn(`  ⚠️  Erro ao inserir venda #${p.id_pedido}:`, errV.message)
    } else {
      vendasInseridas++
    }
  }

  console.log(`✅ ${vendasInseridas} vendas inseridas em crm_sales.`)
  console.log('\n🎉 Migração concluída! Acesse o sistema para ver os dados.')
}

migrate().catch(e => {
  console.error('Erro inesperado:', e)
  process.exit(1)
})
