import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function ProductList({ onEdit }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => { fetchProducts() }, [])

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('crm_products')
                .select('*')
                .order('name')
            if (error) throw error
            setProducts(data || [])
        } catch (err) {
            console.error('Error fetching products:', err)
            toast.error('Erro ao carregar produtos.')
        } finally {
            setLoading(false)
        }
    }

    const deleteProduct = async (productId, name) => {
        if (!confirm(`Excluir o produto "${name}"?`)) return
        try {
            const { error } = await supabase.from('crm_products').delete().eq('id', productId)
            if (error) throw error
            toast.success(`"${name}" excluído.`)
            setProducts(prev => prev.filter(p => p.id !== productId))
        } catch (err) {
            toast.error('Erro ao excluir produto.')
            console.error(err)
        }
    }

    const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const filtered = search
        ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        : products

    if (loading) return (
        <div className="loading-state">
            <div className="spinner" />
            Carregando produtos...
        </div>
    )

    return (
        <div className="fade-in">
            {products.length > 6 && (
                <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    />
                    {search && (
                        <button className="btn btn-ghost" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }} onClick={() => setSearch('')}>
                            Limpar
                        </button>
                    )}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="glass-card">
                    <div className="empty-state">
                        <span className="empty-icon">🏷️</span>
                        <p>{search ? 'Nenhum produto encontrado para esta busca.' : 'Nenhum produto cadastrado ainda.'}</p>
                    </div>
                </div>
            ) : (
                <div className="grid-3">
                    {filtered.map(product => (
                        <div key={product.id} className="glass-card" style={{ position: 'relative' }}>
                            {/* Stock indicator dot */}
                            <div style={{
                                position: 'absolute',
                                top: '1.2rem',
                                right: '1.2rem',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: product.stock > 0 ? 'var(--success)' : 'var(--danger)',
                                boxShadow: `0 0 6px ${product.stock > 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`,
                            }} />

                            <div style={{ marginBottom: '0.5rem', paddingRight: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>{product.name}</h3>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'Outfit' }}>
                                    {fmt(product.price)}
                                </div>
                            </div>

                            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '1.25rem', minHeight: '2.5rem', lineHeight: 1.5 }}>
                                {product.description || <em>Sem descrição.</em>}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.8rem' }}>
                                    Estoque:{' '}
                                    <span style={{
                                        color: product.stock === 0 ? '#f87171' : product.stock < 5 ? '#fbbf24' : '#34d399',
                                        fontWeight: 700,
                                    }}>
                                        {product.stock} un
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button
                                        className="btn btn-ghost"
                                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
                                        onClick={() => onEdit(product)}
                                    >
                                        ✎ Editar
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                                        onClick={() => deleteProduct(product.id, product.name)}
                                    >
                                        🗑
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filtered.length > 0 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'right' }}>
                    {filtered.length} produto{filtered.length !== 1 ? 's' : ''}
                    {search ? ` (de ${products.length})` : ''}
                </p>
            )}
        </div>
    )
}
