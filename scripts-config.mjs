/**
 * Configuração compartilhada para scripts de administração.
 *
 * Para executar qualquer script use:
 *   node --env-file=.env <script>.mjs
 *
 * O arquivo .env deve conter:
 *   SUPABASE_URL=https://xxxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJhbGciOi...
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error('\n❌  Credenciais não encontradas.')
  console.error('    Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env')
  console.error('    e execute com:  node --env-file=.env <script>.mjs\n')
  process.exit(1)
}

export const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})
