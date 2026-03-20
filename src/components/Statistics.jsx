import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── Donut Chart (SVG puro) ───────────────────────────────────────────────────
function DonutChart({ segments, size = 130, thickness = 24 }) {
    const r = (size - thickness) / 2
    const cx = size / 2
    const cy = size / 2
    const circumference = 2 * Math.PI * r

    const total = segments.reduce((s, seg) => s + seg.value, 0)
    if (total === 0) return null

    let cumulativePct = 0
    const slices = segments.map(seg => {
        const pct = seg.value / total
        const dash = pct * circumference
        const dashOffset = -(cumulativePct * circumference)
        cumulativePct += pct
        return { ...seg, dash, gap: circumference - dash, dashOffset }
    })

    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={cx} cy={cy} r={r} fill="none"
                stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
            {slices.map((s, i) => (
                <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                    stroke={s.color} strokeWidth={thickness - 2}
                    strokeDasharray={`${s.dash - 2} ${circumference - s.dash + 2}`}
                    strokeDashoffset={s.dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
                />
            ))}
        </svg>
    )
}

// ── Area / Line Chart (SVG puro) ─────────────────────────────────────────────
function AreaChart({ data }) {
    const W = 640, H = 200
    const padL = 56, padR = 20, padT = 20, padB = 44
    const chartW = W - padL - padR
    const chartH = H - padT - padB

    const maxVal = Math.max(...data.map(d => d.total), 1)
    const pts = data.map((d, i) => ({
        x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
        y: padT + chartH - (d.total / maxVal) * chartH,
        ...d,
    }))

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padT + chartH).toFixed(1)} Z`

    const fmtK = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)
    const gridLines = [0, 0.25, 0.5, 0.75, 1]

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
            <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* Grid */}
            {gridLines.map((pct, i) => {
                const y = padT + chartH * pct
                return (
                    <g key={i}>
                        <line x1={padL} y1={y} x2={padL + chartW} y2={y}
                            stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                            strokeDasharray={i === 0 ? 'none' : '3 6'} />
                        <text x={padL - 8} y={y + 4} textAnchor="end"
                            fontSize="9.5" fill="rgba(255,255,255,0.3)" fontFamily="Inter, sans-serif">
                            {fmtK(maxVal * (1 - pct))}
                        </text>
                    </g>
                )
            })}

            {/* Area fill */}
            <path d={areaPath} fill="url(#areaFill)" />

            {/* Glow line (background) */}
            <path d={linePath} fill="none" stroke="url(#lineStroke)"
                strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                strokeOpacity="0.15" />

            {/* Main line */}
            <path d={linePath} fill="none" stroke="url(#lineStroke)"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Points + labels */}
            {pts.map((p, i) => {
                const isLast = i === pts.length - 1
                const isHigh = p.total === maxVal
                const showLabel = isLast || isHigh

                return (
                    <g key={i}>
                        {/* Vertical guide line on last */}
                        {isLast && (
                            <line x1={p.x} y1={padT} x2={p.x} y2={padT + chartH}
                                stroke="rgba(236,72,153,0.2)" strokeWidth="1" strokeDasharray="4 4" />
                        )}

                        {/* Value label */}
                        {showLabel && (
                            <text x={p.x} y={p.y - 12} textAnchor="middle"
                                fontSize="10" fill={isLast ? '#ec4899' : '#8b5cf6'}
                                fontWeight="700" fontFamily="Outfit, sans-serif">
                                {fmtK(p.total)}
                            </text>
                        )}

                        {/* Outer ring */}
                        <circle cx={p.x} cy={p.y} r={isLast ? 7 : 4}
                            fill={isLast ? 'rgba(236,72,153,0.15)' : 'rgba(139,92,246,0.1)'}
                            stroke="none" />
                        {/* Dot */}
                        <circle cx={p.x} cy={p.y}
                            r={isLast ? 4.5 : 3}
                            fill={isLast ? '#ec4899' : '#8b5cf6'}
                            stroke={isLast ? 'rgba(236,72,153,0.4)' : 'rgba(139,92,246,0.4)'}
                            strokeWidth={isLast ? 3 : 2}
                        />

                        {/* Month label */}
                        <text x={p.x} y={padT + chartH + 22} textAnchor="middle"
                            fontSize="9.5" fill="rgba(255,255,255,0.32)" fontFamily="Inter, sans-serif"
                            style={{ userSelect: 'none' }}>
                            {p.month}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accentColor, delay }) {
    return (
        <div className="glass-card dashboard-fade card-stagger" style={{
            animationDelay: delay,
            borderTop: `2px solid ${accentColor}`,
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Glow spot */}
            <div style={{
                position: 'absolute', top: '-20px', left: '-20px',
                width: '80px', height: '80px',
                background: accentColor, opacity: 0.06, borderRadius: '50%',
                pointerEvents: 'none',
            }} />
            <div style={{ fontSize: '1.5rem', marginBottom: '0.65rem' }}>{icon}</div>
            <div style={{
                fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '0.3rem',
            }}>
                {label}
            </div>
            <div style={{
                fontSize: '1.55rem', fontWeight: 800, fontFamily: 'Outfit',
                lineHeight: 1.1, color: 'var(--text-main)',
            }}>
                {value}
            </div>
            {sub && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    {sub}
                </div>
            )}
        </div>
    )
}

// ── Ranking Bar ───────────────────────────────────────────────────────────────
function RankingBar({ label, value, max, fmt: fmtFn, suffix, color, rank }) {
    const medals = ['🥇', '🥈', '🥉']
    const pct = Math.max(Math.round((value / max) * 100), 2)

    return (
        <div>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '0.4rem', gap: '0.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>
                        {medals[rank] || `${rank + 1}.`}
                    </span>
                    <span style={{
                        fontSize: '0.82rem', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {label}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                    <span style={{
                        fontSize: '0.68rem', color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.1rem 0.4rem', borderRadius: '4px',
                    }}>
                        {pct}%
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                        {fmtFn ? fmtFn(value) : `${value}${suffix || ''}`}
                    </span>
                </div>
            </div>
            <div style={{
                height: '6px', background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px', overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%', width: `${pct}%`,
                    background: color, borderRadius: '4px',
                    transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                }} />
            </div>
        </div>
    )
}

// ── Donut Legend ─────────────────────────────────────────────────────────────
function DonutLegend({ segments, total, fmt: fmtFn }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', justifyContent: 'center', flex: 1 }}>
            {segments.map((s, i) => {
                const pct = total ? Math.round((s.value / total) * 100) : 0
                return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                            width: '10px', height: '10px', borderRadius: '3px',
                            background: s.color, flexShrink: 0,
                        }} />
                        <span style={{ fontSize: '0.82rem', flex: 1, color: 'var(--text-light)' }}>
                            {s.label}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                            {fmtFn ? fmtFn(s.value) : s.value}
                        </span>
                        <div style={{
                            fontSize: '0.7rem', color: s.color, fontWeight: 700,
                            background: `${s.color}18`,
                            border: `1px solid ${s.color}30`,
                            borderRadius: '4px', padding: '0.1rem 0.4rem',
                            minWidth: '38px', textAlign: 'center',
                        }}>
                            {pct}%
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Statistics() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        cities: [], states: [], products: [],
        customers: [], monthlySales: [],
        paymentStatus: [], deliveryStatus: [],
        totalRevenue: 0, totalSales: 0, avgTicket: 0, topState: '—',
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

                const cityStats = {}, stateStats = {}, productStats = {}
                const customerStats = {}, monthlyStats = {}
                const paymentStats = {}, deliveryStats = {}
                let totalRevenue = 0
                const totalSales = sales.length

                sales.forEach(sale => {
                    const amount = Number(sale.total_amount)
                    totalRevenue += amount
                    const customer = sale.crm_customers

                    // Payment & delivery buckets
                    const ps = sale.payment_status || 'Indefinido'
                    const ds = sale.delivery_status || 'Indefinido'
                    paymentStats[ps] = (paymentStats[ps] || 0) + amount
                    deliveryStats[ds] = (deliveryStats[ds] || 0) + 1

                    if (customer) {
                        if (customer.city)  cityStats[customer.city] = (cityStats[customer.city] || 0) + amount
                        if (customer.state) {
                            const st = customer.state.toUpperCase()
                            stateStats[st] = (stateStats[st] || 0) + amount
                        }
                        const cid = customer.id
                        customerStats[cid] = {
                            name: customer.name,
                            total: (customerStats[cid]?.total || 0) + amount,
                            count: (customerStats[cid]?.count || 0) + 1,
                        }
                    }

                    if (Array.isArray(sale.items)) {
                        sale.items.forEach(item => {
                            const name = (item.name || item.description || 'Produto Indefinido').trim()
                            if (['frete', 'shipp', 'taxa'].some(x => name.toLowerCase().includes(x))) return
                            productStats[name] = (productStats[name] || 0) + (Number(item.quantity) || 1)
                        })
                    }

                    const month = new Date(sale.created_at)
                        .toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
                    monthlyStats[month] = (monthlyStats[month] || 0) + amount
                })

                const sortedCities    = Object.entries(cityStats).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5)
                const sortedStates    = Object.entries(stateStats).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 6)
                const sortedProducts  = Object.entries(productStats).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5)
                const sortedCustomers = Object.values(customerStats).sort((a, b) => b.total - a.total).slice(0, 5)
                const sortedMonthly   = Object.entries(monthlyStats).map(([month, total]) => ({ month, total }))

                const paymentColors  = { Pago: '#10b981', Fiado: '#ef4444', Parcelado: '#f59e0b' }
                const deliveryColors = { Pendente: '#f59e0b', Enviado: '#3b82f6', Entregue: '#10b981' }

                const paymentSegments = Object.entries(paymentStats)
                    .map(([label, value]) => ({ label, value, color: paymentColors[label] || '#64748b' }))
                    .sort((a, b) => b.value - a.value)

                const deliverySegments = Object.entries(deliveryStats)
                    .map(([label, value]) => ({ label, value, color: deliveryColors[label] || '#64748b' }))
                    .sort((a, b) => b.value - a.value)

                setData({
                    cities: sortedCities, states: sortedStates,
                    products: sortedProducts, customers: sortedCustomers,
                    monthlySales: sortedMonthly,
                    paymentStatus: paymentSegments, deliveryStatus: deliverySegments,
                    totalRevenue, totalSales,
                    avgTicket: totalSales > 0 ? totalRevenue / totalSales : 0,
                    topState: sortedStates[0]?.name || '—',
                })
            } catch (err) {
                console.error('Error fetching statistics:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    const fmt  = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    const fmtK = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)

    if (loading) return (
        <div className="loading-state" style={{ padding: '4rem' }}>
            <div className="spinner" style={{ width: '24px', height: '24px' }} />
            Analisando dados estratégicos...
        </div>
    )

    const maxCity  = data.cities[0]?.total || 1
    const maxProd  = data.products[0]?.qty  || 1
    const maxCust  = data.customers[0]?.total || 1
    const payTotal = data.paymentStatus.reduce((s, x) => s + x.value, 0)
    const delTotal = data.deliveryStatus.reduce((s, x) => s + x.value, 0)

    return (
        <div className="fade-in">
            {/* ── Header ── */}
            <header style={{ marginBottom: '2rem' }}>
                <h1>Inteligência de Negócio</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Análise completa de vendas, regiões e comportamento.
                </p>
            </header>

            {/* ── KPI Cards ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem', marginBottom: '1.5rem',
            }}>
                <KpiCard icon="💰" label="Total Faturado"    value={fmtK(data.totalRevenue)} sub="em todas as vendas"   accentColor="#8b5cf6" delay="0.05s" />
                <KpiCard icon="🛒" label="Total de Vendas"   value={data.totalSales}          sub="pedidos registrados"  accentColor="#06b6d4" delay="0.10s" />
                <KpiCard icon="🎯" label="Ticket Médio"      value={fmt(data.avgTicket)}      sub="por pedido"           accentColor="#ec4899" delay="0.15s" />
                <KpiCard icon="🗺️" label="Estado #1"         value={data.topState}            sub={data.states[0] ? fmt(data.states[0].total) : ''} accentColor="#10b981" delay="0.20s" />
            </div>

            {/* ── Rankings ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.25rem', marginBottom: '1.25rem',
            }}>
                {/* Cidades */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📍 Cidades que mais Compram
                    </h3>
                    {data.cities.length === 0
                        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados suficientes.</p>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            {data.cities.map((city, i) => (
                                <RankingBar key={i} rank={i}
                                    label={city.name} value={city.total}
                                    max={maxCity} fmt={fmt}
                                    color="linear-gradient(90deg, var(--primary), var(--secondary))"
                                />
                            ))}
                        </div>
                    }
                </div>

                {/* Produtos */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📦 Produtos Mais Vendidos
                    </h3>
                    {data.products.length === 0
                        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados suficientes.</p>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            {data.products.map((prod, i) => (
                                <RankingBar key={i} rank={i}
                                    label={prod.name} value={prod.qty}
                                    max={maxProd} suffix=" un"
                                    color="linear-gradient(90deg, #10b981, #34d399)"
                                />
                            ))}
                        </div>
                    }
                </div>

                {/* Clientes VIP */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        💎 Clientes VIP
                    </h3>
                    {data.customers.length === 0
                        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados suficientes.</p>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            {data.customers.map((cust, i) => (
                                <RankingBar key={i} rank={i}
                                    label={cust.name} value={cust.total}
                                    max={maxCust} fmt={fmt}
                                    color="linear-gradient(90deg, #f59e0b, #fbbf24)"
                                />
                            ))}
                        </div>
                    }
                </div>
            </div>

            {/* ── Donuts ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.25rem', marginBottom: '1.25rem',
            }}>
                {/* Payment Donut */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem' }}>💳 Status de Pagamento</h3>
                    {data.paymentStatus.length === 0
                        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados.</p>
                        : <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <DonutChart segments={data.paymentStatus} size={130} thickness={24} />
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    pointerEvents: 'none',
                                }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'Outfit' }}>
                                        {fmtK(payTotal)}
                                    </div>
                                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>total</div>
                                </div>
                            </div>
                            <DonutLegend segments={data.paymentStatus} total={payTotal} fmt={fmt} />
                        </div>
                    }
                </div>

                {/* Delivery Donut */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem' }}>🚚 Status de Entregas</h3>
                    {data.deliveryStatus.length === 0
                        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados.</p>
                        : <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <DonutChart segments={data.deliveryStatus} size={130} thickness={24} />
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    pointerEvents: 'none',
                                }}>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'Outfit' }}>
                                        {delTotal}
                                    </div>
                                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>pedidos</div>
                                </div>
                            </div>
                            <DonutLegend segments={data.deliveryStatus} total={delTotal} />
                        </div>
                    }
                </div>
            </div>

            {/* ── Gráfico Mensal + Estados ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '1.25rem',
            }}>
                {/* Monthly Chart */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem' }}>📈 Evolução Mensal de Receita</h3>
                    {data.monthlySales.length === 0
                        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados suficientes.</p>
                        : <AreaChart data={data.monthlySales.slice(-12)} />
                    }
                </div>

                {/* States */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.25rem' }}>🗺️ Vendas por Estado</h3>
                    {data.states.length === 0
                        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados suficientes.</p>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.states.map((state, i) => {
                                const stateColors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
                                const c = stateColors[i] || '#64748b'
                                const pct = Math.round((state.total / data.states[0].total) * 100)
                                return (
                                    <div key={i}>
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', marginBottom: '0.35rem',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{
                                                    width: '8px', height: '8px', borderRadius: '2px',
                                                    background: c, flexShrink: 0,
                                                }} />
                                                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: c }}>
                                                    {state.name}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '0.68rem', color: c, fontWeight: 700,
                                                    background: `${c}18`, border: `1px solid ${c}30`,
                                                    borderRadius: '4px', padding: '0.1rem 0.35rem',
                                                }}>
                                                    {pct}%
                                                </span>
                                                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                                    {fmt(state.total)}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{
                                            height: '5px', background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '4px', overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                height: '100%', width: `${pct}%`,
                                                background: c, borderRadius: '4px',
                                                transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                                            }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    }
                </div>
            </div>
        </div>
    )
}
