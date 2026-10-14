import { useState, type FormEvent } from 'react'

export function RastreioPage() {
  const [code, setCode] = useState('')
  const [searched, setSearched] = useState(false)

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      setSearched(true)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <span className="page-category">Localização em Tempo Real</span>
        <h1 className="page-title">Rastrear Pedido</h1>
        <p className="page-subtitle">
          Acompanhe o trajeto da sua encomenda até a porta da sua casa.
        </p>
      </div>

      <div className="tracking-container">
        <form onSubmit={handleSearch} className="tracking-search-form">
          <label htmlFor="trackingCode" className="tracking-label">
            Digite o Código de Rastreio ou Número do Pedido:
          </label>
          <div className="tracking-input-wrapper">
            <input
              type="text"
              id="trackingCode"
              required
              placeholder="Ex: BR123456789BR ou #1042"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setSearched(false)
              }}
              className="tracking-input"
            />
            <button type="submit" className="tracking-submit-btn">
              RASTREAR
            </button>
          </div>
        </form>

        {searched && (
          <div className="tracking-result-box">
            <div className="tracking-status-badge">
              <span className="status-dot"></span>
              Código consultado: <strong>{code.toUpperCase()}</strong>
            </div>

            <div className="tracking-timeline">
              <div className="timeline-step completed">
                <div className="step-marker">✓</div>
                <div className="step-info">
                  <h4>Pedido Confirmado & Faturado</h4>
                  <p>Pagamento aprovado e nota fiscal emitida.</p>
                </div>
              </div>

              <div className="timeline-step completed">
                <div className="step-marker">✓</div>
                <div className="step-info">
                  <h4>Embalado e Despachado</h4>
                  <p>Objeto postado e em trânsito para a unidade de distribuição.</p>
                </div>
              </div>

              <div className="timeline-step active">
                <div className="step-marker">●</div>
                <div className="step-info">
                  <h4>Objeto em Trânsito</h4>
                  <p>Em rota de transferência para a cidade de destino.</p>
                </div>
              </div>

              <div className="timeline-step">
                <div className="step-marker">○</div>
                <div className="step-info">
                  <h4>Saiu para Entrega</h4>
                  <p>O entregador estará a caminho do seu endereço.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="tracking-faq">
          <h3>Dúvidas Frequentes sobre Rastreamento</h3>
          <div className="faq-item">
            <h4>Onde encontro o código de rastreio?</h4>
            <p>
              O código é enviado automaticamente para o e-mail cadastrado na compra no prazo de 1 a 2 dias úteis após a aprovação do pagamento. Verifique também a pasta de Spam/Lixo Eletrônico.
            </p>
          </div>

          <div className="faq-item">
            <h4>O código não atualiza imediatamente?</h4>
            <p>
              É normal que os Correios ou a transportadora levem até 24 a 48 horas úteis após a postagem para registrar o primeiro evento no sistema de rastreamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
