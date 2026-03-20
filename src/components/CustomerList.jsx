import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 25

export default function CustomerList({ onEdit }) {
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)

    useEffect(() => { fetchCustomers() }, [])

    const fetchCustomers = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('crm_customers')
                .select('*')
                .order('name')
            if (error) throw error
            setCustomers(data || [])
        } catch (err) {
            console.error('Error fetching customers:', err)
            toast.error('Erro ao carregar clientes.')
        } finally {
            setLoading(false)
        }
    }

    const deleteCustomer = async (id, name) => {
        if (!confirm(`Excluir o cliente "${name}"? Esta ação não pode ser desfeita.`)) return
        try {
            const { error } = await supabase.from('crm_customers').delete().eq('id', id)
            if (error) throw error
            toast.success(`Cliente "${name}" excluído.`)
            setCustomers(prev => prev.filter(c => c.id !== id))
        } catch (err) {
            toast.error('Erro ao excluir cliente.')
            console.error(err)
        }
    }

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search) ||
        (c.cpf || '').includes(search) ||
        (c.city || '').toLowerCase().includes(search.toLowerCase())
    )

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const safePage = Math.min(page, totalPages || 1)
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

    const handleSearch = (e) => {
        setSearch(e.target.value)
        setPage(1)
    }

    if (loading) return (
        <div className="loading-state">
            <div className="spinner" />
            Carregando clientes...
        </div>
    )

    return (
        <div className="fade-in">
            {customers.length > 5 && (
                <div className="filter-bar">
                    <input
                        type="text"
                        placeholder="Buscar por nome, telefone, CPF ou cidade..."
                        value={search}
                        onChange={handleSearch}
                        style={{ maxWidth: '400px', flex: 1 }}
                    />
                    {search && (
                        <button
                            className="btn btn-ghost"
                            style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
                            onClick={() => { setSearch(''); setPage(1) }}
                        >
                            Limpar
                        </button>
                    )}
                </div>
            )}

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Nome</th>
                            <th style={{ textAlign: 'left' }}>WhatsApp / Telefone</th>
                            <th style={{ textAlign: 'left' }}>Localização</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan="4">
                                    <div className="empty-state">
                                        <span className="empty-icon">👥</span>
                                        <p>{search ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginated.map(customer => (
                                <tr key={customer.id}>
                                    <td style={{ fontWeight: 500 }}>{customer.name}</td>
                                    <td>
                                        {customer.phone ? (
                                            <a
                                                href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#34d399', fontSize: '0.85rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                            >
                                                📱 {customer.phone}
                                            </a>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: '0.82rem', color: 'var(--text-light)', maxWidth: '280px' }}>
                                        {[
                                            customer.address && `${customer.address}${customer.address_number ? `, ${customer.address_number}` : ''}`,
                                            customer.bairro,
                                            customer.city && `${customer.city}${customer.state ? `/${customer.state.toUpperCase()}` : ''}`,
                                        ].filter(Boolean).join(' · ') || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', marginRight: '0.3rem' }}
                                            onClick={() => onEdit(customer)}
                                        >
                                            ✎ Editar
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                                            onClick={() => deleteCustomer(customer.id, customer.name)}
                                        >
                                            🗑
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
                <div className="pagination">
                    <span>
                        {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
                        {search ? ` (filtrados de ${customers.length})` : ''}
                    </span>
                    {totalPages > 1 && (
                        <div className="pagination-controls">
                            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
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
                                        : <button key={item} className={`page-btn ${item === safePage ? 'active' : ''}`} onClick={() => setPage(item)}>{item}</button>
                                )
                            }
                            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
