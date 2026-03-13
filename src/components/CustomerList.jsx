import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CustomerList({ onEdit }) {
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('crm_customers')
                .select('*')
                .order('name')
            if (error) throw error
            setCustomers(data || [])
        } catch (error) {
            console.error('Error fetching customers:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteCustomer = async (id, name) => {
        if (!confirm(`Excluir o cliente "${name}"? Esta ação não pode ser desfeita.`)) return
        try {
            const { error } = await supabase.from('crm_customers').delete().eq('id', id)
            if (error) throw error
            setCustomers(prev => prev.filter(c => c.id !== id))
        } catch (error) {
            alert('Erro ao excluir cliente.')
            console.error(error)
        }
    }

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search) ||
        (c.cpf || '').includes(search)
    )

    if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando clientes...</div>

    return (
        <div className="fade-in">
            {customers.length > 4 && (
                <div style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        placeholder="🔍  Buscar por nome ou telefone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ maxWidth: '400px' }}
                    />
                </div>
            )}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <tr>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Nome</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>WhatsApp / Telefone</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Localização</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {search ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map(customer => (
                                <tr key={customer.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{customer.name}</td>
                                    <td style={{ padding: '1rem' }}>
                                        {customer.phone
                                            ? <a 
                                                href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                style={{ color: '#34d399', textDecoration: 'none', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                              >
                                                📱 {customer.phone}
                                            </a>
                                            : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        }
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                        {customer.zip_code ? `[${customer.zip_code}] ` : ''}
                                        {customer.address ? `${customer.address}${customer.address_number ? `, ${customer.address_number}` : ''}` : ''}
                                        {customer.bairro ? ` - ${customer.bairro}` : ''}
                                        {customer.city ? ` - ${customer.city}${customer.state ? `/${customer.state.toUpperCase()}` : ''}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginRight: '0.4rem' }}
                                            onClick={() => onEdit(customer)}
                                        >
                                            ✎ Editar
                                        </button>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: 'var(--status-debt)', borderColor: 'rgba(239,68,68,0.3)' }}
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
            {filtered.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'right' }}>
                    {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
                </p>
            )}
        </div>
    )
}
