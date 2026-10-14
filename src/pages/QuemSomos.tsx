export function QuemSomosPage() {
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <span className="page-category">Nossa História</span>
        <h1 className="page-title">Quem Somos</h1>
        <p className="page-subtitle">
          Nascida em 2020 para transformar o conceito de óculos de sol na cultura urbana contemporânea.
        </p>
      </div>

      <div className="page-content-box">
        <section className="manifesto-card">
          <h2>Nosso Manifesto</h2>
          <p className="manifesto-quote">
            "Não criamos apenas armações. Criamos a perspectiva através da qual você enxerga a sua identidade."
          </p>
        </section>

        <section className="about-grid">
          <div className="about-item">
            <h3>Origem & Visão</h3>
            <p>
              Fundada em 2020, a <strong>LEVER Glasses</strong> surgiu da inquietação diante de um mercado de eyewear dominado por marcas tradicionais de preços exorbitantes ou produtos genéricos sem personalidade e sem proteção real. Decidimos criar uma alternativa autêntica com raízes no design minimalista e streetwear.
            </p>
          </div>

          <div className="about-item">
            <h3>Engenharia & Materiais</h3>
            <p>
              Cada modelo da LEVER é projetado utilizando <strong>acetato reforçado de alta densidade</strong> e dobradiças metálicas articuladas que oferecem resistência e durabilidade prolongada, sem perder o conforto anatômico no rosto.
            </p>
          </div>

          <div className="about-item">
            <h3>Proteção UV400 Real</h3>
            <p>
              Segurança ocular é prioridade máxima. Nossas lentes passam por testes laboratoriais rigorosos de filtragem óptica, bloqueando 100% da radiação ultravioleta prejudicial (UVA e UVB).
            </p>
          </div>

          <div className="about-item">
            <h3>Compromisso com Você</h3>
            <p>
              Oferecemos atendimento humanizado, envio rápido com seguro para todo o Brasil e a garantia exclusiva de <strong>7 dias para testar</strong> no seu dia a dia.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
