import { useEffect, useState, Fragment } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 20

// ── Modal de Confirmação de Exclusão ────────────────────────────────────────
function DeleteModal({ customerName, onConfirm, onCancel }) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(6px)',
                animation: 'fadeIn 0.15s ease-out',
            }}
            onClick={onCancel}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 'var(--radius)',
                    padding: '2rem',
                    width: '100%', maxWidth: '400px',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                    animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1) both',
                    textAlign: 'center',
                }}
            >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗑️</div>
                <h3 style={{ fontFamily: 'Outfit', marginBottom: '0.5rem', fontSize: '1.15rem' }}>
                    Excluir Venda?
                </h3>
                {customerName && (
                    <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        Cliente: <strong>{customerName}</strong>
                    </p>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
                    Esta ação <strong style={{ color: '#f87171' }}>não pode ser desfeita</strong>.<br />
                    A venda será removida permanentemente.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
                        Cancelar
                    </button>
                    <button className="btn btn-danger" style={{ flex: 1, fontWeight: 700 }} onClick={onConfirm}>
                        Sim, excluir
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Botão Copiar ─────────────────────────────────────────────────────────────
function CopyBtn({ text, label }) {
    const [copied, setCopied] = useState(false)

    const copy = (e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    return (
        <button
            onClick={copy}
            title={`Copiar ${label || ''}`}
            style={{
                background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)'}`,
                color: copied ? '#34d399' : 'var(--text-muted)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.7rem',
                padding: '0.2rem 0.45rem',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                flexShrink: 0,
            }}
        >
            {copied ? '✓ Copiado' : '⎘ Copiar'}
        </button>
    )
}

// ── Título de seção do acordeão ──────────────────────────────────────────────
function SectionTitle({ icon, children }) {
    return (
        <div style={{
            fontSize: '0.68rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.9px',
            color: 'var(--text-muted)', marginBottom: '0.65rem',
            display: 'flex', alignItems: 'center', gap: '0.35rem',
        }}>
            {icon && <span>{icon}</span>}
            {children}
        </div>
    )
}

// ── Badge helper ─────────────────────────────────────────────────────────────
function getBadgeClass(status) {
    switch (status) {
        case 'Pago':      return 'badge-paid'
        case 'Fiado':     return 'badge-debt'
        case 'Parcelado': return 'badge-pending'
        case 'Enviado':   return 'badge-shipped'
        case 'Entregue':  return 'badge-paid'
        default:          return 'badge-pending'
    }
}

// ── Acordeão de detalhes do pedido ──────────────────────────────────────────
function OrderDetail({ sale, fmt }) {
    const c = sale.crm_customers

    const addressParts = [
        c?.address && `${c.address}${c.address_number ? `, ${c.address_number}` : ''}`,
        c?.bairro,
        c?.city && `${c.city}${c.state ? `/${c.state.toUpperCase()}` : ''}`,
        c?.zip_code && `CEP ${c.zip_code}`,
    ].filter(Boolean)

    const fullAddress = addressParts.join(', ')
    const hasAddress = addressParts.length > 0

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.04), rgba(6,182,212,0.02))',
            borderTop: '1px solid rgba(139,92,246,0.18)',
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
        }}>

            {/* ── Coluna Esquerda: Produtos ── */}
            <div>
                <SectionTitle icon="🛒">Produtos do Pedido</SectionTitle>

                {sale.items?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {sale.items.map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.6rem 0.8rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                gap: '0.75rem',
                            }}>
                                <span style={{ flex: 1, fontWeight: 500, color: 'var(--text-main)' }}>
                                    {item.name}
                                </span>
                                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    {item.quantity}× {fmt(item.price)}
                                </span>
                                <span style={{
                                    fontWeight: 700, color: 'var(--primary)',
                                    minWidth: '80px', textAlign: 'right', whiteSpace: 'nowrap',
                                }}>
                                    {fmt(item.price * item.quantity)}
                                </span>
                            </div>
                        ))}

                        {/* Total / Desconto */}
                        <div style={{
                            borderTop: '1px solid var(--glass-border)',
                            marginTop: '0.15rem', paddingTop: '0.6rem', paddingRight: '0.5rem',
                        }}>
                            {sale.discount > 0 && (
                                <>
                                    <div style={{
                                        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                                        gap: '0.5rem', marginBottom: '0.2rem',
                                        fontSize: '0.8rem', color: 'var(--text-muted)',
                                    }}>
                                        <span>Subtotal</span>
                                        <span style={{ textDecoration: 'line-through' }}>
                                            {fmt(Number(sale.total_amount) + Number(sale.discount))}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                                        gap: '0.5rem', marginBottom: '0.35rem',
                                        fontSize: '0.8rem', color: '#f87171',
                                    }}>
                                        <span>
                                            Desconto{sale.discount_type === 'percent'
                                                ? ` (${Math.round(sale.discount / (Number(sale.total_amount) + Number(sale.discount)) * 100)}%)`
                                                : ''}
                                        </span>
                                        <span>− {fmt(sale.discount)}</span>
                                    </div>
                                </>
                            )}
                            <div style={{
                                display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                                gap: '0.5rem', fontSize: '1rem', fontWeight: 800, fontFamily: 'Outfit',
                            }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>TOTAL</span>
                                <span style={{ color: sale.discount > 0 ? '#34d399' : 'var(--primary)' }}>
                                    {fmt(sale.total_amount)}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Sem itens registrados.
                    </p>
                )}

                {/* Observações */}
                {sale.notes && (
                    <div style={{
                        marginTop: '0.85rem',
                        padding: '0.65rem 0.8rem',
                        background: 'rgba(245,158,11,0.06)',
                        border: '1px solid rgba(245,158,11,0.18)',
                        borderRadius: '8px',
                        fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: 1.5,
                    }}>
                        <strong style={{ color: '#fbbf24' }}>📝 Observação:</strong>{' '}
                        {sale.notes}
                    </div>
                )}

                {/* Data da venda */}
                <div style={{ marginTop: '1rem' }}>
                    <SectionTitle icon="📅">Data da Venda</SectionTitle>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                        {new Date(sale.created_at).toLocaleDateString('pt-BR', {
                            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                        })}
                    </span>
                </div>
            </div>

            {/* ── Coluna Direita: Cliente + Endereço + Status ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Dados do Cliente */}
                <div>
                    <SectionTitle icon="👤">Dados do Cliente</SectionTitle>
                    {c ? (
                        <div style={{
                            padding: '0.85rem',
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '10px',
                        }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.6rem', color: 'var(--text-main)' }}>
                                {c.name}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                                {c.phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <a
                                            href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: '#34d399', display: 'inline-flex',
                                                alignItems: 'center', gap: '0.35rem', fontWeight: 500,
                                            }}
                                        >
                                            📱 {c.phone}
                                            <span style={{
                                                fontSize: '0.68rem', opacity: 0.75,
                                                background: 'rgba(52,211,153,0.12)',
                                                border: '1px solid rgba(52,211,153,0.2)',
                                                borderRadius: '4px', padding: '0.1rem 0.35rem',
                                            }}>
                                                WhatsApp ↗
                                            </span>
                                        </a>
                                    </div>
                                )}
                                {c.email && (
                                    <span style={{ color: 'var(--text-muted)' }}>✉️ {c.email}</span>
                                )}
                                {c.cpf && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>🪪 {c.cpf}</span>
                                        <CopyBtn text={c.cpf} label="CPF" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Cliente removido ou não vinculado.
                        </p>
                    )}
                </div>

                {/* Endereço de Envio */}
                <div>
                    <SectionTitle icon="📦">Endereço de Envio</SectionTitle>
                    {hasAddress ? (
                        <div style={{
                            padding: '0.85rem',
                            background: 'rgba(59,130,246,0.06)',
                            border: '1px solid rgba(59,130,246,0.18)',
                            borderRadius: '10px',
                        }}>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-light)', lineHeight: 1.9 }}>
                                {addressParts.map((part, i) => (
                                    <span key={i}>{part}{i < addressParts.length - 1 && <br />}</span>
                                ))}
                            </div>
                            <div style={{ marginTop: '0.6rem' }}>
                                <CopyBtn text={fullAddress} label="endereço" />
                            </div>
                        </div>
                    ) : (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Endereço não cadastrado para este cliente.
                        </p>
                    )}
                </div>

                {/* Status & Rastreio */}
                <div>
                    <SectionTitle icon="🚚">Status & Rastreio</SectionTitle>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Pagamento</div>
                            <span className={`badge ${getBadgeClass(sale.payment_status)}`}>{sale.payment_status}</span>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Entrega</div>
                            <span className={`badge ${getBadgeClass(sale.delivery_status)}`}>{sale.delivery_status}</span>
                        </div>
                        {sale.tracking_code && (
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Rastreio</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <a
                                        href="https://rastreamento.correios.com.br/app/index.php"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 700 }}
                                        title="Rastrear nos Correios"
                                    >
                                        📦 {sale.tracking_code} ↗
                                    </a>
                                    <CopyBtn text={sale.tracking_code} label="código" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function SaleList({ onUpdate }) {
    const [sales, setSales] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [editData, setEditData] = useState({})
    const [saving, setSaving] = useState(false)
    const [expandedId, setExpandedId] = useState(null)
    const [page, setPage] = useState(1)
    const [filterPayment, setFilterPayment] = useState('')
    const [filterDelivery, setFilterDelivery] = useState('')
    const [search, setSearch] = useState('')
    const [deleteTarget, setDeleteTarget] = useState(null) // { id, customerName }

    useEffect(() => { fetchSales() }, [])

    const fetchSales = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('crm_sales')
                .select(`*, crm_customers (id, name, phone, email, cpf, address, address_number, bairro, zip_code, city, state)`)
                .order('created_at', { ascending: false })
            if (error) throw error
            setSales(data || [])
        } catch (err) {
            console.error('Error fetching sales:', err)
            toast.error('Erro ao carregar vendas.')
        } finally {
            setLoading(false)
        }
    }

    const startEdit = (sale) => {
        setEditingId(sale.id)
        setEditData({
            payment_status: sale.payment_status,
            delivery_status: sale.delivery_status,
            tracking_code: sale.tracking_code || '',
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
                    tracking_code: editData.tracking_code || null,
                })
                .eq('id', saleId)
            if (error) throw error
            toast.success('Venda atualizada!')
            setEditingId(null)
            await fetchSales()
            if (onUpdate) onUpdate()
        } catch (err) {
            toast.error('Erro ao atualizar venda.')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return
        try {
            const { error } = await supabase.from('crm_sales').delete().eq('id', deleteTarget.id)
            if (error) throw error
            toast.success('Venda excluída.')
            setDeleteTarget(null)
            if (expandedId === deleteTarget.id) setExpandedId(null)
            await fetchSales()
            if (onUpdate) onUpdate()
        } catch (err) {
            toast.error('Erro ao excluir venda.')
        }
    }

    const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    // ── Filtragem ──
    const filtered = sales.filter(s => {
        const matchSearch = !search || (s.crm_customers?.name || '').toLowerCase().includes(search.toLowerCase())
        const matchPayment = !filterPayment || s.payment_status === filterPayment
        const matchDelivery = !filterDelivery || s.delivery_status === filterDelivery
        return matchSearch && matchPayment && matchDelivery
    })

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const safePage = Math.min(page, totalPages || 1)
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    const hasFilters = !!(search || filterPayment || filterDelivery)

    const handleFilterChange = (setter) => (e) => {
        setter(e.target.value)
        setPage(1)
    }

    // ── Estilos dinâmicos para selects com filtro ativo ──
    const activeSelectStyle = {
        borderColor: 'rgba(139,92,246,0.55)',
        background: 'rgba(139,92,246,0.08)',
        color: 'var(--primary)',
    }

    if (loading) return (
        <div className="loading-state">
            <div className="spinner" />
            Carregando vendas...
        </div>
    )

    return (
        <div className="fade-in">
            {/* ── Modal de Exclusão ── */}
            {deleteTarget && (
                <DeleteModal
                    customerName={deleteTarget.customerName}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            {/* ── Barra de Filtros ── */}
            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="🔍 Buscar por cliente..."
                    value={search}
                    onChange={handleFilterChange(setSearch)}
                    style={search ? { borderColor: 'rgba(139,92,246,0.55)', background: 'rgba(139,92,246,0.08)' } : { minWidth: '200px' }}
                />
                <select
                    value={filterPayment}
                    onChange={handleFilterChange(setFilterPayment)}
                    style={filterPayment ? activeSelectStyle : {}}
                >
                    <option value="">Todos os pagamentos</option>
                    <option value="Pago">✅ Pago</option>
                    <option value="Fiado">⚠️ Fiado</option>
                    <option value="Parcelado">🔄 Parcelado</option>
                </select>
                <select
                    value={filterDelivery}
                    onChange={handleFilterChange(setFilterDelivery)}
                    style={filterDelivery ? activeSelectStyle : {}}
                >
                    <option value="">Todas as entregas</option>
                    <option value="Pendente">🕐 Pendente</option>
                    <option value="Enviado">🚚 Enviado</option>
                    <option value="Entregue">✅ Entregue</option>
                </select>
                {hasFilters && (
                    <button
                        className="btn btn-ghost"
                        style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
                        onClick={() => { setSearch(''); setFilterPayment(''); setFilterDelivery(''); setPage(1) }}
                    >
                        ✕ Limpar filtros
                    </button>
                )}
            </div>

            {/* ── Tabela ── */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Data</th>
                            <th style={{ textAlign: 'left' }}>Cliente</th>
                            <th style={{ textAlign: 'right' }}>Valor</th>
                            <th style={{ textAlign: 'center' }}>Pagamento</th>
                            <th style={{ textAlign: 'center' }}>Entrega</th>
                            <th style={{ textAlign: 'left' }}>Rastreio</th>
                            <th style={{ textAlign: 'center' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan="7">
                                    <div className="empty-state">
                                        <span className="empty-icon">💰</span>
                                        <p>
                                            {hasFilters
                                                ? 'Nenhuma venda encontrada com os filtros selecionados.'
                                                : 'Nenhuma venda registrada ainda.'
                                            }
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginated.map(sale => (
                                <Fragment key={sale.id}>
                                    <tr style={expandedId === sale.id
                                        ? { background: 'rgba(139,92,246,0.06)', borderLeft: '2px solid rgba(139,92,246,0.4)' }
                                        : {}
                                    }>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td style={{ fontWeight: 500 }}>
                                            {sale.crm_customers?.name || (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    Cliente Removido
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'Outfit', color: 'var(--text-main)' }}>
                                            {fmt(sale.total_amount)}
                                        </td>

                                        {/* ── Modo Edição ── */}
                                        {editingId === sale.id ? (
                                            <>
                                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                                    <select
                                                        value={editData.payment_status}
                                                        onChange={e => setEditData({ ...editData, payment_status: e.target.value })}
                                                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px' }}
                                                    >
                                                        <option>Pago</option>
                                                        <option>Fiado</option>
                                                        <option>Parcelado</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                                    <select
                                                        value={editData.delivery_status}
                                                        onChange={e => setEditData({ ...editData, delivery_status: e.target.value })}
                                                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px' }}
                                                    >
                                                        <option>Pendente</option>
                                                        <option>Enviado</option>
                                                        <option>Entregue</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                                    <input
                                                        type="text"
                                                        value={editData.tracking_code}
                                                        onChange={e => setEditData({ ...editData, tracking_code: e.target.value })}
                                                        placeholder="Cód. rastreio"
                                                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
                                                    <button
                                                        className="btn btn-success"
                                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', marginRight: '0.3rem' }}
                                                        onClick={() => saveEdit(sale.id)}
                                                        disabled={saving}
                                                    >
                                                        {saving
                                                            ? <><span className="spinner" style={{ width: '10px', height: '10px' }} /> Salvando</>
                                                            : '✓ Salvar'
                                                        }
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                                                        onClick={cancelEdit}
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </>
                                        ) : (
                                            /* ── Modo Visualização ── */
                                            <>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`badge ${getBadgeClass(sale.payment_status)}`}>
                                                        {sale.payment_status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`badge ${getBadgeClass(sale.delivery_status)}`}>
                                                        {sale.delivery_status}
                                                    </span>
                                                </td>
                                                <td style={{ maxWidth: '150px' }}>
                                                    {sale.tracking_code ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                            <span style={{
                                                                fontSize: '0.78rem', color: 'var(--text-muted)',
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                maxWidth: '90px',
                                                            }}>
                                                                {sale.tracking_code}
                                                            </span>
                                                            <CopyBtn text={sale.tracking_code} label="código" />
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', marginRight: '0.25rem' }}
                                                        onClick={() => startEdit(sale)}
                                                        title="Editar status e rastreio"
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        className="btn btn-danger"
                                                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', marginRight: '0.25rem' }}
                                                        onClick={() => setDeleteTarget({ id: sale.id, customerName: sale.crm_customers?.name })}
                                                        title="Excluir venda"
                                                    >
                                                        🗑
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{
                                                            padding: '0.35rem 0.6rem', fontSize: '0.78rem',
                                                            ...(expandedId === sale.id ? {
                                                                background: 'rgba(139,92,246,0.15)',
                                                                borderColor: 'rgba(139,92,246,0.45)',
                                                                color: 'var(--primary)',
                                                            } : {}),
                                                        }}
                                                        onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                                                        title={expandedId === sale.id ? 'Fechar detalhes' : 'Ver detalhes do pedido'}
                                                    >
                                                        {expandedId === sale.id ? '▲' : '▼'}
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>

                                    {/* ── Linha do Acordeão ── */}
                                    {expandedId === sale.id && (
                                        <tr>
                                            <td colSpan="7" style={{ padding: 0, borderBottom: '2px solid rgba(139,92,246,0.2)' }}>
                                                <OrderDetail sale={sale} fmt={fmt} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Paginação ── */}
            {filtered.length > 0 && (
                <div className="pagination">
                    <span>
                        <strong>{filtered.length}</strong> venda{filtered.length !== 1 ? 's' : ''}
                        {hasFilters && (
                            <span style={{ color: 'var(--text-muted)' }}> · filtradas de {sales.length}</span>
                        )}
                    </span>
                    {totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                className="page-btn"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                            >
                                ‹
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                                .reduce((acc, n, idx, arr) => {
                                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...')
                                    acc.push(n)
                                    return acc
                                }, [])
                                .map((item, idx) =>
                                    item === '...'
                                        ? <span key={`dots-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>
                                        : <button
                                            key={item}
                                            className={`page-btn ${item === safePage ? 'active' : ''}`}
                                            onClick={() => setPage(item)}
                                        >
                                            {item}
                                        </button>
                                )
                            }
                            <button
                                className="page-btn"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                            >
                                ›
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
