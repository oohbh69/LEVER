import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function ContatoPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    pedido: '',
    mensagem: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSending(true)

    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: formData.nome.trim(),
        email: formData.email.trim(),
        phone: formData.telefone.trim() || null,
        order_number: formData.pedido.trim() || null,
        message: formData.mensagem.trim(),
        status: 'novo',
      })

      if (error) {
        throw error
      }

      setSubmitted(true)
    } catch (err: any) {
      console.error('Erro ao enviar mensagem de contato:', err)
      setErrorMessage(
        err.message || 'Não foi possível enviar sua mensagem no momento. Tente novamente ou use nossos canais diretos.'
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <span className="page-category">Suporte & Atendimento</span>
        <h1 className="page-title">Fale Conosco</h1>
        <p className="page-subtitle">
          Dúvidas sobre seu pedido, produtos ou sugestões? Nossa equipe está pronta para te atender.
        </p>
      </div>

      <div className="page-content-grid">
        <div className="contact-info-card">
          <h2 className="content-heading">Canais Diretos</h2>

          <div className="contact-info-item">
            <span className="contact-info-label">E-mail Oficial</span>
            <a href="mailto:leverglasses@gmail.com" className="contact-link">
              leverglasses@gmail.com
            </a>
          </div>

          <div className="contact-info-item">
            <span className="contact-info-label">Telefone & WhatsApp</span>
            <a href="tel:+5511920713667" className="contact-link">
              11 92071-3667
            </a>
          </div>

          <div className="contact-info-item">
            <span className="contact-info-label">Horário de Atendimento</span>
            <p className="contact-info-text">Segunda a Sexta: 09h às 18h</p>
            <p className="contact-info-text">Sábado: 09h às 13h</p>
          </div>

          <div className="contact-info-item">
            <span className="contact-info-label">Prazo de Resposta</span>
            <p className="contact-info-text">Respondemos em até 24 horas úteis.</p>
          </div>
        </div>

        <div className="contact-form-container">
          <h2 className="content-heading">Envie uma Mensagem</h2>

          {submitted ? (
            <div className="form-success-box">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h3>Mensagem Enviada!</h3>
              <p>Obrigado pelo contato. Retornaremos em breve no e-mail informado.</p>
              <button
                type="button"
                className="action-btn"
                onClick={() => {
                  setSubmitted(false)
                  setFormData({ nome: '', email: '', telefone: '', pedido: '', mensagem: '' })
                }}
              >
                ENVIAR OUTRA MENSAGEM
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="custom-form">
              <div className="form-group">
                <label htmlFor="nome">Nome Completo *</label>
                <input
                  type="text"
                  id="nome"
                  required
                  placeholder="Seu nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">E-mail *</label>
                  <input
                    type="email"
                    id="email"
                    required
                    placeholder="seuemail@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="telefone">WhatsApp / Telefone</label>
                  <input
                    type="tel"
                    id="telefone"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="pedido">Número do Pedido (se houver)</label>
                <input
                  type="text"
                  id="pedido"
                  placeholder="Ex: #1042"
                  value={formData.pedido}
                  onChange={(e) => setFormData({ ...formData, pedido: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="mensagem">Mensagem *</label>
                <textarea
                  id="mensagem"
                  required
                  rows={5}
                  placeholder="Como podemos te ajudar?"
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                />
              </div>

              {errorMessage && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  {errorMessage}
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={isSending}>
                {isSending ? 'ENVIANDO...' : 'ENVIAR MENSAGEM'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
