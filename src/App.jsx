import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import ProductForm from './components/ProductForm'
import ProductList from './components/ProductList'
import CustomerForm from './components/CustomerForm'
import CustomerList from './components/CustomerList'
import SaleForm from './components/SaleForm'
import SaleList from './components/SaleList'
import Dashboard from './components/Dashboard'
import Statistics from './components/Statistics'

const ADMIN_NAME = 'Wilson'

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',    icon: '📊' },
  { id: 'sales',       label: 'Vendas',        icon: '💰' },
  { id: 'customers',   label: 'Clientes',      icon: '👥' },
  { id: 'products',    label: 'Produtos',      icon: '🏷️' },
  { id: 'statistics',  label: 'Estatísticas',  icon: '📈' },
]

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showSaleForm, setShowSaleForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingPayment: 0,
    toShip: 0,
    totalCustomers: 0,
    totalProducts: 0,
    paidSales: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      const [{ data: sales }, { count: customerCount }, { count: productCount }] = await Promise.all([
        supabase.from('crm_sales').select('*'),
        supabase.from('crm_customers').select('*', { count: 'exact', head: true }),
        supabase.from('crm_products').select('*', { count: 'exact', head: true }),
      ])
      if (sales) {
        const total   = sales.reduce((sum, s) => sum + Number(s.total_amount), 0)
        const pending = sales.filter(s => ['Fiado', 'Parcelado'].includes(s.payment_status)).reduce((sum, s) => sum + Number(s.total_amount), 0)
        const paid    = sales.filter(s => s.payment_status === 'Pago').reduce((sum, s) => sum + Number(s.total_amount), 0)
        const shipping = sales.filter(s => s.delivery_status === 'Pendente').length
        setStats({
          totalSales: total,
          pendingPayment: pending,
          paidSales: paid,
          toShip: shipping,
          totalCustomers: customerCount || 0,
          totalProducts: productCount || 0,
        })
      }
    }
    fetchStats()
  }, [refreshKey, currentPage])

  const handleRefresh = () => setRefreshKey(prev => prev + 1)

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer)
    setShowCustomerForm(true)
  }

  const handleCustomerSaved = () => {
    setShowCustomerForm(false)
    setEditingCustomer(null)
    handleRefresh()
  }

  const handleCustomerCancel = () => {
    setShowCustomerForm(false)
    setEditingCustomer(null)
  }

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setShowProductForm(true)
  }

  const handleProductSaved = () => {
    setShowProductForm(false)
    setEditingProduct(null)
    handleRefresh()
  }

  const handleProductCancel = () => {
    setShowProductForm(false)
    setEditingProduct(null)
  }

  const navigateTo = (page) => {
    setCurrentPage(page)
    setShowProductForm(false)
    setShowCustomerForm(false)
    setShowSaleForm(false)
    setEditingCustomer(null)
    setEditingProduct(null)
  }

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

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--glass-border)',
          paddingTop: '1rem',
          marginTop: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingLeft: '0.25rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {ADMIN_NAME[0]}
            </div>
            <div className="sidebar-footer-text">
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>{ADMIN_NAME}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Administrador</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-content">
        {currentPage === 'dashboard' && <Dashboard stats={stats} />}
        {currentPage === 'statistics' && <Statistics />}

        {currentPage === 'products' && (
          <div className="fade-in">
            <div className="page-header">
              <div>
                <h1>Produtos</h1>
                <p>Catálogo, preços e estoque.</p>
              </div>
              {!showProductForm && (
                <button className="btn btn-primary" onClick={() => setShowProductForm(true)}>
                  + Novo Produto
                </button>
              )}
            </div>
            {showProductForm
              ? <ProductForm product={editingProduct} onSave={handleProductSaved} onCancel={handleProductCancel} />
              : <ProductList key={`prods-${refreshKey}`} onEdit={handleEditProduct} />}
          </div>
        )}

        {currentPage === 'customers' && (
          <div className="fade-in">
            <div className="page-header">
              <div>
                <h1>Clientes</h1>
                <p>Contatos, endereços e histórico.</p>
              </div>
              {!showCustomerForm && (
                <button className="btn btn-primary" onClick={() => setShowCustomerForm(true)}>
                  + Novo Cliente
                </button>
              )}
            </div>
            {showCustomerForm
              ? <CustomerForm customer={editingCustomer} onSave={handleCustomerSaved} onCancel={handleCustomerCancel} />
              : <CustomerList key={`custs-${refreshKey}`} onEdit={handleEditCustomer} />}
          </div>
        )}

        {currentPage === 'sales' && (
          <div className="fade-in">
            <div className="page-header">
              <div>
                <h1>Vendas</h1>
                <p>Controle de despacho e cobranças.</p>
              </div>
              {!showSaleForm && (
                <button className="btn btn-primary" onClick={() => setShowSaleForm(true)}>
                  + Nova Venda
                </button>
              )}
            </div>
            {showSaleForm
              ? <SaleForm onSave={() => { setShowSaleForm(false); handleRefresh() }} onCancel={() => setShowSaleForm(false)} />
              : <SaleList key={`sales-${refreshKey}`} onUpdate={handleRefresh} />}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
