import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ProductForm({ onSave, onCancel, product }) {
    const isEditing = Boolean(product)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        stock: '',
        description: ''
    })

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                price: product.price || '',
                stock: product.stock ?? '',
                description: product.description || ''
            })
        }
    }, [product])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            description: formData.description
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
            onSave(data[0])
        } catch (error) {
            console.error('Error saving product:', error)
            alert('Erro ao salvar produto. Verifique sua conexão.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-card fade-in" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{isEditing ? 'Editar Produto' : 'Novo Produto'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Nome do Produto</label>
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
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                        {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Produto')}
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}
