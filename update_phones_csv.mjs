import { supabase } from './scripts-config.mjs'
import * as fs from 'fs'

async function run() {
  console.log('🚀 Iniciando atualização de telefones via CSV...')

  // 1. Carregar CSV
  const csvPath = 'contatos_por_registro.csv'
  const csvContent = fs.readFileSync(csvPath, 'latin1') // CSV often uses Latin1/Windows-1252 in Brazil
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '')
  
  // Header: ID_Registro;Nome;Email;Telefone;Celular
  const rows = lines.slice(1).map(line => {
    const parts = line.split(';')
    if (parts.length < 5) return null
    return {
      id_registro: parts[0]?.trim(),
      nome: parts[1]?.trim(),
      email: parts[2]?.trim(),
      telefone: parts[3]?.trim(),
      celular: parts[4]?.trim()
    }
  }).filter(row => row !== null)

  console.log(`📊 CSV carregado: ${rows.length} registros encontrados.`)

  // 2. Carregar vendas para mapear ID_Registro -> customer_id
  console.log('📥 Buscando vendas para mapeamento de ID_Registro...')
  const { data: sales, error: salesError } = await supabase
    .from('crm_sales')
    .select('customer_id, notes')
  
  if (salesError) {
    console.error('❌ Erro ao buscar vendas:', salesError.message)
    process.exit(1)
  }

  const registroToCustomerMap = new Map()
  for (const s of sales) {
    if (s.notes && s.notes.includes('Pedido #')) {
      const match = s.notes.match(/Pedido #(\d+)/)
      if (match && match[1]) {
        registroToCustomerMap.set(match[1], s.customer_id)
      }
    }
  }
  console.log(`🔗 Mapeamento ID_Registro -> customer_id concluído (${registroToCustomerMap.size} vínculos).`)

  // 3. Carregar todos os clientes para backup de match por nome
  console.log('📥 Buscando lista de clientes para backup de match por nome...')
  const { data: customers, error: custError } = await supabase
    .from('crm_customers')
    .select('id, name')
  
  if (custError) {
    console.error('❌ Erro ao buscar clientes:', custError.message)
    process.exit(1)
  }

  const nameToIdMap = new Map()
  for (const c of customers) {
    nameToIdMap.set(c.name.trim().toLowerCase(), c.id)
  }

  // 4. Processar atualizações
  let countMatchedId = 0
  let countMatchedName = 0
  let countUpdated = 0
  let countFailed = 0

  console.log('🔄 Processando registros...')

  for (const row of rows) {
    let customerId = registroToCustomerMap.get(row.id_registro)
    if (customerId) {
      countMatchedId++
    } else {
      // Tentar por nome se falhar por ID
      customerId = nameToIdMap.get(row.nome.toLowerCase())
      if (customerId) {
        countMatchedName++
      }
    }

    if (customerId) {
      // Prioridade: Celular > Telefone
      const newPhone = (row.celular || row.telefone || '').trim()
      
      if (newPhone) {
        const { error: updateError } = await supabase
          .from('crm_customers')
          .update({ phone: newPhone })
          .eq('id', customerId)
        
        if (updateError) {
          console.warn(`  ⚠️ Falha ao atualizar cliente ${row.nome}:`, updateError.message)
          countFailed++
        } else {
          countUpdated++
        }
      }
    }
  }

  console.log('\n--- Resultado Final ---')
  console.log(`✅ Atualizados: ${countUpdated}`)
  console.log(`🧩 Matches por ID_Registro: ${countMatchedId}`)
  console.log(`👤 Matches por Nome: ${countMatchedName}`)
  console.log(`❌ Falhas: ${countFailed}`)
  console.log(`Total registros CSV: ${rows.length}`)
  console.log('-----------------------')
}

run().catch(e => {
  console.error('💥 Erro fatal:', e)
  process.exit(1)
})
