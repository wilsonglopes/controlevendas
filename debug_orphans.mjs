import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sxsrlrxtfdnnagqyuhnh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c3Jscnh0ZmRubmFncXl1aG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDUzNiwiZXhwIjoyMDg4ODMwNTM2fQ.PfDWhneI1uC59ozTNKUNFrQQFiio5ePDhPoOg_qSMpQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debug() {
    console.log('--- Database Diagnostics ---');
    
    const { count: customerCount } = await supabase.from('crm_customers').select('*', { count: 'exact', head: true });
    console.log(`Clientes Cadastrados: ${customerCount}`);

    const { data: sales, error: salesError } = await supabase.from('crm_sales').select('id, customer_id, notes');
    if (salesError) {
        console.error('Erro ao buscar vendas:', salesError.message);
        return;
    }
    console.log(`Total de Vendas: ${sales.length}`);

    const salesWithoutCustomerId = sales.filter(s => !s.customer_id);
    console.log(`Vendas sem customer_id: ${salesWithoutCustomerId.length}`);

    // Pegar todos os IDs de clientes da tabela crm_customers
    const { data: customers } = await supabase.from('crm_customers').select('id');
    const customerIds = new Set(customers.map(c => c.id));

    const orphanedSales = sales.filter(s => s.customer_id && !customerIds.has(s.customer_id));
    console.log(`Vendas com customer_id INVÁLIDO (Órfãs): ${orphanedSales.length}`);

    if (orphanedSales.length > 0) {
        console.log('\nExemplo de Vendas Órfãs:');
        orphanedSales.slice(0, 10).forEach(s => {
            console.log(`ID Venda: ${s.id} | Notes: ${s.notes} | ID Cliente: ${s.customer_id}`);
        });
    }
}

debug();
