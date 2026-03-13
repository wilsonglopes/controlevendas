import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function SaleForm({ onSave, onCancel }) {
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState([])
    const [products, setProducts] = useState([])
    const [formData, setFormData] = useState({
        customer_id: '',
        payment_status: 'Pago',
        delivery_status: 'Pendente',
        tracking_code: '',
        notes: '',
        selected_items: []
    })

    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            const { data: custs } = await supabase.from('crm_customers').select('id, name').order('name')
            const { data: prods } = await supabase.from('crm_products').select('id, name, price, stock').order('name')
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
        // Se já existe, aumenta a quantidade
        const existing = formData.selected_items.findIndex(i => i.product_id === product.id)
        if (existing >= 0) {
            const updated = [...formData.selected_items]
            updated[existing].quantity += 1
            setFormData(prev => ({ ...prev, selected_items: updated }))
        } else {
            setFormData(prev => ({
                ...prev,
                selected_items: [...prev.selected_items, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }]
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
            selected_items: prev.selected_items.filter((_, i) => i !== idx)
        }))
    }

    const total = formData.selected_items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (formData.selected_items.length === 0) return alert('Adicione pelo menos um produto.')
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
                    items: formData.selected_items
                }])
                .select()
            if (error) throw error

            // Decrementa o estoque de cada produto vendido
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

            onSave(data[0])
        } catch (error) {
            console.error('Error saving sale:', error)
            alert('Erro ao registrar venda.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-card fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Nova Venda</h2>
            <form onSubmit={handleSubmit}>
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
                            padding: '0.5rem 0'
                        }}>
                            {filteredCustomers.map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => selectCustomer(c)}
                                    style={{ 
                                        padding: '0.75rem 1rem', 
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        borderBottom: '1px solid var(--glass-border)'
                                    }}
                                    className="dropdown-item"
                                >
                                    {c.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="input-group">
                    <label>Adicionar Produto</label>
                    <select onChange={e => { addItem(e.target.value); e.target.value = ''; }}>
                        <option value="">Clique para adicionar um produto...</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} — {fmt(p.price)} {p.stock > 0 ? `(estoque: ${p.stock})` : '(sem estoque)'}
                            </option>
                        ))}
                    </select>
                </div>

                {formData.selected_items.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Itens da Venda</label>
                        <div className="glass-panel" style={{ padding: '0.75rem' }}>
                            {formData.selected_items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.25rem', borderBottom: '1px solid var(--glass-border)' }}>
                                    <span style={{ flex: 1, fontSize: '0.9rem' }}>{item.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button type="button" onClick={() => updateQty(idx, item.quantity - 1)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>−</button>
                                        <span style={{ width: '28px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                                        <button type="button" onClick={() => updateQty(idx, item.quantity + 1)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>+</button>
                                        <span style={{ width: '90px', textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{fmt(item.price * item.quantity)}</span>
                                        <button type="button" onClick={() => removeItem(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--status-debt)', cursor: 'pointer', fontSize: '1rem', marginLeft: '0.25rem' }}>✕</button>
                                    </div>
                                </div>
                            ))}
                            <div style={{ paddingTop: '0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>
                                Total: {fmt(total)}
                            </div>
                        </div>
                    </div>
                )}

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
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading || formData.selected_items.length === 0}>
                        {loading ? 'Processando...' : `Finalizar Venda${total > 0 ? ` • ${fmt(total)}` : ''}`}
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}
