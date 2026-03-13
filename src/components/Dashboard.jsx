import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

export default function Dashboard({ stats }) {
    const [pendingSales, setPendingSales] = useState([])
    const [toShipList, setToShipList] = useState([])
    const [lowStockProds, setLowStockProds] = useState([])

    useEffect(() => {
        const loadWidgets = async () => {
            // Vendas Pendentes de Cobrança (Fiado ou Parcelado)
            const { data: pendings } = await supabase
                .from('crm_sales')
                .select('id, total_amount, payment_status, crm_customers(name)')
                .in('payment_status', ['Fiado', 'Parcelado'])
                .order('created_at', { ascending: false })
                .limit(5)

            // Vendas Pendentes de Entrega
            const { data: toShip } = await supabase
                .from('crm_sales')
                .select('id, total_amount, delivery_status, crm_customers(name)')
                .eq('delivery_status', 'Pendente')
                .order('created_at', { ascending: false })
                .limit(5)

            // Produtos com estoque baixo (< 10)
            const { data: lowStock } = await supabase
                .from('crm_products')
                .select('id, name, stock')
                .lt('stock', 10)
                .order('stock', { ascending: true })
                .limit(5)

            setPendingSales(pendings || [])
            setToShipList(toShip || [])
            setLowStockProds(lowStock || [])
        }
        loadWidgets()
    }, [])

    const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    return (
        <div className="dashboard-fade">
            <header style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Olá, Wilson 👋</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Aqui está o resumo da sua operação hoje.</p>
            </header>

            <div className="stats-grid">
                <div className="glass-card card-stagger dashboard-fade">
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>Faturamento Total</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{fmt(stats.totalSales)}</div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--status-paid)' }}>↑ 12% em relação ao mês anterior</div>
                </div>
                <div className="glass-card card-stagger dashboard-fade">
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>A Receber</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--status-debt)' }}>{fmt(stats.pendingPayment)}</div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pendingSales.length} pagamentos pendentes</div>
                </div>
                <div className="glass-card card-stagger dashboard-fade">
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>Logística</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--status-shipped)' }}>{stats.toShip}</div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{toShipList.length} prontos para envio</div>
                </div>
                <div className="glass-card card-stagger dashboard-fade">
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>Clientes</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{stats.totalCustomers}</div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)' }}>Base de dados ativa</div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="glass-card dashboard-fade">
                    <div className="widget-title">
                        <h3>Cobranças Urgentes</h3>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Ver todas</button>
                    </div>
                    <div className="widget-list">
                        {pendingSales.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Tudo em dia!</p>}
                        {pendingSales.map(sale => (
                            <div key={sale.id} className="list-item">
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{sale.crm_customers?.name || 'Cliente Avulso'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sale.payment_status}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--status-debt)' }}>{fmt(sale.total_amount)}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }}>Cobrar WhatsApp →</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card dashboard-fade">
                    <div className="widget-title">
                        <h3>Atenção no Estoque</h3>
                    </div>
                    <div className="widget-list">
                        {lowStockProds.map(prod => (
                            <div key={prod.id} className="list-item">
                                <span style={{ fontSize: '0.9rem' }}>{prod.name}</span>
                                <span className={`badge ${prod.stock === 0 ? 'badge-debt' : 'badge-pending'}`} style={{ fontSize: '0.7rem' }}>
                                    {prod.stock} un
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-card dashboard-fade" style={{ marginTop: '1.5rem' }}>
                <div className="widget-title">
                    <h3>Próximos Envios 📬</h3>
                </div>
                <div className="widget-list" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                    {toShipList.map(sale => (
                        <div key={sale.id} className="list-item">
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.crm_customers?.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                                <span className="badge badge-pending">PENDENTE</span>
                                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>✎ Editar</button>
                            </div>
                        </div>
                    ))}
                    {toShipList.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhuma entrega pendente.</p>}
                </div>
            </div>
        </div>
    )
}
``