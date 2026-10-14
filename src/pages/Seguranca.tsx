export function SegurancaPage() {
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <span className="page-category">Transparência & Confiança</span>
        <h1 className="page-title">É Seguro Comprar na LEVER?</h1>
        <p className="page-subtitle">
          Sua privacidade, seus dados e o seu investimento estão 100% blindados em cada etapa da sua experiência.
        </p>
      </div>

      <div className="page-content-box">
        <div className="security-cards-grid">
          <div className="security-feature-card">
            <div className="security-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h3>Processamento Mercado Pago</h3>
            <p>
              Todos os pagamentos por Cartão de Crédito e Pix são processados diretamente pela infraestrutura de segurança antifraude do <strong>Mercado Pago</strong>. A LEVER não armazena nenhuma informação financeira ou número de cartão.
            </p>
          </div>

          <div className="security-feature-card">
            <div className="security-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h3>Criptografia SSL de 256 Bits</h3>
            <p>
              Toda a navegação pelo nosso site é protegida pelo protocolo <strong>HTTPS com certificado SSL</strong>, garantindo que dados cadastrais e mensagens sejam transmitidos de forma totalmente confidencial e criptografada.
            </p>
          </div>

          <div className="security-feature-card">
            <div className="security-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <h3>Entrega Garantida com Seguro</h3>
            <p>
              Todos os envios contam com <strong>seguro contra extravio, furto ou danos</strong> no transporte. Se acontecer qualquer imprevisto no caminho, garantimos o reenvio imediato ou o reembolso integral do seu dinheiro.
            </p>
          </div>

          <div className="security-feature-card">
            <div className="security-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </div>
            <h3>7 Dias de Teste sem Compromisso</h3>
            <p>
              Queremos que você ame seus óculos. Recebeu o produto e não combinou com o seu estilo? Você tem <strong>7 dias corridos</strong> após a entrega para solicitar a troca ou devolução sem complicações.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
