import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function SaleForm({ onSave, onCancel, user }) {
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState([])
    const [products, setProducts] = useState([])
    const [formData, setFormData] = useState({
        customer_id: '',
        payment_status: 'Pago',
        delivery_status: 'Pendente',
        tracking_code: '',
        notes: '',
        selected_items: [],
        discount_type: 'value',
        discount_value: '',
    })

    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            const [{ data: custs }, { data: prods }] = await Promise.all([
                supabase.from('crm_customers').select('id, name').order('name'),
                supabase.from('crm_products').select('id, name, price, stock').order('name'),
            ])
            setCustomers(custs || [])
            setProducts(prods || [])
        }
        loadData()
    }, [])

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase())
    )

    const selectCustomer = (customer) => {
        setFormData({ ...formData, customer_id: customer.id })
        setCustomerSearch(customer.name)
        setShowCustomerDropdown(false)
    }

    const addItem = (productId) => {
        if (!productId) return
        const product = products.find(p => p.id === productId)
        if (!product) return

        const existing = formData.selected_items.findIndex(i => i.product_id === product.id)
        if (existing >= 0) {
            const updated = [...formData.selected_items]
            updated[existing].quantity += 1
            setFormData(prev => ({ ...prev, selected_items: updated }))
        } else {
            setFormData(prev => ({
                ...prev,
                selected_items: [
                    ...prev.selected_items,
                    { product_id: product.id, name: product.name, price: product.price, quantity: 1 },
                ],
            }))
        }
    }

    const updateQty = (idx, qty) => {
        if (qty < 1) return removeItem(idx)
        const updated = [...formData.selected_items]
        updated[idx].quantity = qty
        setFormData(prev => ({ ...prev, selected_items: updated }))
    }

    const removeItem = (idx) => {
        setFormData(prev => ({
            ...prev,
            selected_items: prev.selected_items.filter((_, i) => i !== idx),
        }))
    }

    const subtotal = formData.selected_items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const discountAmount = formData.discount_type === 'percent'
        ? subtotal * (parseFloat(formData.discount_value) || 0) / 100
        : parseFloat(formData.discount_value) || 0
    const total = Math.max(0, subtotal - discountAmount)
    const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (formData.selected_items.length === 0) {
            toast.error('Adicione pelo menos um produto à venda.')
            return
        }
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('crm_sales')
                .insert([{
                    customer_id: formData.customer_id || null,
                    total_amount: total,
                    payment_status: formData.payment_status,
                    delivery_status: formData.delivery_status,
                    tracking_code: formData.tracking_code || null,
                    notes: formData.notes || null,
                    items: formData.selected_items,
                    user_id: user?.id || null,
                    discount: discountAmount,
                    discount_type: formData.discount_type,
                }])
                .select()
            if (error) throw error

            // Decrementa estoque
            const productIds = [...new Set(formData.selected_items.map(i => i.product_id))]
            const { data: currentProducts } = await supabase
                .from('crm_products')
                .select('id, stock')
                .in('id', productIds)

            if (currentProducts) {
                await Promise.all(
                    formData.selected_items.map(item => {
                        const prod = currentProducts.find(p => p.id === item.product_id)
                        if (!prod) return Promise.resolve()
                        const newStock = Math.max(0, prod.stock - item.quantity)
                        return supabase
                            .from('crm_products')
                            .update({ stock: newStock })
                            .eq('id', item.product_id)
                    })
                )
            }

            toast.success('Venda registrada com sucesso!')
            onSave(data[0])
        } catch (err) {
            console.error('Error saving sale:', err)
            toast.error('Erro ao registrar venda. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-card fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Nova Venda</h2>
            <form onSubmit={handleSubmit}>
                {/* Cliente */}
                <div className="input-group" style={{ position: 'relative' }}>
                    <label>Cliente (opcional)</label>
                    <input
                        type="text"
                        placeholder="Pesquisar cliente..."
                        value={customerSearch}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                        onChange={e => {
                            setCustomerSearch(e.target.value)
                            if (formData.customer_id) setFormData({ ...formData, customer_id: '' })
                            setShowCustomerDropdown(true)
                        }}
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                        <div className="dropdown-list" style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            maxHeight: '200px',
                            overflowY: 'auto',
                            marginTop: '0.25rem',
                        }}>
                            {filteredCustomers.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => selectCustomer(c)}
                                    className="dropdown-item"
                                >
                                    {c.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Adicionar Produto */}
                <div className="input-group">
                    <label>Adicionar Produto</label>
                    <select onChange={e => { addItem(e.target.value); e.target.value = '' }}>
                        <option value="">Selecione um produto para adicionar...</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} — {fmt(p.price)} {p.stock > 0 ? `(estoque: ${p.stock})` : '(sem estoque)'}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Itens Selecionados */}
                {formData.selected_items.length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Itens da Venda
                        </label>
                        <div className="glass-panel" style={{ padding: '0.5rem' }}>
                            {formData.selected_items.map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.6rem 0.5rem',
                                    borderBottom: idx < formData.selected_items.length - 1 ? '1px solid var(--glass-border)' : 'none',
                                }}>
                                    <span style={{ flex: 1, fontSize: '0.875rem', marginRight: '1rem' }}>{item.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => updateQty(idx, item.quantity - 1)}
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            −
                                        </button>
                                        <span style={{ width: '28px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>{item.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => updateQty(idx, item.quantity + 1)}
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '6px', width: '26px', height: '26px', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            +
                                        </button>
                                        <span style={{ width: '90px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                            {fmt(item.price * item.quantity)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(idx)}
                                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div style={{ paddingTop: '0.75rem', paddingRight: '0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Outfit' }}>
                                Total: <span style={{ color: 'var(--primary)' }}>{fmt(total)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Desconto */}
                {formData.selected_items.length > 0 && (
                    <div className="input-group">
                        <label>Desconto (Opcional)</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                            {/* Tipo */}
                            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, discount_type: 'value', discount_value: '' }))}
                                    style={{
                                        padding: '0.5rem 0.85rem',
                                        fontSize: '0.85rem', fontWeight: 700,
                                        border: 'none', cursor: 'pointer',
                                        background: formData.discount_type === 'value'
                                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                            : 'rgba(255,255,255,0.04)',
                                        color: formData.discount_type === 'value' ? 'white' : 'var(--text-muted)',
                                        transition: 'all 0.2s',
                                    }}
                                >R$</button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, discount_type: 'percent', discount_value: '' }))}
                                    style={{
                                        padding: '0.5rem 0.85rem',
                                        fontSize: '0.85rem', fontWeight: 700,
                                        border: 'none', borderLeft: '1px solid var(--glass-border)', cursor: 'pointer',
                                        background: formData.discount_type === 'percent'
                                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                                            : 'rgba(255,255,255,0.04)',
                                        color: formData.discount_type === 'percent' ? 'white' : 'var(--text-muted)',
                                        transition: 'all 0.2s',
                                    }}
                                >%</button>
                            </div>
                            {/* Valor */}
                            <input
                                type="number"
                                min="0"
                                step={formData.discount_type === 'percent' ? '1' : '0.01'}
                                max={formData.discount_type === 'percent' ? '100' : undefined}
                                value={formData.discount_value}
                                onChange={e => setFormData(p => ({ ...p, discount_value: e.target.value }))}
                                placeholder={formData.discount_type === 'percent' ? 'Ex: 10 (%)' : 'Ex: 20,00 (R$)'}
                                style={{ flex: 1 }}
                            />
                        </div>

                        {/* Resumo do desconto */}
                        {discountAmount > 0 && (
                            <div style={{
                                marginTop: '0.6rem',
                                padding: '0.75rem 1rem',
                                background: 'rgba(16,185,129,0.06)',
                                border: '1px solid rgba(16,185,129,0.2)',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                    <span>Subtotal</span>
                                    <span style={{ textDecoration: 'line-through' }}>{fmt(subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171', marginBottom: '0.3rem' }}>
                                    <span>
                                        Desconto{formData.discount_type === 'percent' ? ` (${formData.discount_value}%)` : ''}
                                    </span>
                                    <span>− {fmt(discountAmount)}</span>
                                </div>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontWeight: 800, fontSize: '0.95rem', fontFamily: 'Outfit',
                                    color: '#34d399', borderTop: '1px solid rgba(16,185,129,0.15)', paddingTop: '0.3rem',
                                }}>
                                    <span>Total Final</span>
                                    <span>{fmt(total)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Status de Pagamento</label>
                        <select value={formData.payment_status} onChange={e => setFormData({ ...formData, payment_status: e.target.value })}>
                            <option value="Pago">Pago</option>
                            <option value="Fiado">Fiado</option>
                            <option value="Parcelado">Parcelado</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Status de Entrega</label>
                        <select value={formData.delivery_status} onChange={e => setFormData({ ...formData, delivery_status: e.target.value })}>
                            <option value="Pendente">Pendente</option>
                            <option value="Enviado">Enviado</option>
                            <option value="Entregue">Entregue</option>
                        </select>
                    </div>
                </div>

                <div className="input-group">
                    <label>Código de Rastreio (Opcional)</label>
                    <input
                        type="text"
                        value={formData.tracking_code}
                        onChange={e => setFormData({ ...formData, tracking_code: e.target.value })}
                        placeholder="Ex: BR123456789BR"
                    />
                </div>

                <div className="input-group">
                    <label>Observações</label>
                    <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Observações sobre a venda..."
                        rows={2}
                        style={{ resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ flex: 2 }}
                        disabled={loading || formData.selected_items.length === 0}
                    >
                        {loading ? (
                            <><span className="spinner" style={{ width: '14px', height: '14px' }} /> Processando...</>
                        ) : (
                            `Finalizar Venda${total > 0 ? ` • ${fmt(total)}` : ''}${discountAmount > 0 ? ` 🏷️ -${fmt(discountAmount)}` : ''}`
                        )}
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}
