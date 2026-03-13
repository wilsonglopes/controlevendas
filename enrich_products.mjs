import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sxsrlrxtfdnnagqyuhnh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c3Jscnh0ZmRubmFncXl1aG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDUzNiwiZXhwIjoyMDg4ODMwNTM2fQ.PfDWhneI1uC59ozTNKUNFrQQFiio5ePDhPoOg_qSMpQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function enrichProducts() {
    console.log('📖 Carregando prostvita.sql...');
    const content = fs.readFileSync('prostvita.sql', 'utf8');

    console.log('🔍 Mapeando itens de pedido no SQL...');
    const orderItems = new Map();
    const itemQuantities = new Map();

    const itemsRegex = /\((\d+),\s*'(.*?)',\s*'line_item',\s*(\d+)\)/g;
    let itemMatch;
    while ((itemMatch = itemsRegex.exec(content)) !== null) {
        orderItems.set(itemMatch[1], { orderId: itemMatch[3], name: itemMatch[2] });
    }

    const qtyRegex = /\(\d+,\s*(\d+),\s*'_qty',\s*'(\d+)'\)/g;
    let qtyMatch;
    while ((qtyMatch = qtyRegex.exec(content)) !== null) {
        itemQuantities.set(qtyMatch[1], parseInt(qtyMatch[2]));
    }

    const orderToProducts = new Map();
    for (const [itemId, info] of orderItems.entries()) {
        const qty = itemQuantities.get(itemId) || 1;
        if (!orderToProducts.has(info.orderId)) {
            orderToProducts.set(info.orderId, []);
        }
        orderToProducts.get(info.orderId).push({ name: info.name, quantity: qty });
    }

    console.log('🔍 Buscando vendas que ainda precisam de correção...');
    const { data: sales, error } = await supabase
        .from('crm_sales')
        .select('id, notes, total_amount, items');

    if (error) {
        console.error('Erro ao buscar vendas:', error.message);
        return;
    }

    const entriesToUpdate = sales.filter(s => {
        // Apenas se tiver Pedido # no notes
        if (!s.notes || !s.notes.includes('Pedido #')) return false;

        // E se o item atual parecer genérico (ou seja, se a correção anterior falhou ou não foi feita)
        const firstItem = s.items?.[0]?.name || '';
        return firstItem.includes('item(s) do pedido') || !s.items || s.items.length === 0;
    }).map(sale => {
        const orderId = sale.notes.match(/Pedido #(\d+)/)?.[1];
        const realProducts = orderToProducts.get(orderId);
        if (realProducts && realProducts.length > 0) {
            const items = realProducts.map(p => ({
                name: p.name,
                quantity: p.quantity,
                price: sale.total_amount / realProducts.reduce((acc, curr) => acc + curr.quantity, 0)
            }));
            return { id: sale.id, items };
        }
        return null;
    }).filter(x => x !== null);

    console.log(`🚀 Retentativa para ${entriesToUpdate.length} vendas (batch de 10)...`);
    
    let updatedCount = 0;
    const batchSize = 10;

    for (let i = 0; i < entriesToUpdate.length; i += batchSize) {
        const batch = entriesToUpdate.slice(i, i + batchSize);
        await Promise.all(batch.map(async (entry) => {
            const { error: updateError } = await supabase
                .from('crm_sales')
                .update({ items: entry.items })
                .eq('id', entry.id);

            if (updateError) {
                console.error(`❌ Erro venda ${entry.id}:`, updateError.message);
            } else {
                updatedCount++;
            }
        }));
        if (i % 50 === 0) console.log(`⏳ Progresso: ${Math.min(i + batchSize, entriesToUpdate.length)}/${entriesToUpdate.length}...`);
    }

    console.log('\n--- Resultado Final ---');
    console.log(`✅ Sucesso: ${updatedCount} vendas corrigidas.`);
    console.log('-----------------------');
}

enrichProducts();
