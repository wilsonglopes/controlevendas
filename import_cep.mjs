import fs from 'fs';
import { supabase } from './scripts-config.mjs'

async function importCep() {
    console.log('📖 Lendo prostvita.sql...');
    const content = fs.readFileSync('prostvita.sql', 'utf8');

    // Regex para extrair post_id e billing_postcode do wp_postmeta
    // Ex: (4594, 311, '_billing_postcode', '88058-424')
    const postcodeRegex = /\(\d+,\s*(\d+),\s*'_billing_postcode',\s*'(.*?)'\)/g;
    
    const postcodeMap = new Map();
    let match;
    while ((match = postcodeRegex.exec(content)) !== null) {
        postcodeMap.set(match[1], match[2]); // post_id -> postcode
    }

    console.log(`✅ Encontrados ${postcodeMap.size} CEPs únicos no SQL.`);

    if (postcodeMap.size === 0) {
        console.log('❌ Nenhum CEP encontrado. Verifique o formato do SQL.');
        return;
    }

    console.log('🔍 Buscando vendas no Supabase para mapear IDs de Pedidos...');
    const { data: sales, error: salesError } = await supabase
        .from('crm_sales')
        .select('customer_id, notes');

    if (salesError) {
        console.error('❌ Erro ao buscar vendas:', salesError.message);
        return;
    }

    console.log(`📦 Processando ${sales.length} registros de vendas...`);

    const customerCepMap = new Map();
    for (const sale of sales) {
        if (!sale.notes || !sale.customer_id) continue;
        
        // As notas costumam ter "Pedido #123"
        const orderMatch = sale.notes.match(/Pedido #(\d+)/);
        if (orderMatch) {
            const orderId = orderMatch[1];
            if (postcodeMap.has(orderId)) {
                customerCepMap.set(sale.customer_id, postcodeMap.get(orderId));
            }
        }
    }

    console.log(`🎯 Mapeados ${customerCepMap.size} clientes com seus respectivos CEPs.`);

    if (customerCepMap.size === 0) {
        console.log('⚠️ Nenhum mapeamento Order ID -> Customer ID encontrado.');
        return;
    }

    console.log('🚀 Atualizando crm_customers...');
    let updatedCount = 0;
    let errorCount = 0;

    // Atualização em lotes para evitar sobrecarga
    const entries = Array.from(customerCepMap.entries());
    for (let i = 0; i < entries.length; i += 50) {
        const batch = entries.slice(i, i + 50);
        await Promise.all(batch.map(async ([customerId, zipCode]) => {
            const { error } = await supabase
                .from('crm_customers')
                .update({ zip_code: zipCode })
                .eq('id', customerId);
            
            if (error) {
                console.error(`❌ Erro ao atualizar cliente ${customerId}:`, error.message);
                errorCount++;
            } else {
                updatedCount++;
            }
        }));
        console.log(`⏳ Progresso: ${Math.min(i + 50, entries.length)}/${entries.length}...`);
    }

    console.log('\n--- Resultado Final ---');
    console.log(`✅ Sucesso: ${updatedCount}`);
    console.log(`❌ Falhas: ${errorCount}`);
    console.log('-----------------------');
}

importCep();
