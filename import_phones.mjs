import { supabase } from './scripts-config.mjs'
import * as fs from 'fs'

async function run() {
  console.log('Reading wp_postmeta_billing_phone.sql...');
  const content = fs.readFileSync('wp_postmeta_billing_phone.sql', 'utf8');
  
  // Example SQL line: (4597, 311, '_billing_phone', '(55) 48984-6197'),
  // We need to capture the post_id (311) and the value ('(55) 48984-6197')
  const regex = /\(\d+,\s*(\d+),\s*'_billing_phone',\s*'([^']+)'\)/g;
  let match;
  const phonesMap = {}; // order_id -> phone
  
  while ((match = regex.exec(content)) !== null) {
    const orderId = match[1];
    const phoneNum = match[2];
    phonesMap[orderId] = phoneNum;
  }
  
  console.log(`Found ${Object.keys(phonesMap).length} phone numbers in SQL dump.`);
  
  // Getting all sales to map order_id to customer_id
  const { data: sales, error: salesError } = await supabase.from('crm_sales').select('id, customer_id, notes');
  if (salesError) { return console.error(salesError); }
  
  // Mapping customer_id -> phone (from Woo)
  let customerPhones = {};
  for (const sale of sales) {
    if (sale.notes && sale.notes.includes('Pedido #')) {
      const matchId = sale.notes.match(/Pedido #(\d+)/);
      if (matchId && matchId[1]) {
        const orderId = matchId[1];
        if (phonesMap[orderId] && sale.customer_id) {
            customerPhones[sale.customer_id] = phonesMap[orderId];
        }
      }
    }
  }
  
  console.log(`Mapped phones to ${Object.keys(customerPhones).length} unique customers based on sales.`);
  
  // Getting all customers to see who has a missing phone
  const { data: customers, error: custError } = await supabase.from('crm_customers').select('id, phone');
  if (custError) { return console.error(custError); }
  
  let countUpdated = 0;
  
  for (const customer of customers) {
    // If the customer does NOT have a phone, OR if the phone is basically empty
    if (!customer.phone || customer.phone.trim() === '') {
        const newPhone = customerPhones[customer.id];
        if (newPhone) {
            const { error } = await supabase.from('crm_customers')
                .update({ phone: newPhone })
                .eq('id', customer.id);
            if (error) {
                console.error(`Failed to update customer ${customer.id}`, error);
            } else {
                countUpdated++;
            }
        }
    }
  }
  
  console.log(`✅ Successfully updated ${countUpdated} missing phone numbers in crm_customers.`);
}

run();
