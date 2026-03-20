import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

export default function Dashboard({ stats }) {
    const [pendingSales, setPendingSales] = useState([])
    const [toShipList, setToShipList] = useState([])
    const [lowStockProds, setLowStockProds] = useState([])
    const [editingSaleId, setEditingSaleId] = useState(null)
    const [editData, setEditData] = useState({})
    const [saving, setSaving] = useState(false)

    const loadWidgets = async () => {
        const [{ data: pendings }, { data: toShip }, { data: lowStock }] = await Promise.all([
            supabase
                .from('crm_sales')
                .select('id, total_amount, payment_status, crm_customers(name, phone)')
                .in('payment_status', ['Fiado', 'Parcelado'])
                .order('created_at', { ascending: false })
                .limit(6),
            supabase
                .from('crm_sales')
                .select('id, total_amount, delivery_status, tracking_code, crm_customers(name)')
                .eq('delivery_status', 'Pendente')
                .order('created_at', { ascending: false })
                .limit(8),
            supabase
                .from('crm_products')
                .select('id, name, stock')
                .lt('stock', 10)
                .order('stock', { ascending: true })
                .limit(6),
        ])

        setPendingSales(pendings || [])
        setToShipList(toShip || [])
        setLowStockProds(lowStock || [])
    }

    useEffect(() => { loadWidgets() }, [])

    const startEdit = (sale) => {
        setEditingSaleId(sale.id)
        setEditData({
            delivery_status: sale.delivery_status || 'Pendente',
            tracking_code: sale.tracking_code || '',
        })
    }

    const cancelEdit = () => {
        setEditingSaleId(null)
        setEditData({})
    }

    const saveEdit = async (saleId) => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('crm_sales')
                .update({
                    delivery_status: editData.delivery_status,
                    tracking_code: editData.tracking_code || null,
                })
                .eq('id', saleId)

            if (error) throw error
            toast.success('Envio atualizado!')
            setEditingSaleId(null)
            await loadWidgets()
        } catch (err) {
            console.error(err)
            toast.error('Erro ao atualizar envio.')
        } finally {
            setSaving(false)
        }
    }

    const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const now = new Date()
    const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite'

    return (
        <div className="dashboard-fade">
            {/* Header */}
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>
                    {greeting}, Wilson 👋
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Aqui está o resumo da sua operação.
                </p>
            </header>

            {/* Stat Cards */}
            <div className="stats-grid">
                <div
                    className="glass-card stat-card card-stagger dashboard-fade"
                    style={{ '--accent-start': '#8b5cf6', '--accent-end': '#ec4899' }}
                >
                    <span className="stat-icon">💰</span>
                    <span className="stat-label">Faturamento Total</span>
                    <div className="stat-value">{fmt(stats.totalSales)}</div>
                    <span className="stat-sub" style={{ color: 'var(--text-muted)' }}>
                        {stats.totalCustomers} clientes cadastrados
                    </span>
                </div>

                <div
                    className="glass-card stat-card card-stagger dashboard-fade"
                    style={{ '--accent-start': '#ef4444', '--accent-end': '#f87171' }}
                >
                    <span className="stat-icon">⚠️</span>
                    <span className="stat-label">A Receber</span>
                    <div className="stat-value" style={{ color: '#f87171' }}>{fmt(stats.pendingPayment)}</div>
                    <span className="stat-sub" style={{ color: 'var(--text-muted)' }}>
                        {pendingSales.length} pagamento{pendingSales.length !== 1 ? 's' : ''} em aberto
                    </span>
                </div>

                <div
                    className="glass-card stat-card card-stagger dashboard-fade"
                    style={{ '--accent-start': '#3b82f6', '--accent-end': '#06b6d4' }}
                >
                    <span className="stat-icon">📦</span>
                    <span className="stat-label">Logística</span>
                    <div className="stat-value" style={{ color: '#60a5fa' }}>{stats.toShip}</div>
                    <span className="stat-sub" style={{ color: 'var(--text-muted)' }}>
                        pedido{stats.toShip !== 1 ? 's' : ''} aguardando envio
                    </span>
                </div>

                <div
                    className="glass-card stat-card card-stagger dashboard-fade"
                    style={{ '--accent-start': '#10b981', '--accent-end': '#06b6d4' }}
                >
                    <span className="stat-icon">✅</span>
                    <span className="stat-label">Recebido</span>
                    <div className="stat-value" style={{ color: '#34d399' }}>{fmt(stats.paidSales)}</div>
                    <span className="stat-sub" style={{ color: 'var(--text-muted)' }}>
                        total em vendas pagas
                    </span>
                </div>
            </div>

            {/* Widgets Row */}
            <div className="dashboard-grid">
                {/* Cobranças Urgentes */}
                <div className="glass-card dashboard-fade">
                    <div className="widget-title">
                        <h3>Cobranças Urgentes</h3>
                        {pendingSales.length > 0 && (
                            <span className="badge badge-debt">{pendingSales.length} em aberto</span>
                        )}
                    </div>
                    <div className="widget-list">
                        {pendingSales.length === 0 ? (
                            <div className="empty-state" style={{ padding: '1.5rem' }}>
                                <span className="empty-icon">🎉</span>
                                <p>Tudo em dia! Sem cobranças pendentes.</p>
                            </div>
                        ) : (
                            pendingSales.map(sale => (
                                <div key={sale.id} className="list-item">
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                            {sale.crm_customers?.name || 'Cliente Avulso'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                            <span className={`badge ${sale.payment_status === 'Fiado' ? 'badge-debt' : 'badge-pending'}`}>
                                                {sale.payment_status}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: '#f87171', fontSize: '0.95rem' }}>
                                            {fmt(sale.total_amount)}
                                        </div>
                                        {sale.crm_customers?.phone && (
                                            <a
                                                href={`https://wa.me/55${sale.crm_customers.phone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.2rem', display: 'block' }}
                                            >
                                                Cobrar WhatsApp →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Atenção no Estoque */}
                <div className="glass-card dashboard-fade">
                    <div className="widget-title">
                        <h3>Atenção no Estoque</h3>
                        {lowStockProds.length > 0 && (
                            <span className="badge badge-pending">{lowStockProds.length} produtos</span>
                        )}
                    </div>
                    <div className="widget-list">
                        {lowStockProds.length === 0 ? (
                            <div className="empty-state" style={{ padding: '1.5rem' }}>
                                <span className="empty-icon">📦</span>
                                <p>Estoque normalizado.</p>
                            </div>
                        ) : (
                            lowStockProds.map(prod => (
                                <div key={prod.id} className="list-item">
                                    <span style={{ fontSize: '0.875rem' }}>{prod.name}</span>
                                    <span className={`badge ${prod.stock === 0 ? 'badge-debt' : 'badge-pending'}`}>
                                        {prod.stock === 0 ? 'Esgotado' : `${prod.stock} un`}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Próximos Envios */}
            <div className="glass-card dashboard-fade">
                <div className="widget-title">
                    <h3>Próximos Envios</h3>
                    {toShipList.length > 0 && (
                        <span className="badge badge-shipped">{toShipList.length} pendentes</span>
                    )}
                </div>

                {toShipList.length === 0 ? (
                    <div className="empty-state" style={{ padding: '1.5rem' }}>
                        <span className="empty-icon">✈️</span>
                        <p>Nenhuma entrega pendente.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                        {toShipList.map(sale => (
                            <div key={sale.id} className="list-item">
                                {editingSaleId === sale.id ? (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                            {sale.crm_customers?.name}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <select
                                                style={{ padding: '5px 8px', fontSize: '0.8rem', borderRadius: '6px', width: 'auto', flex: 1, minWidth: '120px' }}
                                                value={editData.delivery_status}
                                                onChange={e => setEditData({ ...editData, delivery_status: e.target.value })}
                                            >
                                                <option>Pendente</option>
                                                <option>Enviado</option>
                                                <option>Entregue</option>
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Cód. rastreio"
                                                style={{ padding: '5px 8px', fontSize: '0.8rem', borderRadius: '6px', flex: 1, minWidth: '120px' }}
                                                value={editData.tracking_code}
                                                onChange={e => setEditData({ ...editData, tracking_code: e.target.value })}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: '5px 12px', fontSize: '0.78rem', flex: 1 }}
                                                onClick={() => saveEdit(sale.id)}
                                                disabled={saving}
                                            >
                                                {saving ? '...' : '✓ Salvar'}
                                            </button>
                                            <button
                                                className="btn btn-ghost"
                                                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                                onClick={cancelEdit}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {sale.crm_customers?.name}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                                {sale.tracking_code || 'Sem rastreio'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                            <span className="badge badge-pending">Pendente</span>
                                            <button
                                                className="btn btn-ghost"
                                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                onClick={() => startEdit(sale)}
                                            >
                                                ✎
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
