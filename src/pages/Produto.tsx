import { useState, useRef } from 'react'

interface ProductPageProps {
  productTitle?: string
  category?: string
  imagesCount?: number
}

export function ProdutoPage({
  productTitle = 'Óculos de Sol LEVER Blackout Acetato UV400',
  category = 'Eyewear / Coleção Exclusiva',
  imagesCount = 4,
}: ProductPageProps) {
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)

  // Ref e Lógica para arrastar o carrossel de vídeos
  const videoCarouselRef = useRef<HTMLDivElement>(null)
  const isVideoDraggingRef = useRef(false)
  const startVideoXRef = useRef(0)
  const scrollVideoLeftRef = useRef(0)
  const hasVideoMovedRef = useRef(false)
  const [isVideoDragging, setIsVideoDragging] = useState(false)

  const handleVideoScroll = (direction: 'left' | 'right') => {
    if (videoCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340
      videoCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleVideoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!videoCarouselRef.current) return
    isVideoDraggingRef.current = true
    hasVideoMovedRef.current = false
    startVideoXRef.current = e.pageX - videoCarouselRef.current.offsetLeft
    scrollVideoLeftRef.current = videoCarouselRef.current.scrollLeft
  }

  const handleVideoPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isVideoDraggingRef.current || !videoCarouselRef.current) return
    const x = e.pageX - videoCarouselRef.current.offsetLeft
    const walk = x - startVideoXRef.current

    if (Math.abs(walk) > 4) {
      hasVideoMovedRef.current = true
      if (!isVideoDragging) setIsVideoDragging(true)
      videoCarouselRef.current.scrollLeft = scrollVideoLeftRef.current - walk
    }
  }

  const handleVideoPointerUpOrCancel = () => {
    isVideoDraggingRef.current = false
    setTimeout(() => {
      setIsVideoDragging(false)
      hasVideoMovedRef.current = false
    }, 50)
  }

  const imageLabels = [
    'Vista Frontal',
    'Vista Lateral / Haste',
    'Ângulo 45°',
    'Detalhe das Dobradiças',
  ]

  return (
    <div className="product-page-container">
      <div className="product-detail-layout">
        {/* Sessão de Imagens */}
        <div className="product-gallery-section">
          <div className="main-image-wrapper">
            <span className="product-badge">NOVO</span>
            <div className="main-image-placeholder">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="gallery-placeholder-icon"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="gallery-placeholder-label">
                Foto {activeImage + 1} de {imagesCount} • {imageLabels[activeImage]}
              </span>
              <span className="gallery-placeholder-spec">Proporção Padrão 1x1</span>
            </div>
          </div>

          {/* Miniaturas de Imagens */}
          <div className="thumbnails-row">
            {Array.from({ length: imagesCount }).map((_, index) => (
              <button
                key={index}
                type="button"
                className={`thumbnail-btn ${activeImage === index ? 'active' : ''}`}
                onClick={() => setActiveImage(index)}
                aria-label={`Ver ${imageLabels[index]}`}
              >
                <div className="thumbnail-placeholder">
                  <span className="thumb-num">{index + 1}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Coluna de Informações do Produto */}
        <div className="product-info-column">
          {/* Sessão de Título */}
          <div className="product-title-section">
            <span className="product-pdp-category">{category}</span>
            <h1 className="product-pdp-title">{productTitle}</h1>
            <div className="product-title-divider"></div>
          </div>

          {/* Sessão de Preço */}
          <div className="product-price-section">
            <div className="price-row">
              <span className="price-old">de R$ 299,90</span>
              <span className="price-by">por</span>
              <span className="price-current">R$ 149,90</span>
              <span className="price-discount-tag">50% OFF</span>
            </div>

            <p className="price-installments">
              ou 6x de R$ 24,98 sem juros no cartão de crédito
            </p>
          </div>

          {/* Seletor de Quantidade & Botão Adicionar ao Carrinho */}
          <div className="product-actions-section">
            <div className="quantity-and-cart-row">
              <div className="quantity-selector">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  aria-label="Diminuir quantidade"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  aria-label="Aumentar quantidade"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="pdp-add-cart-btn"
                onClick={() => {
                  setAddedToCart(true)
                  setTimeout(() => setAddedToCart(false), 2200)
                }}
              >
                {addedToCart ? '✓ ADICIONADO AO CARRINHO' : 'ADICIONAR AO CARRINHO'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sessão Quem usa, recomenda */}
      <section className="testimonials-video-section" aria-labelledby="recommend-heading">
        <div className="section-header">
          <h2 id="recommend-heading" className="recommend-title">
            Quem usa, recomenda
          </h2>

          <div className="carousel-controls">
            <button
              type="button"
              className="carousel-nav-btn"
              onClick={() => handleVideoScroll('left')}
              aria-label="Vídeo anterior"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className="carousel-nav-btn"
              onClick={() => handleVideoScroll('right')}
              aria-label="Próximo vídeo"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className={`video-carousel-container ${isVideoDragging ? 'is-dragging' : ''}`}
          ref={videoCarouselRef}
          onPointerDown={handleVideoPointerDown}
          onPointerMove={handleVideoPointerMove}
          onPointerUp={handleVideoPointerUpOrCancel}
          onPointerCancel={handleVideoPointerUpOrCancel}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="video-card-slot">
              <div className="video-placeholder-16-9">
                <span className="video-ratio-tag">9:16 Vertical</span>
                <div className="video-play-indicator">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <span className="video-slot-label">Espaço para Vídeo {index + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sessão de Benefícios (2 colunas) */}
      <section className="pdp-benefits-section" aria-label="Benefícios e Garantias">
        <div className="pdp-benefits-grid">
          {/* Benefício 1: Envio Rápido */}
          <article className="pdp-benefit-card">
            <div className="pdp-benefit-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="pdp-benefit-info">
              <h3 className="pdp-benefit-title">Envio Rápido</h3>
              <p className="pdp-benefit-desc">
                Após o pagamento ser aprovado enviamos seu pedido em até 24h úteis
              </p>
            </div>
          </article>

          {/* Benefício 2: Pagamento Seguro */}
          <article className="pdp-benefit-card">
            <div className="pdp-benefit-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div className="pdp-benefit-info">
              <h3 className="pdp-benefit-title">Pagamento Seguro</h3>
              <p className="pdp-benefit-desc">
                Nossos pagamentos são processados pelo Mercado Pago.
              </p>
            </div>
          </article>

          {/* Benefício 3: 7 Dias para testar */}
          <article className="pdp-benefit-card">
            <div className="pdp-benefit-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l3 3" />
              </svg>
            </div>
            <div className="pdp-benefit-info">
              <h3 className="pdp-benefit-title">7 Dias para testar</h3>
              <p className="pdp-benefit-desc">
                Comprou e não gostou? Você tem até 7 dias para realizar a devolução
              </p>
            </div>
          </article>

          {/* Benefício 4: Garantia Lever */}
          <article className="pdp-benefit-card">
            <div className="pdp-benefit-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </div>
            <div className="pdp-benefit-info">
              <h3 className="pdp-benefit-title">Garantia Lever</h3>
              <p className="pdp-benefit-desc">
                Você terá total suporte em caso de problemas com produto.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Sessão Ficha técnica e medidas */}
      <section className="pdp-specs-section" aria-labelledby="specs-heading">
        <div className="section-header">
          <h2 id="specs-heading" className="specs-section-title">
            Ficha técnica e medidas
          </h2>
        </div>

        <div className="pdp-specs-grid">
          {/* Coluna 1: Lente e Armação */}
          <div className="pdp-specs-card">
            <h3 className="specs-card-title">Especificações</h3>

            <div className="specs-materials-list">
              {/* Lente */}
              <div className="spec-material-item">
                <div className="spec-material-header">
                  <div className="spec-material-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3a9 9 0 0 0 0 18" />
                    </svg>
                  </div>
                  <span className="spec-material-name">Lente</span>
                </div>
                <p className="spec-material-desc">
                  Policarbonato premium com proteção total UV400 contra raios UVA e UVB. Resistente a impactos com tratamento antirrisco.
                </p>
              </div>

              {/* Armação */}
              <div className="spec-material-item">
                <div className="spec-material-header">
                  <div className="spec-material-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 11h3l2 4h8l2-4h3" />
                      <circle cx="6.5" cy="14.5" r="3.5" />
                      <circle cx="17.5" cy="14.5" r="3.5" />
                    </svg>
                  </div>
                  <span className="spec-material-name">Armação</span>
                </div>
                <p className="spec-material-desc">
                  Acetato italiano de alta densidade moldado à mão, com alma metálica interna nas hastes e dobradiças de aço inoxidável.
                </p>
              </div>
            </div>
          </div>

          {/* Coluna 2: Medidas do produto */}
          <div className="pdp-specs-card">
            <div className="specs-card-header-flex">
              <h3 className="specs-card-title">Medidas do produto</h3>
              <span className="specs-unit-badge">Padrão em mm</span>
            </div>

            <div className="specs-measurements-list">
              <div className="measurement-item">
                <span className="measurement-label">Largura total</span>
                <span className="measurement-guide-line"></span>
                <span className="measurement-num">142 mm</span>
              </div>

              <div className="measurement-item">
                <span className="measurement-label">Largura da lente</span>
                <span className="measurement-guide-line"></span>
                <span className="measurement-num">52 mm</span>
              </div>

              <div className="measurement-item">
                <span className="measurement-label">Altura de lente</span>
                <span className="measurement-guide-line"></span>
                <span className="measurement-num">46 mm</span>
              </div>

              <div className="measurement-item">
                <span className="measurement-label">Ponte</span>
                <span className="measurement-guide-line"></span>
                <span className="measurement-num">19 mm</span>
              </div>

              <div className="measurement-item">
                <span className="measurement-label">Comprimento das hastes</span>
                <span className="measurement-guide-line"></span>
                <span className="measurement-num">145 mm</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sessão Sobre este modelo */}
      <section className="pdp-about-model-section" aria-labelledby="about-model-heading">
        <div className="section-header">
          <h2 id="about-model-heading" className="about-model-title">
            Sobre este modelo
          </h2>
        </div>

        <div className="about-model-layout">
          {/* Lado Esquerdo: Imagem / Foto Editorial do Modelo */}
          <div className="about-model-media">
            <div className="about-model-placeholder">
              <span className="about-model-tag">Editorial & Design</span>
              <div className="about-model-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <span className="about-model-placeholder-text">Espaço para foto de uso / editorial</span>
            </div>
          </div>

          {/* Lado Direito: Conteúdo e Narrativa */}
          <div className="about-model-content">
            <div className="about-model-header-block">
              <span className="about-model-subtitle">Coleção Essencial</span>
              <h3 className="about-model-headline">
                A fusão equilibrada entre presença marcante e conforto diário
              </h3>
            </div>

            <div className="about-model-text-block">
              <p>
                Desenvolvido para quem valoriza autenticidade e linhas precisas, este modelo traz proporções calibradas que harmonizam com diferentes formatos de rosto.
              </p>
              <p>
                A estrutura em acetato nobre oferece resistência e firmeza sem perder a leveza, enquanto o acabamento polido artesanalmente garante caimento suave sobre o septo e têmporas.
              </p>
            </div>

            {/* Destaques do Modelo */}
            <div className="about-model-pillars">
              <div className="about-model-pillar">
                <span className="pillar-num">01</span>
                <div className="pillar-info">
                  <h4 className="pillar-title">Design Autoral</h4>
                  <p className="pillar-desc">Silhueta atemporal pensada para transcender tendências passageiras com elegância discreta.</p>
                </div>
              </div>

              <div className="about-model-pillar">
                <span className="pillar-num">02</span>
                <div className="pillar-info">
                  <h4 className="pillar-title">Conforto Anatômico</h4>
                  <p className="pillar-desc">Distribuição de peso balanceada para evitar marcas no nariz ou incômodos no uso prolongado.</p>
                </div>
              </div>

              <div className="about-model-pillar">
                <span className="pillar-num">03</span>
                <div className="pillar-info">
                  <h4 className="pillar-title">Durabilidade Superior</h4>
                  <p className="pillar-desc">Alma metálica interna e dobradiças sólidas projetadas para acompanhar sua rotina diária.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
