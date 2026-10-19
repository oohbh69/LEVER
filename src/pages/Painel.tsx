import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

interface PainelPageProps {
  onLogin?: () => void
  onBackToStore?: () => void
}

export function PainelPage({ onLogin, onBackToStore }: PainelPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setErrorMessage('Informe seu e-mail e sua senha para continuar.')
      return
    }

    setErrorMessage(null)
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_credentials')
        ) {
          setErrorMessage('E-mail ou senha incorretos.')
        } else {
          setErrorMessage(error.message)
        }
        return
      }

      if (data.session) {
        onLogin?.()
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao realizar login.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        backgroundColor: '#fafafa',
        boxSizing: 'border-box',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '2.5rem 2rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          boxSizing: 'border-box',
        }}
      >
        {/* Header / Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/lever-logo-cropped.png"
            alt="LEVER"
            style={{ height: '36px', width: 'auto', marginBottom: '1rem', display: 'inline-block' }}
          />
          <h1
            style={{
              fontSize: '1.25rem',
              color: '#111827',
              margin: '0 0 0.35rem 0',
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            Painel Administrativo
          </h1>
          <p
            style={{
              fontSize: '0.82rem',
              color: '#6b7280',
              margin: 0,
              fontWeight: 400,
            }}
          >
            Acesse para gerenciar produtos, pedidos e frete
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
              fontWeight: 400,
              lineHeight: '1.4',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label
              htmlFor="painel-email"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                color: '#374151',
                marginBottom: '0.4rem',
                fontWeight: 400,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              E-mail
            </label>
            <input
              type="email"
              id="painel-email"
              placeholder="lever@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={{
                width: '100%',
                height: '42px',
                padding: '0 0.85rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.88rem',
                color: '#111827',
                backgroundColor: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
                fontWeight: 400,
                transition: 'border-color 0.15s ease',
              }}
            />
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem',
              }}
            >
              <label
                htmlFor="painel-password"
                style={{
                  fontSize: '0.78rem',
                  color: '#374151',
                  margin: 0,
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                Senha
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="painel-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 2.5rem 0 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.88rem',
                  color: '#111827',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontWeight: 400,
                  transition: 'border-color 0.15s ease',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              height: '44px',
              marginTop: '0.5rem',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 400,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.75 : 1,
              transition: 'background-color 0.2s ease, opacity 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {isLoading ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                <span>Acessando...</span>
              </>
            ) : (
              'Entrar no Painel'
            )}
          </button>
        </form>

        {/* Voltar para a loja */}
        {onBackToStore && (
          <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
            <button
              type="button"
              onClick={onBackToStore}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: 400,
                padding: '0.25rem 0.5rem',
                transition: 'color 0.15s ease',
              }}
            >
              ← Voltar para a loja
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
