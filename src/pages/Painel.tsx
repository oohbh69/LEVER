import { useState, type FormEvent } from 'react'

interface PainelPageProps {
  onLogin?: () => void
}

export function PainelPage({ onLogin }: PainelPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleAction = (e: FormEvent) => {
    e.preventDefault()
    onLogin?.()
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
        padding: '2rem 1.25rem',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '380px', width: '100%' }}>
        <h1
          className="page-title"
          style={{ textAlign: 'center', marginBottom: '2rem' }}
        >
          Login
        </h1>

        <form onSubmit={handleAction} className="custom-form">
          <div className="form-group">
            <label htmlFor="painel-email">E-mail</label>
            <input
              type="email"
              id="painel-email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="painel-password">Senha</label>
            <input
              type="password"
              id="painel-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="button"
            onClick={handleAction}
            className="submit-btn"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  )
}
