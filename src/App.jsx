import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import ProductForm from './components/ProductForm'
import ProductList from './components/ProductList'
import CustomerForm from './components/CustomerForm'
import CustomerList from './components/CustomerList'
import SaleForm from './components/SaleForm'
import SaleList from './components/SaleList'
import Dashboard from './components/Dashboard'
import Statistics from './components/Statistics'

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',   icon: '📊' },
  { id: 'sales',      label: 'Vendas',       icon: '💰' },
  { id: 'customers',  label: 'Clientes',     icon: '👥' },
  { id: 'products',   label: 'Produtos',     icon: '🏷️' },
  { id: 'statistics', label: 'Estatísticas', icon: '📈' },
]

function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [session, setSession] = useState(undefined) // undefined = carregando

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  // ── App ───────────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showSaleForm, setShowSaleForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [stats, setStats] = useState({
    totalSales: 0, pendingPayment: 0, toShip: 0,
    totalCustomers: 0, totalProducts: 0, paidSales: 0,
  })

  useEffect(() => {
    if (!session) return
    const fetchStats = async () => {
      const [{ data: sales }, { count: customerCount }, { count: productCount }] = await Promise.all([
        supabase.from('crm_sales').select('*'),
        supabase.from('crm_customers').select('*', { count: 'exact', head: true }),
        supabase.from('crm_products').select('*', { count: 'exact', head: true }),
      ])
      if (sales) {
        const total   = sales.reduce((s, x) => s + Number(x.total_amount), 0)
        const pending = sales.filter(s => ['Fiado', 'Parcelado'].includes(s.payment_status)).reduce((s, x) => s + Number(x.total_amount), 0)
        const paid    = sales.filter(s => s.payment_status === 'Pago').reduce((s, x) => s + Number(x.total_amount), 0)
        const toShip  = sales.filter(s => s.delivery_status === 'Pendente').length
        setStats({ totalSales: total, pendingPayment: pending, paidSales: paid, toShip, totalCustomers: customerCount || 0, totalProducts: productCount || 0 })
      }
    }
    fetchStats()
  }, [refreshKey, currentPage, session])

  const handleRefresh = () => setRefreshKey(p => p + 1)

  const handleEditCustomer = c => { setEditingCustomer(c); setShowCustomerForm(true) }
  const handleCustomerSaved = () => { setShowCustomerForm(false); setEditingCustomer(null); handleRefresh() }
  const handleCustomerCancel = () => { setShowCustomerForm(false); setEditingCustomer(null) }

  const handleEditProduct = p => { setEditingProduct(p); setShowProductForm(true) }
  const handleProductSaved = () => { setShowProductForm(false); setEditingProduct(null); handleRefresh() }
  const handleProductCancel = () => { setShowProductForm(false); setEditingProduct(null) }

  const navigateTo = page => {
    setCurrentPage(page)
    setShowProductForm(false); setShowCustomerForm(false)
    setShowSaleForm(false); setEditingCustomer(null); setEditingProduct(null)
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1rem',
      }}>
        <div className="spinner" style={{ width: '28px', height: '28px' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Carregando...</span>
      </div>
    )
  }

  // ── Não autenticado → tela de login ──────────────────────────────────────
  if (!session) return <Auth />

  // ── Usuário logado ────────────────────────────────────────────────────────
  const user = session.user
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
  const initials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '2rem', paddingLeft: '0.25rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            width: '30px', height: '30px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '1rem',
          }}>
            💎
          </div>
          <span className="logo-text" style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
            ControleVendas
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`btn btn-nav ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => navigateTo(item.id)}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Usuário + Logout */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '1rem' }}>
          {/* Info do usuário */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingLeft: '0.25rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700, color: 'white',
            }}>
              {initials}
            </div>
            <div className="sidebar-footer-text" style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>

          {/* Botão sair */}
          <button
            onClick={() => supabase.auth.signOut()}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.78rem', padding: '0.45rem 0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}
          >
            <span style={{ fontSize: '0.9rem' }}>↪</span>
            <span className="nav-text">Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-content">
        {currentPage === 'dashboard'  && <Dashboard stats={stats} user={user} />}
        {currentPage === 'statistics' && <Statistics />}

        {currentPage === 'products' && (
          <div className="fade-in">
            <div className="page-header">
              <div><h1>Produtos</h1><p>Catálogo, preços e estoque.</p></div>
              {!showProductForm && <button className="btn btn-primary" onClick={() => setShowProductForm(true)}>+ Novo Produto</button>}
            </div>
            {showProductForm
              ? <ProductForm product={editingProduct} onSave={handleProductSaved} onCancel={handleProductCancel} />
              : <ProductList key={`prods-${refreshKey}`} onEdit={handleEditProduct} />}
          </div>
        )}

        {currentPage === 'customers' && (
          <div className="fade-in">
            <div className="page-header">
              <div><h1>Clientes</h1><p>Contatos, endereços e histórico.</p></div>
              {!showCustomerForm && <button className="btn btn-primary" onClick={() => setShowCustomerForm(true)}>+ Novo Cliente</button>}
            </div>
            {showCustomerForm
              ? <CustomerForm customer={editingCustomer} onSave={handleCustomerSaved} onCancel={handleCustomerCancel} />
              : <CustomerList key={`custs-${refreshKey}`} onEdit={handleEditCustomer} />}
          </div>
        )}

        {currentPage === 'sales' && (
          <div className="fade-in">
            <div className="page-header">
              <div><h1>Vendas</h1><p>Controle de despacho e cobranças.</p></div>
              {!showSaleForm && <button className="btn btn-primary" onClick={() => setShowSaleForm(true)}>+ Nova Venda</button>}
            </div>
            {showSaleForm
              ? <SaleForm user={user} onSave={() => { setShowSaleForm(false); handleRefresh() }} onCancel={() => setShowSaleForm(false)} />
              : <SaleList key={`sales-${refreshKey}`} onUpdate={handleRefresh} />}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
