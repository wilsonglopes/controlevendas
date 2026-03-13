import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function CustomerForm({ customer, onSave, onCancel }) {
    const isEditing = !!customer
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        address: customer?.address || '',
        address_number: customer?.address_number || '',
        zip_code: customer?.zip_code || '',
        city: customer?.city || '',
        state: customer?.state || '',
        cpf: customer?.cpf || '',
        notes: customer?.notes || ''
    })

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
                address_number: customer.address_number || '',
                zip_code: customer.zip_code || '',
                city: customer.city || '',
                state: customer.state || '',
                cpf: customer.cpf || '',
                notes: customer.notes || ''
            })
        }
    }, [customer])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        const payload = {
            name: formData.name,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            address_number: formData.address_number || null,
            zip_code: formData.zip_code || null,
            city: formData.city || null,
            state: formData.state || null,
            cpf: formData.cpf || null,
            notes: formData.notes || null
        }
        try {
            let data, error
            if (isEditing) {
                ({ data, error } = await supabase.from('crm_customers').update(payload).eq('id', customer.id).select())
            } else {
                ({ data, error } = await supabase.from('crm_customers').insert([payload]).select())
            }
            if (error) throw error
            onSave(data[0])
        } catch (error) {
            console.error('Error saving customer:', error)
            alert('Erro ao salvar cliente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-card fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                    &larr; Voltar
                </button>
                <h2 style={{ margin: 0 }}>{isEditing ? `Editar: ${customer.name}` : 'Novo Cliente'}</h2>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Nome Completo</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Nome do cliente"
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>WhatsApp / Telefone</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                    <div className="input-group">
                        <label>E-mail</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="cliente@email.com"
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>CEP</label>
                        <input
                            type="text"
                            value={formData.zip_code}
                            onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                            placeholder="00000-000"
                        />
                    </div>
                    <div className="input-group">
                        <label>CPF</label>
                        <input
                            type="text"
                            value={formData.cpf}
                            onChange={e => {
                                let val = e.target.value.replace(/\D/g, '')
                                if (val.length <= 11) {
                                    val = val.replace(/(\d{3})(\d)/, '$1.$2')
                                    val = val.replace(/(\d{3})(\d)/, '$1.$2')
                                    val = val.replace(/(\d{3})(\d{1,2})/, '$1-$2')
                                }
                                setFormData({ ...formData, cpf: val })
                            }}
                            placeholder="000.000.000-00"
                            maxLength={14}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Endereço / Rua</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Rua, complemento"
                        />
                    </div>
                    <div className="input-group">
                        <label>Número</label>
                        <input
                            type="text"
                            value={formData.address_number}
                            onChange={e => setFormData({ ...formData, address_number: e.target.value })}
                            placeholder="123"
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Cidade</label>
                        <input
                            type="text"
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            placeholder="Cidade"
                        />
                    </div>
                    <div className="input-group">
                        <label>Estado</label>
                        <input
                            type="text"
                            value={formData.state}
                            onChange={e => setFormData({ ...formData, state: e.target.value })}
                            placeholder="UF"
                            maxLength={2}
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label>Observações</label>
                    <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Observações sobre o cliente..."
                        rows={2}
                        style={{ resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                        {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente')}
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}
