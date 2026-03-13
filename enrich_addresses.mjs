import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sxsrlrxtfdnnagqyuhnh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c3Jscnh0ZmRubmFncXl1aG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDUzNiwiZXhwIjoyMDg4ODMwNTM2fQ.PfDWhneI1uC59ozTNKUNFrQQFiio5ePDhPoOg_qSMpQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function enrich() {
    console.log('📖 Carregando prostvita.sql...');
    const content = fs.readFileSync('prostvita.sql', 'utf8');

    console.log('🔍 Mapeando endereços no SQL...');
    const addressMap = new Map();
    const cityMap = new Map();
    const stateMap = new Map();
    const zipMap = new Map();
    const numberMap = new Map();
    const neighborhoodMap = new Map();

    // Regex para extrair post_id e meta_value de variados campos de endereço
    const metaRegex = /\(\d+,\s*(\d+),\s*'_billing_(address_1|city|state|postcode|number|neighborhood)',\s*'(.*?)'\)/g;
    
    let metaMatch;
    while ((metaMatch = metaRegex.exec(content)) !== null) {
        const orderId = metaMatch[1];
        const key = metaMatch[2];
        const value = metaMatch[3];

        if (key === 'address_1') addressMap.set(orderId, value);
        if (key === 'city') cityMap.set(orderId, value);
        if (key === 'state') stateMap.set(orderId, value);
        if (key === 'postcode') zipMap.set(orderId, value);
        if (key === 'number') numberMap.set(orderId, value);
        if (key === 'neighborhood') neighborhoodMap.set(orderId, value);
    }

    console.log(`✅ Dados mapeados: ${addressMap.size} endereços encontrados no SQL.`);

    console.log('🔍 Buscando clientes sem endereço no Supabase...');
    const { data: customers, error: custError } = await supabase
        .from('crm_customers')
        .select('id, name')
        .or('address.is.null,address.eq.""');

    if (custError) {
        console.error('Erro ao buscar clientes:', custError.message);
        return;
    }

    console.log(`📦 Encontrados ${customers.length} clientes para enriquecer.`);

    if (customers.length === 0) {
        console.log('✅ Todos os clientes já possuem endereço.');
        return;
    }

    // Buscar vendas para esses clientes para obter o Order ID
    const customerIds = customers.map(c => c.id);
    const { data: sales, error: salesError } = await supabase
        .from('crm_sales')
        .select('customer_id, notes')
        .in('customer_id', customerIds);

    if (salesError) {
        console.error('Erro ao buscar vendas:', salesError.message);
        return;
    }

    // Mapear customer_id -> Order ID (pegar o primeiro encontrado)
    const custToOrder = new Map();
    for (const sale of sales) {
        if (custToOrder.has(sale.customer_id)) continue;
        const orderMatch = sale.notes.match(/Pedido #(\d+)/);
        if (orderMatch) {
            custToOrder.set(sale.customer_id, orderMatch[1]);
        }
    }

    console.log(`🎯 Mapeados ${custToOrder.size} clientes com Order IDs para consulta.`);

    let enrichedCount = 0;
    let errorCount = 0;

    for (const cust of customers) {
        const orderId = custToOrder.get(cust.id);
        if (!orderId) continue;

        const address_1 = addressMap.get(orderId);
        const city = cityMap.get(orderId);
        const state = stateMap.get(orderId);
        const zip_code = zipMap.get(orderId);
        const address_number = numberMap.get(orderId);
        const neighborhood = neighborhoodMap.get(orderId);

        if (!address_1 && !city) continue;

        // Compor endereço se tiver bairro
        const fullAddress = neighborhood ? `${address_1} - ${neighborhood}` : address_1;

        const payload = {
            address: fullAddress || null,
            address_number: address_number || null,
            city: city || null,
            state: state || null,
            zip_code: zip_code || null
        };

        const { error: updateError } = await supabase
            .from('crm_customers')
            .update(payload)
            .eq('id', cust.id);

        if (updateError) {
            console.error(`❌ Erro ao atualizar cliente ${cust.name}:`, updateError.message);
            errorCount++;
        } else {
            enrichedCount++;
            if (enrichedCount % 50 === 0) console.log(`⏳ Progresso: ${enrichedCount} atualizados...`);
        }
    }

    console.log('\n--- Resultado Final ---');
    console.log(`✅ Sucesso: ${enrichedCount}`);
    console.log(`❌ Falhas: ${errorCount}`);
    console.log('-----------------------');
}

enrich();
