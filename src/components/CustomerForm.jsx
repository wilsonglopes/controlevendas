import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function CustomerForm({ customer, onSave, onCancel }) {
    const isEditing = !!customer
    const [loading, setLoading] = useState(false)
    const [cepLoading, setCepLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        address: customer?.address || '',
        address_number: customer?.address_number || '',
        bairro: customer?.bairro || '',
        zip_code: customer?.zip_code || '',
        city: customer?.city || '',
        state: customer?.state || '',
        cpf: customer?.cpf || '',
        notes: customer?.notes || '',
    })

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
                address_number: customer.address_number || '',
                bairro: customer.bairro || '',
                zip_code: customer.zip_code || '',
                city: customer.city || '',
                state: customer.state || '',
                cpf: customer.cpf || '',
                notes: customer.notes || '',
            })
        }
    }, [customer])

    const handleCEPBlur = async () => {
        const cep = formData.zip_code.replace(/\D/g, '')
        if (cep.length !== 8) return
        setCepLoading(true)
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            const data = await response.json()
            if (data.erro) {
                toast.error('CEP não encontrado.')
                return
            }
            setFormData(prev => ({
                ...prev,
                address: data.logradouro || prev.address,
                bairro: data.bairro || prev.bairro,
                city: data.localidade || prev.city,
                state: data.uf || prev.state,
            }))
            toast.success('Endereço preenchido automaticamente!')
        } catch (err) {
            console.error('Erro ao buscar CEP:', err)
            toast.error('Erro ao buscar CEP. Tente novamente.')
        } finally {
            setCepLoading(false)
        }
    }

    const formatPhone = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 11)
        if (digits.length <= 2) return digits
        if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
        if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    }

    const formatCPF = (val) => {
        let digits = val.replace(/\D/g, '').slice(0, 11)
        digits = digits.replace(/(\d{3})(\d)/, '$1.$2')
        digits = digits.replace(/(\d{3})(\d)/, '$1.$2')
        digits = digits.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        return digits
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.error('Nome do cliente é obrigatório.')
            return
        }
        setLoading(true)
        const payload = {
            name: formData.name.trim(),
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            address_number: formData.address_number || null,
            bairro: formData.bairro || null,
            zip_code: formData.zip_code || null,
            city: formData.city || null,
            state: formData.state || null,
            cpf: formData.cpf || null,
            notes: formData.notes || null,
        }
        try {
            let data, error
            if (isEditing) {
                ({ data, error } = await supabase.from('crm_customers').update(payload).eq('id', customer.id).select())
            } else {
                ({ data, error } = await supabase.from('crm_customers').insert([payload]).select())
            }
            if (error) throw error
            toast.success(isEditing ? 'Cliente atualizado!' : 'Cliente cadastrado!')
            onSave(data[0])
        } catch (err) {
            console.error('Error saving customer:', err)
            toast.error('Erro ao salvar cliente. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-card fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}>
                    ← Voltar
                </button>
                <h2 style={{ margin: 0 }}>{isEditing ? `Editar: ${customer.name}` : 'Novo Cliente'}</h2>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Nome Completo *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nome do cliente"
                        required
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>WhatsApp / Telefone</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
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
                        <label>CEP {cepLoading && <span style={{ color: 'var(--primary)', fontSize: '0.7rem' }}>buscando...</span>}</label>
                        <input
                            type="text"
                            value={formData.zip_code}
                            onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                            onBlur={handleCEPBlur}
                            placeholder="00000-000"
                        />
                    </div>
                    <div className="input-group">
                        <label>CPF</label>
                        <input
                            type="text"
                            value={formData.cpf}
                            onChange={e => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                            placeholder="000.000.000-00"
                            maxLength={14}
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label>Endereço / Rua</label>
                    <input
                        type="text"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Rua, Travessa, Avenida..."
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Número</label>
                        <input
                            type="text"
                            value={formData.address_number}
                            onChange={e => setFormData({ ...formData, address_number: e.target.value })}
                            placeholder="123"
                        />
                    </div>
                    <div className="input-group">
                        <label>Bairro</label>
                        <input
                            type="text"
                            value={formData.bairro}
                            onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                            placeholder="Bairro"
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
                            onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
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

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                        {loading ? (
                            <><span className="spinner" style={{ width: '14px', height: '14px' }} /> Salvando...</>
                        ) : (
                            isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'
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
