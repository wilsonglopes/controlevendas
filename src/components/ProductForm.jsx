import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function ProductForm({ onSave, onCancel, product }) {
    const isEditing = Boolean(product)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        stock: '',
        description: '',
    })

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                price: product.price || '',
                stock: product.stock ?? '',
                description: product.description || '',
            })
        }
    }, [product])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.error('Nome do produto é obrigatório.')
            return
        }
        const price = parseFloat(formData.price)
        const stock = parseInt(formData.stock)
        if (isNaN(price) || price < 0) {
            toast.error('Preço inválido.')
            return
        }
        if (isNaN(stock) || stock < 0) {
            toast.error('Estoque inválido.')
            return
        }

        setLoading(true)
        const payload = {
            name: formData.name.trim(),
            price,
            stock,
            description: formData.description || null,
        }

        try {
            let data, error
            if (isEditing) {
                ;({ data, error } = await supabase
                    .from('crm_products')
                    .update(payload)
                    .eq('id', product.id)
                    .select())
            } else {
                ;({ data, error } = await supabase
                    .from('crm_products')
                    .insert([payload])
                    .select())
            }
            if (error) throw error
            toast.success(isEditing ? 'Produto atualizado!' : 'Produto cadastrado!')
            onSave(data[0])
        } catch (err) {
            console.error('Error saving product:', err)
            toast.error('Erro ao salvar produto. Verifique sua conexão.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-card fade-in" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{isEditing ? 'Editar Produto' : 'Novo Produto'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Nome do Produto *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Ex: Apostila de Feltro"
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Preço (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                            required
                            placeholder="0,00"
                        />
                    </div>
                    <div className="input-group">
                        <label>{isEditing ? 'Estoque' : 'Estoque Inicial'}</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.stock}
                            onChange={e => setFormData({ ...formData, stock: e.target.value })}
                            required
                            placeholder="0"
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label>Descrição (Opcional)</label>
                    <textarea
                        rows="3"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Detalhes do produto..."
                        style={{ resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                        {loading ? (
                            <><span className="spinner" style={{ width: '14px', height: '14px' }} /> Salvando...</>
                        ) : (
                            isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'
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
