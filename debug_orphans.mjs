import { supabase } from './scripts-config.mjs'

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
