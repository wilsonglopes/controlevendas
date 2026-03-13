import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sxsrlrxtfdnnagqyuhnh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4c3Jscnh0ZmRubmFncXl1aG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDUzNiwiZXhwIjoyMDg4ODMwNTM2fQ.PfDWhneI1uC59ozTNKUNFrQQFiio5ePDhPoOg_qSMpQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAndAddColumn() {
    console.log('🔍 Verificando se a coluna zip_code existe...');
    const { data, error } = await supabase.from('crm_customers').select('zip_code').limit(1);
    
    if (error && error.message.includes('column "zip_code" does not exist')) {
        console.log('➕ Coluna não encontrada. Tentando adicionar...');
        const { error: alterError } = await supabase.rpc('exec', { sql: 'ALTER TABLE public.crm_customers ADD COLUMN zip_code TEXT;' });
        if (alterError) {
            console.error('❌ Erro ao adicionar coluna via RPC:', alterError.message);
            console.log('🔄 Tentando fallback via REST update (não recomendado para DDL)...');
            // Supabase REST doesn't support ALTER TABLE easily without RPC. 
            // If RPC fails, we might need the user to run the SQL in the dashboard.
        } else {
            console.log('✅ Coluna adicionada com sucesso.');
        }
    } else if (error) {
        console.error('❌ Erro inesperado:', error.message);
    } else {
        console.log('✅ A coluna zip_code já existe.');
    }
}

checkAndAddColumn();
