import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Statistics() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        cities: [],
        states: [],
        products: [],
        customers: [],
        monthlySales: []
    })

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)
            try {
                const { data: sales, error } = await supabase
                    .from('crm_sales')
                    .select('*, crm_customers(*)')
                    .order('created_at', { ascending: true })

                if (error) throw error

                // Processamento de Dados
                const cityStats = {}
                const stateStats = {}
                const productStats = {}
                const customerStats = {}
                const monthlyStats = {}

                sales.forEach(sale => {
                    const amount = Number(sale.total_amount)
                    const customer = sale.crm_customers

                    // Cidades e Estados
                    if (customer) {
                        if (customer.city) {
                            cityStats[customer.city] = (cityStats[customer.city] || 0) + amount
                        }
                        if (customer.state) {
                            const state = customer.state.toUpperCase()
                            stateStats[state] = (stateStats[state] || 0) + amount
                        }
                    }

                    // Produtos
                    if (sale.items && Array.isArray(sale.items)) {
                        sale.items.forEach(item => {
                            const productName = (item.name || item.description || 'Produto Indefinido').trim()
                            
                            // Ignorar frete e taxas
                            if (productName.toLowerCase().includes('frete') || 
                                productName.toLowerCase().includes('shipp') ||
                                productName.toLowerCase().includes('taxa')) return;

                            const qty = Number(item.quantity) || 1
                            productStats[productName] = (productStats[productName] || 0) + qty
                        })
                    }

                    // Clientes
                    if (customer) {
                        customerStats[customer.id] = {
                            name: customer.name,
                            total: (customerStats[customer.id]?.total || 0) + amount
                        }
                    }

                    // Mensal
                    const month = new Date(sale.created_at).toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
                    monthlyStats[month] = (monthlyStats[month] || 0) + amount
                })

                const sortAndSlice = (obj, isProduct = false) => 
                    Object.entries(obj)
                        .map(([key, value]) => ({ key, value }))
                        .sort((a, b) => b.value - (typeof a.value === 'object' ? a.value.total : a.value) - (b.value - (typeof a.value === 'object' ? a.value.total : a.value))) // Fix later
                
                // Correção do sort
                const sortedCities = Object.entries(cityStats).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5)
                const sortedStates = Object.entries(stateStats).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5)
                const sortedProducts = Object.entries(productStats).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5)
                const sortedCustomers = Object.values(customerStats).sort((a, b) => b.total - a.total).slice(0, 5)
                const sortedMonthly = Object.entries(monthlyStats).map(([month, total]) => ({ month, total }))

                setData({
                    cities: sortedCities,
                    states: sortedStates,
                    products: sortedProducts,
                    customers: sortedCustomers,
                    monthlySales: sortedMonthly
                })
            } catch (err) {
                console.error('Error fetching statistics:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Analisando dados estratégicos...</div>

    const maxCity = data.cities[0]?.total || 1
    const maxProd = data.products[0]?.qty || 1
    const maxCust = data.customers[0]?.total || 1

    return (
        <div className="fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
                <h1>Inteligência de Negócio</h1>
                <p style={{ color: 'var(--text-muted)' }}>Análise aprofundada de vendas, regiões e comportamento.</p>
            </header>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Ranking de Cidades */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📍 Cidades que mais Compram
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {data.cities.map((city, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                    <span>{city.name}</span>
                                    <span style={{ fontWeight: 600 }}>{fmt(city.total)}</span>
                                </div>
                                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${(city.total / maxCity) * 100}%`, 
                                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                                        transition: 'width 1s ease-out'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ranking de Produtos */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📦 Produtos Mais Vendidos (Volume)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {data.products.map((prod, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                    <span>{prod.name}</span>
                                    <span style={{ fontWeight: 600 }}>{prod.qty} un</span>
                                </div>
                                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${(prod.qty / maxProd) * 100}%`, 
                                        background: 'linear-gradient(90deg, #10b981, #34d399)',
                                        transition: 'width 1s ease-out'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ranking de Clientes */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        💎 Clientes VIP (Maior Faturamento)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {data.customers.map((cust, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                    <span>{cust.name}</span>
                                    <span style={{ fontWeight: 600 }}>{fmt(cust.total)}</span>
                                </div>
                                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${(cust.total / maxCust) * 100}%`, 
                                        background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                                        transition: 'width 1s ease-out'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Estados e Performance Mensal */}
                <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1.2rem' }}>🌍 Vendas por Estado</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {data.states.map((state, i) => (
                                    <div key={i} className="glass-card" style={{ padding: '0.75rem 1.25rem', textAlign: 'center', minWidth: '100px', background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{state.name}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmt(state.total)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 style={{ marginBottom: '1.2rem' }}>📈 Evolução Mensal</h3>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px', paddingBottom: '1rem' }}>
                                {data.monthlySales.slice(-6).map((m, i) => (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ 
                                            width: '100%', 
                                            height: `${(m.total / Math.max(...data.monthlySales.map(ms => ms.total))) * 100}%`,
                                            background: 'rgba(139, 92, 246, 0.3)',
                                            borderRadius: '4px',
                                            border: '1px solid var(--primary)',
                                            position: 'relative'
                                        }} title={fmt(m.total)}>
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.month}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
