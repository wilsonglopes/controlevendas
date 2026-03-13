# Controle de Vendas

Sistema de controle de vendas integrado com Supabase.

## 🚀 Como começar

### Pré-requisitos
- Node.js (v18+)
- Conta no Supabase

### Instalação

1. Clone o repositório:
   ```bash
   git clone <seu-repositorio>
   cd ControleVendas
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Copie o arquivo `.env.example` para `.env`:
     ```bash
     cp .env.example .env
     ```
   - Preencha o arquivo `.env` com suas credenciais do Supabase.

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 📦 Deploy no Netlify

1. Faça o commit e push do seu código para o GitHub.
2. No painel do Netlify, selecione "Import from Git".
3. Escolha seu repositório `ControleVendas`.
4. Configure as chaves de ambiente no Netlify (Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique em "Deploy site".

O arquivo `netlify.toml` já está configurado para lidar com as rotas do React/Vite.
