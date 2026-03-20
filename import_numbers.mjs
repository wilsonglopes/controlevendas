import { supabase } from './scripts-config.mjs'
import * as fs from 'fs'

async function run() {
  console.log('Reading wp_postmeta.sql...');
  const content = fs.readFileSync('wp_postmeta.sql', 'utf8');
  
  // Extract values using regex: (4619, 311, '_billing_number', '114')
  const regex = /\(\d+,\s*(\d+),\s*'_billing_number',\s*'([^']+)'\)/g;
  let match;
  const numbersMap = {}; // order_id -> number
  
  while ((match = regex.exec(content)) !== null) {
    const orderId = match[1];
    const number = match[2];
    numbersMap[orderId] = number;
  }
  
  console.log(`Found ${Object.keys(numbersMap).length} building numbers in SQL.`);
  
  const { data: sales, error: salesError } = await supabase.from('crm_sales').select('id, customer_id, notes');
  if (salesError) { return console.error(salesError); }
  
  let customersToUpdate = {};
  
  for (const sale of sales) {
    if (sale.notes && sale.notes.includes('Pedido #')) {
      const matchId = sale.notes.match(/Pedido #(\d+)/);
      if (matchId && matchId[1]) {
        const orderId = matchId[1];
        if (numbersMap[orderId] && sale.customer_id) {
          customersToUpdate[sale.customer_id] = numbersMap[orderId];
        }
      }
    }
  }
  
  console.log(`Found ${Object.keys(customersToUpdate).length} customers to update.`);
  
  let updated = 0;
  for (const [customerId, number] of Object.entries(customersToUpdate)) {
    const { error } = await supabase.from('crm_customers').update({ address_number: number }).eq('id', customerId);
    if (error) {
      console.error(`Failed to update customer ${customerId}:`, error);
    } else {
      updated++;
    }
  }
  
  console.log(`✅ ${updated} customers updated with address_number.`);
}

run();
