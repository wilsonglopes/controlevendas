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
    paidSales: 0
  })

  useEffect(() => {
    const fetchStats = async () => {
      const [{ data: sales }, { count: customerCount }, { count: productCount }] = await Promise.all([
        supabase.from('crm_sales').select('*'),
        supabase.from('crm_customers').select('*', { count: 'exact', head: true }),
        supabase.from('crm_products').select('*', { count: 'exact', head: true })
      ])
      if (sales) {
        const total = sales.reduce((sum, s) => sum + Number(s.total_amount), 0)
        const pending = sales.filter(s => ['Fiado', 'Parcelado'].includes(s.payment_status)).reduce((sum, s) => sum + Number(s.total_amount), 0)
        const paid = sales.filter(s => s.payment_status === 'Pago').reduce((sum, s) => sum + Number(s.total_amount), 0)
        const shipping = sales.filter(s => s.delivery_status === 'Pendente').length
        setStats({
          totalSales: total,
          pendingPayment: pending,
          paidSales: paid,
          toShip: shipping,
          totalCustomers: customerCount || 0,
          totalProducts: productCount || 0
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo" style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
          <span style={{ 
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
            width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <span style={{ fontSize: '1.2rem', color: 'white' }}>💎</span>
          </span>
          <span>ControleVendas</span>
        </div>

        <nav className="nav-links">
          <button className={`btn btn-nav ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
            <span style={{ marginRight: '12px' }}>📊</span> <span className="nav-text">Dashboard</span>
          </button>
          <button className={`btn btn-nav ${currentPage === 'sales' ? 'active' : ''}`} onClick={() => setCurrentPage('sales')}>
            <span style={{ marginRight: '12px' }}>💰</span> <span className="nav-text">Vendas</span>
          </button>
          <button className={`btn btn-nav ${currentPage === 'customers' ? 'active' : ''}`} onClick={() => setCurrentPage('customers')}>
            <span style={{ marginRight: '12px' }}>👥</span> <span className="nav-text">Clientes</span>
          </button>
          <button className={`btn btn-nav ${currentPage === 'products' ? 'active' : ''}`} onClick={() => setCurrentPage('products')}>
            <span style={{ marginRight: '12px' }}>🏷️</span> <span className="nav-text">Produtos</span>
          </button>
          <button className={`btn btn-nav ${currentPage === 'statistics' ? 'active' : ''}`} onClick={() => setCurrentPage('statistics')}>
            <span style={{ marginRight: '12px' }}>📈</span> <span className="nav-text">Estatísticas</span>
          </button>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <div className="glass-card" style={{ padding: '1rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ color: 'var(--text-muted)' }}>Versão Premium 1.0</p>
            <p style={{ fontWeight: 600 }}>Wilson Admin</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {currentPage === 'dashboard' && <Dashboard stats={stats} />}
        {currentPage === 'statistics' && <Statistics />}

        {currentPage === 'products' && (
          <div className="fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div><h1>Produtos</h1><p style={{ color: 'var(--text-muted)' }}>Estoque e preços.</p></div>
              {!showProductForm && <button className="btn btn-primary" onClick={() => setShowProductForm(true)}>+ Novo Produto</button>}
            </header>
            {showProductForm
              ? <ProductForm product={editingProduct} onSave={handleProductSaved} onCancel={handleProductCancel} />
              : <ProductList key={`prods-${refreshKey}`} onEdit={handleEditProduct} />}
          </div>
        )}

        {currentPage === 'customers' && (
          <div className="fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div><h1>Clientes</h1><p style={{ color: 'var(--text-muted)' }}>Contatos e logística.</p></div>
              {!showCustomerForm && <button className="btn btn-primary" onClick={() => setShowCustomerForm(true)}>+ Novo Cliente</button>}
            </header>
            {showCustomerForm
              ? <CustomerForm customer={editingCustomer} onSave={handleCustomerSaved} onCancel={handleCustomerCancel} />
              : <CustomerList key={`custs-${refreshKey}`} onEdit={handleEditCustomer} />}
          </div>
        )}

        {currentPage === 'sales' && (
          <div className="fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div><h1>Vendas</h1><p style={{ color: 'var(--text-muted)' }}>Controle de despacho e cobrança.</p></div>
              {!showSaleForm && <button className="btn btn-primary" onClick={() => setShowSaleForm(true)}>+ Nova Venda</button>}
            </header>
            {showSaleForm
              ? <SaleForm onSave={() => { setShowSaleForm(false); handleRefresh(); }} onCancel={() => setShowSaleForm(false)} />
              : <SaleList key={`sales-${refreshKey}`} onUpdate={handleRefresh} />}
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        table th { font-family: 'Outfit', sans-serif; color: var(--text-muted); font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; }
      `}} />
    </div>
  )
}

export default App
