import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sxsrlrxtfdnnagqyuhnh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c3Jscnh0ZmRubmFncXl1aG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDUzNiwiZXhwIjoyMDg4ODMwNTM2fQ.PfDWhneI1uC59ozTNKUNFrQQFiio5ePDhPoOg_qSMpQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function importCustomers() {
    console.log('🔄 Forçando recarregamento do cache do banco de dados (Supabase)...');
    await supabase.rpc('exec', { sql: "NOTIFY pgrst, 'reload schema';" });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2s pro cache recarregar

    console.log('📖 Lendo arquivo Excel...');
    const fileStore = fs.readFileSync('Relatório_de_pedidos.xlsx');
    const workbook = XLSX.read(fileStore, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read raw data
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✅ ${rawData.length} linhas de pedidos encontradas.`);

    console.log('🔄 Processando clientes únicos...');
    const uniqueCustomersMap = new Map();
    
    rawData.forEach(row => {
        // Logzz might have empty fields or numbers for documents/phones
        const rawCpf = row['Documento'] ? String(row['Documento']).replace(/\D/g, '') : null;
        
        // Skip if no document or if we already have this customer (using CPF as unique key)
        if (!rawCpf || uniqueCustomersMap.has(rawCpf)) return;

        // Clean phone number
        const rawPhone = row['Telefone'] ? String(row['Telefone']).replace(/\D/g, '') : null;
        
        // Clean CEP
        const rawCep = row['CEP'] ? String(row['CEP']).replace(/\D/g, '') : null;

        // Build address string including complement if exists
        let address = row['End.'] || '';
        if (row['Complem.']) {
            address += ` - ${row['Complem.']}`;
        }

        const customer = {
            name: row['Cliente'] || 'Cliente Sem Nome',
            phone: rawPhone,
            email: row['Email'] || null,
            cpf: rawCpf,
            zip_code: rawCep,
            address: address || null,
            address_number: row['Núm.'] ? String(row['Núm.']) : null,
            bairro: row['Bairro'] || null,
            city: row['Cidade '] || null, // Note the space in the header log
            state: row['UF'] || null,
            notes: 'Importado da Logzz'
        };

        uniqueCustomersMap.set(rawCpf, customer);
    });

    const uniqueCustomers = Array.from(uniqueCustomersMap.values());
    console.log(`✅ Encontrados ${uniqueCustomers.length} clientes únicos para importar.`);

    console.log('\n🔎 Verificando no banco de dados quem já foi cadastrado...');
    
    let existingCpfs = new Set();
    const batchSize = 100;
    
    for (let i = 0; i < uniqueCustomers.length; i += batchSize) {
        const batch = uniqueCustomers.slice(i, i + batchSize);
        const batchCpfs = batch.map(c => c.cpf);
        
        const { data: existing, error } = await supabase
            .from('crm_customers')
            .select('cpf')
            .in('cpf', batchCpfs);
            
        if (error) {
            console.error('❌ Erro ao verificar clientes existentes:', error.message);
            process.exit(1);
        }
        
        if (existing) {
            existing.filter(r => r.cpf).forEach(r => existingCpfs.add(r.cpf));
        }
    }
    
    console.log(`ℹ️ ${existingCpfs.size} clientes já existem no banco e serão ignorados.`);

    // Filter out existing ones
    const customersToInsert = uniqueCustomers.filter(c => !existingCpfs.has(c.cpf));

    if (customersToInsert.length === 0) {
        console.log('✅ Nenhum cliente novo para importar. Finalizado.');
        return;
    }

    console.log(`🚀 Inserindo ${customersToInsert.length} novos clientes...`);
    
    let insertedCount = 0;
    for (let i = 0; i < customersToInsert.length; i += batchSize) {
        const batch = customersToInsert.slice(i, i + batchSize);
        
        const { error } = await supabase
            .from('crm_customers')
            .insert(batch);
            
        if (error) {
            console.error(`❌ Erro ao inserir lote (índice ${i}):`, error.message);
            process.exit(1);
        }
        insertedCount += batch.length;
        console.log(`➡️ Inseridos: ${insertedCount}/${customersToInsert.length}`);
    }

    console.log('\n🎉 Importação concluída com sucesso!');
}

importCustomers().catch(console.error);
