// ============================================================
//  sync_frenet.mjs
//  Sincroniza status de rastreio do Frenet → Supabase
//
//  Como usar:
//    node sync_frenet.mjs           → sincroniza tudo
//    node sync_frenet.mjs --dry-run → mostra o que mudaria sem salvar
// ============================================================

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

// ── Configuração ────────────────────────────────────────────
const SUPABASE_URL   = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY   = process.env.VITE_SUPABASE_ANON_KEY
const FRENET_TOKEN   = process.env.FRENET_TOKEN
const DRY_RUN        = process.argv.includes('--dry-run')

if (!SUPABASE_URL || !SUPABASE_KEY || !FRENET_TOKEN) {
  console.error('❌ Variáveis de ambiente não encontradas. Verifique o arquivo .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Mapeamento de status Frenet → Sistema ──────────────────
function mapFrenetStatus(events) {
  if (!events || events.length === 0) return null

  // Pega o evento mais recente
  const latest = events[0]
  const desc = (latest.EventDescription || '').toLowerCase()

  if (
    desc.includes('entregue ao destinatário') ||
    desc.includes('entregue') && !desc.includes('não entregue')
  ) return 'Entregue'

  if (
    desc.includes('em trânsito') ||
    desc.includes('saiu para entrega') ||
    desc.includes('encaminhado') ||
    desc.includes('postado') ||
    desc.includes('em transferência') ||
    desc.includes('chegou') ||
    desc.includes('loggi') ||
    desc.includes('coletado')
  ) return 'Enviado'

  return null // Status desconhecido, não altera
}

// ── Consulta a API do Frenet ───────────────────────────────
async function fetchFrenetTracking(trackingCodes) {
  const response = await fetch('https://api.frenet.com.br/tracking/trackinginfo', {
    method: 'POST',
    headers: {
      'token': FRENET_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      ShippingServiceCode: null,
      TrackingNumbers: trackingCodes,
    }),
  })

  if (!response.ok) {
    throw new Error(`Frenet API erro: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.TrackingResponseCollection || []
}

// ── Principal ──────────────────────────────────────────────
async function main() {
  console.log('='.repeat(55))
  console.log('  🚚 Sincronização Frenet → ControleVendas')
  console.log(`  📅 ${new Date().toLocaleString('pt-BR')}`)
  if (DRY_RUN) console.log('  🔍 MODO DRY-RUN (nenhuma alteração será salva)')
  console.log('='.repeat(55))

  // 1. Buscar vendas com rastreio que NÃO estão entregues
  const { data: sales, error } = await supabase
    .from('crm_sales')
    .select('id, tracking_code, delivery_status, crm_customers(name)')
    .not('tracking_code', 'is', null)
    .neq('delivery_status', 'Entregue')

  if (error) {
    console.error('❌ Erro ao buscar vendas:', error.message)
    process.exit(1)
  }

  if (!sales || sales.length === 0) {
    console.log('✅ Nenhuma venda pendente com código de rastreio.')
    return
  }

  console.log(`\n📦 ${sales.length} venda(s) com rastreio para verificar:\n`)

  // 2. Agrupar códigos únicos (evita consultas duplicadas)
  const uniqueCodes = [...new Set(sales.map(s => s.tracking_code).filter(Boolean))]
  console.log(`🔍 Consultando ${uniqueCodes.length} código(s) na API do Frenet...\n`)

  // 3. Consultar Frenet (em lotes de 10 para não sobrecarregar)
  const BATCH_SIZE = 10
  const trackingMap = {} // código → eventos

  for (let i = 0; i < uniqueCodes.length; i += BATCH_SIZE) {
    const batch = uniqueCodes.slice(i, i + BATCH_SIZE)
    try {
      const results = await fetchFrenetTracking(batch)
      for (const result of results) {
        if (result.TrackingNumber) {
          trackingMap[result.TrackingNumber] = result.Events || []
        }
      }
      // Pequena pausa entre lotes
      if (i + BATCH_SIZE < uniqueCodes.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    } catch (err) {
      console.error(`❌ Erro ao consultar lote ${i / BATCH_SIZE + 1}:`, err.message)
    }
  }

  // 4. Processar cada venda e atualizar se necessário
  let updated = 0
  let unchanged = 0
  let unknown = 0

  for (const sale of sales) {
    const events = trackingMap[sale.tracking_code]
    const customerName = sale.crm_customers?.name || 'Cliente desconhecido'

    if (events === undefined) {
      console.log(`  ⚠️  ${sale.tracking_code} — ${customerName} → código não encontrado no Frenet`)
      unknown++
      continue
    }

    const newStatus = mapFrenetStatus(events)
    const latestEvent = events[0]?.EventDescription || 'Sem eventos'

    if (!newStatus || newStatus === sale.delivery_status) {
      console.log(`  ─  ${sale.tracking_code} — ${customerName}`)
      console.log(`     Status: ${sale.delivery_status} → sem alteração (${latestEvent})`)
      unchanged++
      continue
    }

    console.log(`  ✅ ${sale.tracking_code} — ${customerName}`)
    console.log(`     ${sale.delivery_status} → ${newStatus} (${latestEvent})`)

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from('crm_sales')
        .update({ delivery_status: newStatus })
        .eq('id', sale.id)

      if (updateError) {
        console.error(`     ❌ Erro ao atualizar:`, updateError.message)
      }
    }

    updated++
  }

  // 5. Resumo final
  console.log('\n' + '='.repeat(55))
  console.log('  📊 RESUMO')
  console.log('='.repeat(55))
  console.log(`  ✅ Atualizados:   ${updated}`)
  console.log(`  ─  Sem mudança:   ${unchanged}`)
  console.log(`  ⚠️  Não encontrados: ${unknown}`)
  if (DRY_RUN) {
    console.log('\n  💡 Execute sem --dry-run para aplicar as alterações.')
  }
  console.log('='.repeat(55) + '\n')
}

main().catch(err => {
  console.error('❌ Erro inesperado:', err)
  process.exit(1)
})
