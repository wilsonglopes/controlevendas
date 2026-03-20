import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Statistics() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        cities: [],
        states: [],
        products: [],
        customers: [],
        monthlySales: [],
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

                const cityStats = {}
                const stateStats = {}
                const productStats = {}
                const customerStats = {}
                const monthlyStats = {}

                sales.forEach(sale => {
                    const amount = Number(sale.total_amount)
                    const customer = sale.crm_customers

                    if (customer) {
                        if (customer.city) cityStats[customer.city] = (cityStats[customer.city] || 0) + amount
                        if (customer.state) {
                            const st = customer.state.toUpperCase()
                            stateStats[st] = (stateStats[st] || 0) + amount
                        }
                        customerStats[customer.id] = {
                            name: customer.name,
                            total: (customerStats[customer.id]?.total || 0) + amount,
                        }
                    }

                    if (sale.items && Array.isArray(sale.items)) {
                        sale.items.forEach(item => {
                            const productName = (item.name || item.description || 'Produto Indefinido').trim()
                            if (
                                productName.toLowerCase().includes('frete') ||
                                productName.toLowerCase().includes('shipp') ||
                                productName.toLowerCase().includes('taxa')
                            ) return
                            const qty = Number(item.quantity) || 1
                            productStats[productName] = (productStats[productName] || 0) + qty
                        })
                    }

                    const month = new Date(sale.created_at).toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
                    monthlyStats[month] = (monthlyStats[month] || 0) + amount
                })

                const sortedCities    = Object.entries(cityStats).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5)
                const sortedStates    = Object.entries(stateStats).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 6)
                const sortedProducts  = Object.entries(productStats).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5)
                const sortedCustomers = Object.values(customerStats).sort((a, b) => b.total - a.total).slice(0, 5)
                const sortedMonthly   = Object.entries(monthlyStats).map(([month, total]) => ({ month, total }))

                setData({
                    cities: sortedCities,
                    states: sortedStates,
                    products: sortedProducts,
                    customers: sortedCustomers,
                    monthlySales: sortedMonthly,
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

    if (loading) return (
        <div className="loading-state" style={{ padding: '4rem' }}>
            <div className="spinner" style={{ width: '24px', height: '24px' }} />
            Analisando dados estratégicos...
        </div>
    )

    const maxCity = data.cities[0]?.total || 1
    const maxProd = data.products[0]?.qty || 1
    const maxCust = data.customers[0]?.total || 1
    const maxMonth = Math.max(...data.monthlySales.map(m => m.total), 1)

    const RankingBar = ({ label, value, max, fmt: fmtFn, color, suffix }) => (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{label}</span>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>{fmtFn ? fmtFn(value) : `${value}${suffix || ''}`}</span>
            </div>
            <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: `${(value / max) * 100}%`,
                    background: color,
                    borderRadius: '3px',
                    transition: 'width 1s ease-out',
                }} />
            </div>
        </div>
    )

    return (
        <div className="fade-in">
            <header style={{ marginBottom: '2rem' }}>
                <h1>Inteligência de Negócio</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Análise de vendas, regiões e comportamento.
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

                {/* Cidades */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📍 Cidades que mais Compram
                    </h3>
                    {data.cities.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados suficientes.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.cities.map((city, i) => (
                                <RankingBar
                                    key={i}
                                    label={city.name}
                                    value={city.total}
                                    max={maxCity}
                                    fmt={fmt}
                                    color="linear-gradient(90deg, var(--primary), var(--secondary))"
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Produtos */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📦 Produtos Mais Vendidos
                    </h3>
                    {data.products.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados suficientes.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.products.map((prod, i) => (
                                <RankingBar
                                    key={i}
                                    label={prod.name}
                                    value={prod.qty}
                                    max={maxProd}
                                    suffix=" un"
                                    color="linear-gradient(90deg, #10b981, #34d399)"
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Clientes VIP */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        💎 Clientes VIP
                    </h3>
                    {data.customers.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados suficientes.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.customers.map((cust, i) => (
                                <RankingBar
                                    key={i}
                                    label={cust.name}
                                    value={cust.total}
                                    max={maxCust}
                                    fmt={fmt}
                                    color="linear-gradient(90deg, #f59e0b, #fbbf24)"
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Estados + Mensal */}
                <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                        {/* Estados */}
                        <div>
                            <h3 style={{ marginBottom: '1.25rem' }}>🗺️ Vendas por Estado</h3>
                            {data.states.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados suficientes.</p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                    {data.states.map((state, i) => (
                                        <div key={i} className="glass-card" style={{ padding: '0.7rem 1rem', textAlign: 'center', minWidth: '90px', background: 'rgba(255,255,255,0.03)' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit' }}>
                                                {state.name}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                {fmt(state.total)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Evolução Mensal */}
                        <div>
                            <h3 style={{ marginBottom: '1.25rem' }}>📈 Evolução Mensal</h3>
                            {data.monthlySales.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados suficientes.</p>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: '130px', paddingBottom: '1.5rem' }}>
                                    {data.monthlySales.slice(-8).map((m, i, arr) => {
                                        const isLast = i === arr.length - 1
                                        const pct = (m.total / maxMonth) * 100
                                        return (
                                            <div
                                                key={i}
                                                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}
                                                title={fmt(m.total)}
                                            >
                                                <div style={{
                                                    width: '100%',
                                                    height: `${Math.max(pct, 4)}%`,
                                                    background: isLast
                                                        ? 'linear-gradient(180deg, var(--primary), rgba(139,92,246,0.4))'
                                                        : 'rgba(139, 92, 246, 0.25)',
                                                    borderRadius: '4px 4px 2px 2px',
                                                    border: `1px solid ${isLast ? 'var(--primary)' : 'rgba(139,92,246,0.3)'}`,
                                                    transition: 'height 0.5s ease-out',
                                                    cursor: 'default',
                                                }} />
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', transform: 'rotate(-20deg)', transformOrigin: 'center top' }}>
                                                    {m.month}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
