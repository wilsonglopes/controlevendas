import { useEffect, useState, Fragment } from 'react'
import { supabase } from '../lib/supabase'

export default function SaleList({ onUpdate }) {
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [editData, setEditData] = useState({})
    const [saving, setSaving] = useState(false)
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => {
        fetchSales()
    }, [])

    const fetchSales = async () => {
        try {
            const { data, error } = await supabase
                .from('crm_sales')
                .select(`*, crm_customers (name)`)
                .order('created_at', { ascending: false })
            if (error) throw error
            setSales(data || [])
        } catch (error) {
            console.error('Error fetching sales:', error)
        } finally {
            setLoading(false)
        }
    }

    const startEdit = (sale) => {
        setEditingId(sale.id)
        setEditData({
            payment_status: sale.payment_status,
            delivery_status: sale.delivery_status,
            tracking_code: sale.tracking_code || ''
        })
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditData({})
    }

    const saveEdit = async (saleId) => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('crm_sales')
                .update({
                    payment_status: editData.payment_status,
                    delivery_status: editData.delivery_status,
                    tracking_code: editData.tracking_code || null
                })
                .eq('id', saleId)
            if (error) throw error
            setEditingId(null)
            await fetchSales()
            if (onUpdate) onUpdate()
        } catch (error) {
            alert('Erro ao atualizar venda.')
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const deleteSale = async (saleId) => {
        if (!confirm('Tem certeza que deseja excluir esta venda?')) return
        try {
            const { error } = await supabase.from('crm_sales').delete().eq('id', saleId)
            if (error) throw error
            await fetchSales()
            if (onUpdate) onUpdate()
        } catch (error) {
            alert('Erro ao excluir venda.')
        }
    }

    const getBadgeClass = (status) => {
        switch (status) {
            case 'Pago': return 'badge-paid'
            case 'Fiado': return 'badge-debt'
            case 'Parcelado': return 'badge-pending'
            case 'Enviado': return 'badge-shipped'
            case 'Entregue': return 'badge-paid'
            default: return 'badge-pending'
        }
    }

    const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando vendas...</div>

    return (
        <div className="fade-in">
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Data</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Cliente</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Valor</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Pagamento</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Entrega</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Rastreio</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Nenhuma venda registrada.
                                </td>
                            </tr>
                        ) : (
                            sales.map(sale => (
                                <Fragment key={sale.id}>
                                    <tr style={{ borderTop: '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                            {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td style={{ padding: '1rem' }}>{sale.crm_customers?.name || 'Cliente Removido'}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{fmt(sale.total_amount)}</td>

                                        {editingId === sale.id ? (
                                            <>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <select
                                                        value={editData.payment_status}
                                                        onChange={e => setEditData({ ...editData, payment_status: e.target.value })}
                                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: '8px' }}
                                                    >
                                                        <option>Pago</option>
                                                        <option>Fiado</option>
                                                        <option>Parcelado</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <select
                                                        value={editData.delivery_status}
                                                        onChange={e => setEditData({ ...editData, delivery_status: e.target.value })}
                                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: '8px' }}
                                                    >
                                                        <option>Pendente</option>
                                                        <option>Enviado</option>
                                                        <option>Entregue</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        value={editData.tracking_code}
                                                        onChange={e => setEditData({ ...editData, tracking_code: e.target.value })}
                                                        placeholder="Cód. rastreio"
                                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: '8px' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                                                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginRight: '0.4rem' }} onClick={() => saveEdit(sale.id)} disabled={saving}>
                                                        {saving ? '...' : '✓ Salvar'}
                                                    </button>
                                                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={cancelEdit}>✕</button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <span className={`badge ${getBadgeClass(sale.payment_status)}`}>{sale.payment_status}</span>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <span className={`badge ${getBadgeClass(sale.delivery_status)}`}>{sale.delivery_status}</span>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {sale.tracking_code || '—'}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginRight: '0.4rem' }}
                                                        onClick={() => startEdit(sale)}
                                                    >
                                                        ✎ Editar
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: 'var(--status-debt)', borderColor: 'rgba(239,68,68,0.3)' }}
                                                        onClick={() => deleteSale(sale.id)}
                                                    >
                                                        🗑
                                                    </button>
                                                    {sale.items?.length > 0 && (
                                                        <button
                                                            className="btn btn-ghost"
                                                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', marginLeft: '0.3rem' }}
                                                            onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                                                            title="Ver itens"
                                                        >
                                                            {expandedId === sale.id ? '▲' : '▼'}
                                                        </button>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                    {expandedId === sale.id && (
                                        <tr style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                                            <td colSpan="7" style={{ padding: '0.75rem 1.5rem' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    <strong style={{ color: 'var(--text-main)' }}>Itens da venda:</strong>
                                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {sale.items.map((item, idx) => (
                                                            <span key={idx} style={{
                                                                background: 'rgba(255,255,255,0.05)',
                                                                border: '1px solid var(--glass-border)',
                                                                borderRadius: '8px',
                                                                padding: '0.25rem 0.75rem'
                                                            }}>
                                                                {item.name} × {item.quantity} — {fmt(item.price * item.quantity)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <style>{`.badge-shipped { background: rgba(59,130,246,0.2); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }`}</style>
        </div>
    )
}
