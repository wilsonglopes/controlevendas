import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ProductList({ onEdit }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('crm_products')
                .select('*')
                .order('name')

            if (error) throw error
            setProducts(data || [])
        } catch (error) {
            console.error('Error fetching products:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteProduct = async (productId) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return
        try {
            const { error } = await supabase.from('crm_products').delete().eq('id', productId)
            if (error) throw error
            setProducts(prev => prev.filter(p => p.id !== productId))
        } catch (error) {
            alert('Erro ao excluir produto.')
            console.error(error)
        }
    }

    if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando produtos...</div>

    return (
        <div className="grid-3 fade-in">
            {products.length === 0 ? (
                <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Nenhum produto encontrado.</p>
                </div>
            ) : (
                products.map(product => (
                    <div key={product.id} className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.2rem' }}>{product.name}</h3>
                            <div style={{ color: 'var(--accent)', fontWeight: 700 }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                            </div>
                        </div>

                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', minHeight: '3rem' }}>
                            {product.description || 'Sem descrição.'}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Estoque: <span style={{ color: product.stock > 0 ? 'var(--status-paid)' : 'var(--status-debt)', fontWeight: 600 }}>{product.stock} un</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                    onClick={() => onEdit(product)}
                                >
                                    ✎ Editar
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: 'var(--status-debt)', borderColor: 'rgba(239,68,68,0.3)' }}
                                    onClick={() => deleteProduct(product.id)}
                                    title="Excluir produto"
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}
