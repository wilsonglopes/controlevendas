import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

export default function Auth() {
    const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    })

    const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

    const switchMode = (newMode) => {
        setMode(newMode)
        setForm({ name: '', email: '', password: '', confirmPassword: '' })
    }

    // ── Login ────────────────────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault()
        if (!form.email || !form.password) {
            toast.error('Preencha e-mail e senha.')
            return
        }
        setLoading(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: form.email.trim(),
                password: form.password,
            })
            if (error) throw error
            toast.success('Bem-vindo de volta! 👋')
        } catch (err) {
            const msg = err.message
            if (msg === 'Invalid login credentials') toast.error('E-mail ou senha incorretos.')
            else if (msg === 'Email not confirmed') toast.error('Confirme seu e-mail antes de entrar.')
            else toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    // ── Cadastro ─────────────────────────────────────────────────────────────
    const handleSignup = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) { toast.error('Informe seu nome.'); return }
        if (!form.email.trim()) { toast.error('Informe seu e-mail.'); return }
        if (form.password.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres.'); return }
        if (form.password !== form.confirmPassword) { toast.error('As senhas não conferem.'); return }

        setLoading(true)
        try {
            const { error } = await supabase.auth.signUp({
                email: form.email.trim(),
                password: form.password,
                options: {
                    data: { full_name: form.name.trim() },
                },
            })
            if (error) throw error
            toast.success('Conta criada com sucesso! Você já pode entrar.')
            switchMode('login')
        } catch (err) {
            if (err.message.includes('already registered')) toast.error('Este e-mail já está cadastrado.')
            else toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    // ── Recuperar senha ──────────────────────────────────────────────────────
    const handleReset = async (e) => {
        e.preventDefault()
        if (!form.email.trim()) { toast.error('Informe seu e-mail.'); return }
        setLoading(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim())
            if (error) throw error
            toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
            switchMode('login')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handlers = { login: handleLogin, signup: handleSignup, reset: handleReset }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
        }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>

                {/* ── Logo ── */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '60px', height: '60px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.9rem', margin: '0 auto 1rem',
                        boxShadow: '0 12px 40px rgba(139,92,246,0.45)',
                    }}>
                        💎
                    </div>
                    <h1 style={{ fontSize: '1.65rem', marginBottom: '0.35rem', fontFamily: 'Outfit' }}>
                        ControleVendas
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {mode === 'login' && 'Entre na sua conta para continuar'}
                        {mode === 'signup' && 'Crie sua conta gratuitamente'}
                        {mode === 'reset' && 'Recupere o acesso à sua conta'}
                    </p>
                </div>

                {/* ── Card ── */}
                <div className="glass-card" style={{ padding: '2rem' }}>

                    {/* Tabs Login / Cadastro */}
                    {mode !== 'reset' && (
                        <div style={{
                            display: 'flex', gap: '0',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '10px',
                            padding: '4px',
                            marginBottom: '1.75rem',
                        }}>
                            {['login', 'signup'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => switchMode(m)}
                                    style={{
                                        flex: 1, padding: '0.5rem',
                                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                                        fontSize: '0.875rem', fontWeight: 600,
                                        fontFamily: 'Inter, sans-serif',
                                        transition: 'all 0.2s',
                                        background: mode === m
                                            ? 'linear-gradient(135deg, var(--primary), var(--primary-hover))'
                                            : 'transparent',
                                        color: mode === m ? 'white' : 'var(--text-muted)',
                                        boxShadow: mode === m ? '0 4px 14px rgba(139,92,246,0.35)' : 'none',
                                    }}
                                >
                                    {m === 'login' ? '🔑 Entrar' : '✨ Criar conta'}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Título modo reset */}
                    {mode === 'reset' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.3rem' }}>🔒 Recuperar senha</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Enviaremos um link de redefinição para seu e-mail.
                            </p>
                        </div>
                    )}

                    {/* ── Formulário ── */}
                    <form onSubmit={handlers[mode]}>
                        {/* Nome — apenas no cadastro */}
                        {mode === 'signup' && (
                            <div className="input-group">
                                <label>Nome Completo</label>
                                <input
                                    type="text"
                                    placeholder="Seu nome completo"
                                    value={form.name}
                                    onChange={set('name')}
                                    autoComplete="name"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* E-mail */}
                        <div className="input-group">
                            <label>E-mail</label>
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                value={form.email}
                                onChange={set('email')}
                                autoComplete="email"
                                autoFocus={mode !== 'signup'}
                            />
                        </div>

                        {/* Senha */}
                        {mode !== 'reset' && (
                            <div className="input-group">
                                <label>Senha</label>
                                <input
                                    type="password"
                                    placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
                                    value={form.password}
                                    onChange={set('password')}
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                />
                            </div>
                        )}

                        {/* Confirmar senha */}
                        {mode === 'signup' && (
                            <div className="input-group">
                                <label>Confirmar Senha</label>
                                <input
                                    type="password"
                                    placeholder="Repita a senha"
                                    value={form.confirmPassword}
                                    onChange={set('confirmPassword')}
                                    autoComplete="new-password"
                                />
                            </div>
                        )}

                        {/* Esqueceu a senha — link */}
                        {mode === 'login' && (
                            <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => switchMode('reset')}
                                    style={{
                                        background: 'none', border: 'none',
                                        color: 'var(--text-muted)', cursor: 'pointer',
                                        fontSize: '0.78rem', fontFamily: 'inherit',
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={e => e.target.style.color = 'var(--primary)'}
                                    onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                                >
                                    Esqueceu a senha?
                                </button>
                            </div>
                        )}

                        {/* Botão principal */}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{
                                width: '100%', justifyContent: 'center',
                                padding: '0.75rem', fontSize: '0.95rem',
                                marginTop: '0.25rem',
                            }}
                            disabled={loading}
                        >
                            {loading ? (
                                <><span className="spinner" style={{ width: '14px', height: '14px' }} /> Aguarde...</>
                            ) : (
                                <>
                                    {mode === 'login' && '→ Entrar'}
                                    {mode === 'signup' && '✨ Criar Conta'}
                                    {mode === 'reset' && '📧 Enviar link'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Voltar do reset */}
                    {mode === 'reset' && (
                        <button
                            onClick={() => switchMode('login')}
                            style={{
                                marginTop: '1rem', width: '100%',
                                background: 'none', border: 'none',
                                color: 'var(--text-muted)', cursor: 'pointer',
                                fontSize: '0.82rem', fontFamily: 'inherit',
                            }}
                        >
                            ← Voltar para o login
                        </button>
                    )}
                </div>

                {/* Footer */}
                <p style={{
                    textAlign: 'center', marginTop: '1.5rem',
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                    opacity: 0.6,
                }}>
                    Seus dados são protegidos com criptografia.
                </p>
            </div>
        </div>
    )
}
