import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sxsrlrxtfdnnagqyuhnh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c3Jscnh0ZmRubmFncXl1aG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDUzNiwiZXhwIjoyMDg4ODMwNTM2fQ.PfDWhneI1uC59ozTNKUNFrQQFiio5ePDhPoOg_qSMpQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importCpf() {
    console.log('📖 Lendo prostvita.sql...');
    const content = fs.readFileSync('prostvita.sql', 'utf8');

    // Regex para extrair post_id e billing_cpf do wp_postmeta
    // Ex: (4617, 311, '_billing_cpf', '41463943768')
    const cpfRegex = /\(\d+,\s*(\d+),\s*'_billing_cpf',\s*'(.*?)'\)/g;
    
    const cpfMap = new Map();
    let match;
    while ((match = cpfRegex.exec(content)) !== null) {
        cpfMap.set(match[1], match[2]); // post_id -> cpf
    }

    console.log(`✅ Encontrados ${cpfMap.size} CPFs únicos no SQL.`);

    if (cpfMap.size === 0) {
        console.log('❌ Nenhum CPF encontrado. Verifique o formato do SQL.');
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

    const customerCpfMap = new Map();
    for (const sale of sales) {
        if (!sale.notes || !sale.customer_id) continue;
        
        const orderMatch = sale.notes.match(/Pedido #(\d+)/);
        if (orderMatch) {
            const orderId = orderMatch[1];
            if (cpfMap.has(orderId)) {
                let cpf = cpfMap.get(orderId).replace(/\D/g, '');
                if (cpf.length === 11) {
                    cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                }
                customerCpfMap.set(sale.customer_id, cpf);
            }
        }
    }

    console.log(`🎯 Mapeados ${customerCpfMap.size} clientes com seus respectivos CPFs.`);

    if (customerCpfMap.size === 0) {
        console.log('⚠️ Nenhum mapeamento Order ID -> Customer ID encontrado.');
        return;
    }

    console.log('🚀 Atualizando crm_customers...');
    let updatedCount = 0;
    let errorCount = 0;

    const entries = Array.from(customerCpfMap.entries());
    for (let i = 0; i < entries.length; i += 50) {
        const batch = entries.slice(i, i + 50);
        await Promise.all(batch.map(async ([customerId, cpf]) => {
            const { error } = await supabase
                .from('crm_customers')
                .update({ cpf: cpf })
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

importCpf();
