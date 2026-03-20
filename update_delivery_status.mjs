import { supabase } from './scripts-config.mjs'

async function run() {
  console.log('🔄 Atualizando todos os status de entrega para "Entregue"...')
  
  // Opção 1: Usar rpc exec se disponível (como nos outros scripts)
  const sql = `UPDATE public.crm_sales SET delivery_status = 'Entregue';`
  
  const { data: rpcData, error: rpcError } = await supabase.rpc('exec', { sql })
  
  if (!rpcError) {
    console.log('✅ Status atualizados com sucesso via SQL RPC.')
  } else {
    console.warn('⚠️ Falha ao usar RPC exec. Tentando via update padrão da API REST...')
    
    // Opção 2: Usar update da API REST (pode ter limite de registros se não usar filtro, mas aqui queremos todos)
    // Supabase costuma exigir um filtro. Podemos usar um filtro que pegue tudo.
    const { data: updateData, error: updateError } = await supabase
      .from('crm_sales')
      .update({ delivery_status: 'Entregue' })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Filtro "sempre verdadeiro" para forçar update em massa
    
    if (updateError) {
      console.error('❌ Erro ao atualizar status:', updateError.message)
      process.exit(1)
    } else {
      console.log('✅ Status atualizados com sucesso via API REST.')
    }
  }
}

run().catch(e => {
  console.error('💥 Erro fatal:', e)
  process.exit(1)
})
