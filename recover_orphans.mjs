import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sxsrlrxtfdnnagqyuhnh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c3Jscnh0ZmRubmFncXl1aG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDUzNiwiZXhwIjoyMDg4ODMwNTM2fQ.PfDWhneI1uC59ozTNKUNFrQQFiio5ePDhPoOg_qSMpQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function recover() {
    console.log('📖 Carregando prostvita.sql...');
    const content = fs.readFileSync('prostvita.sql', 'utf8');

    console.log('🔍 Mapeando dados do WooCommerce no SQL...');
    const firstNameMap = new Map();
    const lastNameMap = new Map();
    const phoneMap = new Map();

    // Regex para extrair post_id e meta_value
    // Ex: (102673, 4573, '_billing_first_name', 'BIANOR')
    const metaRegex = /\(\d+,\s*(\d+),\s*'_billing_(first_name|last_name|phone)',\s*'(.*?)'\)/g;
    
    let metaMatch;
    while ((metaMatch = metaRegex.exec(content)) !== null) {
        const orderId = metaMatch[1];
        const key = metaMatch[2];
        const value = metaMatch[3];

        if (key === 'first_name') firstNameMap.set(orderId, value);
        if (key === 'last_name') lastNameMap.set(orderId, value);
        if (key === 'phone') phoneMap.set(orderId, value);
    }

    console.log(`✅ ${firstNameMap.size} nomes e ${phoneMap.size} telefones mapeados.`);

    console.log('🔍 Buscando vendas sem cliente no Supabase...');
    const { data: sales, error } = await supabase
        .from('crm_sales')
        .select('id, notes')
        .is('customer_id', null);

    if (error) {
        console.error('Erro ao buscar vendas:', error.message);
        return;
    }

    console.log(`📦 Encontradas ${sales.length} vendas para recuperar.`);

    let recoveredCount = 0;
    let skippedCount = 0;

    for (const sale of sales) {
        const orderMatch = sale.notes.match(/Pedido #(\d+)/);
        if (!orderMatch) {
            skippedCount++;
            continue;
        }

        const orderId = orderMatch[1];
        const firstName = firstNameMap.get(orderId) || '';
        const lastName = lastNameMap.get(orderId) || '';
        const name = `${firstName} ${lastName}`.trim();
        const phone = phoneMap.get(orderId);

        if (!name) {
            console.log(`⚠️  Não foi possível encontrar o nome para o Pedido #${orderId}`);
            skippedCount++;
            continue;
        }

        // Tentar encontrar o cliente no CRM pelo nome
        const { data: existingCust } = await supabase
            .from('crm_customers')
            .select('id')
            .ilike('name', name)
            .limit(1);

        let customerId;

        if (existingCust && existingCust.length > 0) {
            customerId = existingCust[0].id;
            console.log(`🔗 Vinculando Pedido #${orderId} ao cliente existente: ${name}`);
        } else {
            console.log(`🆕 Criando novo cliente para Pedido #${orderId}: ${name}`);
            const { data: newCust, error: createError } = await supabase
                .from('crm_customers')
                .insert([{ name, phone }])
                .select('id');
            
            if (createError) {
                console.error(`❌ Erro ao criar cliente ${name}:`, createError.message);
                skippedCount++;
                continue;
            }
            customerId = newCust[0].id;
        }

        // Atualizar a venda
        const { error: updateError } = await supabase
            .from('crm_sales')
            .update({ customer_id: customerId })
            .eq('id', sale.id);

        if (updateError) {
            console.error(`❌ Erro ao atualizar venda ${sale.id}:`, updateError.message);
            skippedCount++;
        } else {
            recoveredCount++;
        }
    }

    console.log('\n--- Resultado Final ---');
    console.log(`✅ Sucesso: ${recoveredCount}`);
    console.log(`⚠️  Ignorados: ${skippedCount}`);
    console.log('-----------------------');
}

recover();
