import { useState, useRef, useEffect } from 'react'
import { useCart } from '../context/CartContext'

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
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [viewerImageIndex, setViewerImageIndex] = useState(0)

  // Estados do Visualizador de Reels
  const [isReelsOpen, setIsReelsOpen] = useState(false)
  const [activeReelIndex, setActiveReelIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [likedReels, setLikedReels] = useState<Record<number, boolean>>({})

  const REELS_DATA = [
    {
      id: 1,
      author: '@amanda.carvalho',
      caption: 'Completamente apaixonada pela armação e o caimento no rosto! Qualidade surreal ✨',
      likes: '1.8k',
      audio: 'LEVER Originals • Som original',
    },
    {
      id: 2,
      author: '@felipe.rocha',
      caption: 'Testando as lentes sob o sol do meio-dia. Proteção UV400 aprovadíssima 🕶️',
      likes: '2.4k',
      audio: 'Áudio em alta • Tendência',
    },
    {
      id: 3,
      author: '@beatriz.lima',
      caption: 'Unboxing rápido do meu novo óculos favorito. O estojo e a flanela são impecáveis!',
      likes: '3.1k',
      audio: 'Minimalist Beats • Lo-fi',
    },
    {
      id: 4,
      author: '@marcos.vinicius',
      caption: 'Encaixe perfeito na orelha e sem marcas no nariz. Melhor compra do ano.',
      likes: '950',
      audio: 'LEVER Studio • Soundtrack',
    },
    {
      id: 5,
      author: '@juliana.mendes',
      caption: 'Montando look de verão com o LEVER Blackout. O acabamento do acetato é lindo!',
      likes: '4.2k',
      audio: 'Summer Vibes • Remix',
    },
  ]

  const { addItem } = useCart()

  const handleAddToCart = () => {
    addItem(
      {
        id: 101,
        name: productTitle,
        price: 149.9,
        priceFormatted: 'R$ 149,90',
        installments: '6x de R$ 24,98 sem juros',
        tag: 'Destaque',
        variant: 'Acetato Preto Fosco • Lente UV400',
      },
      quantity
    )
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2200)
  }

  const openImageViewer = (index: number = activeImage) => {
    setViewerImageIndex(index)
    setIsImageViewerOpen(true)
  }

  const closeImageViewer = () => {
    setIsImageViewerOpen(false)
  }

  const openReel = (index: number) => {
    setActiveReelIndex(index)
    setIsReelsOpen(true)
  }

  const closeReels = () => {
    setIsReelsOpen(false)
  }

  // Atalhos de teclado (Esc para fechar, Setas para navegar) e trava de scroll no modal
  useEffect(() => {
    if (!isImageViewerOpen && !isReelsOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImageViewerOpen(false)
        setIsReelsOpen(false)
      } else if (isImageViewerOpen) {
        if (e.key === 'ArrowRight') {
          setViewerImageIndex((prev) => {
            const next = (prev + 1) % imagesCount
            setActiveImage(next)
            return next
          })
        } else if (e.key === 'ArrowLeft') {
          setViewerImageIndex((prev) => {
            const next = (prev - 1 + imagesCount) % imagesCount
            setActiveImage(next)
            return next
          })
        }
      } else if (isReelsOpen) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          setActiveReelIndex((prev) => (prev + 1) % REELS_DATA.length)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          setActiveReelIndex((prev) => (prev - 1 + REELS_DATA.length) % REELS_DATA.length)
        }
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isImageViewerOpen, isReelsOpen, imagesCount, REELS_DATA.length])

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
          <div
            className="main-image-wrapper"
            onClick={() => openImageViewer(activeImage)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openImageViewer(activeImage)
              }
            }}
            aria-label="Clique para abrir o visualizador de imagem"
          >
            <span className="product-badge">NOVO</span>
            <span className="main-image-zoom-indicator" title="Clique para ampliar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <span>AMPLIAR</span>
            </span>
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
          {REELS_DATA.map((reel, index) => (
            <div
              key={reel.id}
              className="video-card-slot"
              onClick={() => {
                if (!hasVideoMovedRef.current) {
                  openReel(index)
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openReel(index)
                }
              }}
              aria-label={`Assistir vídeo Reel de ${reel.author}`}
            >
              <div className="video-placeholder-16-9">
                <span className="video-ratio-tag">9:16 Reels</span>
                <div className="video-play-indicator">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <span className="video-slot-label">{reel.author}</span>
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

        <div className="about-model-text-content">
          <p>
            Desenvolvido para quem valoriza autenticidade e linhas precisas, este modelo traz proporções calibradas que harmonizam com diferentes formatos de rosto, unindo presença visual marcante e sofisticação atemporal.
          </p>
          <p>
            A estrutura em acetato nobre de alta densidade oferece resistência e estabilidade sem abrir mão da leveza, enquanto o acabamento polido artesanalmente garante caimento suave e distribuição de peso balanceada sobre o septo e têmporas.
          </p>
          <p>
            Equipado com lentes de alta definição com proteção total UV400 contra os raios UVA e UVB, é a escolha ideal para acompanhar sua rotina diária com máxima nitidez visual, proteção e conforto prolongado.
          </p>
        </div>
      </section>

      {/* Barra Fixa de Compra (Fixa desde o início da página) */}
      <aside
        className="pdp-sticky-bar"
        aria-label="Barra de compra rápida"
      >
        <div className="sticky-bar-container">
          {/* Informações Resumidas do Produto (Desktop) */}
          <div className="sticky-bar-product-info">
            <div className="sticky-product-thumb">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div className="sticky-product-text">
              <span className="sticky-product-title">{productTitle}</span>
              <span className="sticky-product-price">
                R$ 149,90 <span className="sticky-product-installments">6x de R$ 24,98 sem juros</span>
              </span>
            </div>
          </div>

          {/* Ações: Seletor à esquerda, Botão à direita */}
          <div className="sticky-bar-actions">
            <div className="quantity-selector sticky-qty-selector">
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
              className="pdp-add-cart-btn sticky-add-btn"
              onClick={handleAddToCart}
            >
              {addedToCart ? '✓ ADICIONADO AO CARRINHO' : 'ADICIONAR AO CARRINHO'}
            </button>
          </div>
        </div>
      </aside>

      {/* Visualizador de Imagem (Modal / Lightbox) */}
      {isImageViewerOpen && (
        <div
          className="image-viewer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeImageViewer()
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de imagens do produto"
        >
          {/* Barra Superior de Controles */}
          <div className="viewer-header">
            <span className="viewer-counter">
              {viewerImageIndex + 1} / {imagesCount} — {imageLabels[viewerImageIndex]}
            </span>

            <button
              type="button"
              className="viewer-close-btn"
              onClick={closeImageViewer}
              aria-label="Fechar visualizador (Esc)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Área Central da Imagem com Setas */}
          <div className="viewer-stage">
            <button
              type="button"
              className="viewer-nav-btn prev"
              onClick={(e) => {
                e.stopPropagation()
                const nextIndex = (viewerImageIndex - 1 + imagesCount) % imagesCount
                setViewerImageIndex(nextIndex)
                setActiveImage(nextIndex)
              }}
              aria-label="Foto anterior"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="viewer-image-container">
              <div className="viewer-image-placeholder">
                <svg
                  width="88"
                  height="88"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="viewer-placeholder-icon"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="viewer-image-title">
                  {productTitle}
                </span>
                <span className="viewer-image-subtitle">
                  {imageLabels[viewerImageIndex]} • Vista em Alta Resolução
                </span>
              </div>
            </div>

            <button
              type="button"
              className="viewer-nav-btn next"
              onClick={(e) => {
                e.stopPropagation()
                const nextIndex = (viewerImageIndex + 1) % imagesCount
                setViewerImageIndex(nextIndex)
                setActiveImage(nextIndex)
              }}
              aria-label="Próxima foto"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Faixa Inferior de Miniaturas */}
          <div className="viewer-thumbnails-strip">
            {Array.from({ length: imagesCount }).map((_, index) => (
              <button
                key={index}
                type="button"
                className={`viewer-thumb-btn ${viewerImageIndex === index ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setViewerImageIndex(index)
                  setActiveImage(index)
                }}
                aria-label={`Ir para foto ${index + 1}`}
              >
                <span>{index + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Visualizador de Vídeo em Formato Reels (9:16 Vertical) */}
      {isReelsOpen && (
        <div
          className="reels-viewer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeReels()
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de vídeos em formato Reels"
        >
          {/* Botão Fechar Superior */}
          <button
            type="button"
            className="reels-close-btn"
            onClick={closeReels}
            aria-label="Fechar Reels (Esc)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Seta Reel Anterior (Desktop/Tablet) */}
          <button
            type="button"
            className="reels-nav-side-btn prev"
            onClick={(e) => {
              e.stopPropagation()
              setActiveReelIndex((prev) => (prev - 1 + REELS_DATA.length) % REELS_DATA.length)
            }}
            aria-label="Reel anterior"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Cartão do Reel Vertical 9:16 */}
          <div className="reels-card">
            {/* Barra de Progresso Superior */}
            <div className="reels-progress-bar">
              <div className="reels-progress-fill"></div>
            </div>

            {/* Cabeçalho do Reel */}
            <div className="reels-card-header">
              <div className="reels-author-info">
                <div className="reels-author-avatar">
                  {REELS_DATA[activeReelIndex].author.slice(1, 3).toUpperCase()}
                </div>
                <div className="reels-author-meta">
                  <span className="reels-author-name">{REELS_DATA[activeReelIndex].author}</span>
                  <span className="reels-audio-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    {REELS_DATA[activeReelIndex].audio}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage Central / Vídeo Placeholder */}
            <div className="reels-video-stage">
              <div className="reels-play-center-btn">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <span className="reels-stage-notice">Espaço para reprodução do vídeo vertical 9:16</span>
              <span className="reels-slot-index">Vídeo {activeReelIndex + 1} de {REELS_DATA.length}</span>
            </div>

            {/* Barra de Ações Lateral Direita (Curtir, Áudio, Compartilhar) */}
            <aside className="reels-action-bar">
              <button
                type="button"
                className={`reels-action-btn ${likedReels[activeReelIndex] ? 'liked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setLikedReels((prev) => ({
                    ...prev,
                    [activeReelIndex]: !prev[activeReelIndex],
                  }))
                }}
                aria-label="Curtir"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill={likedReels[activeReelIndex] ? '#ef4444' : 'none'} stroke={likedReels[activeReelIndex] ? '#ef4444' : 'currentColor'} strokeWidth="1.5">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                <span className="reels-action-label">
                  {likedReels[activeReelIndex] ? 'Curtido' : REELS_DATA[activeReelIndex].likes}
                </span>
              </button>

              <button
                type="button"
                className="reels-action-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMuted((prev) => !prev)
                }}
                aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
              >
                {isMuted ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
                <span className="reels-action-label">{isMuted ? 'Mudo' : 'Som'}</span>
              </button>

              <button
                type="button"
                className="reels-action-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  if (navigator.share) {
                    navigator.share({ title: 'LEVER Reels', url: window.location.href }).catch(() => {})
                  }
                }}
                aria-label="Compartilhar"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span className="reels-action-label">Enviar</span>
              </button>
            </aside>

            {/* Rodapé Interno com Legenda e Tag de Produto */}
            <div className="reels-card-footer">
              <p className="reels-caption">
                {REELS_DATA[activeReelIndex].caption}
              </p>

              {/* Tag de Produto com Botão de Comprar */}
              <div className="reels-product-pill">
                <div className="reels-product-pill-info">
                  <span className="reels-product-pill-title">{productTitle}</span>
                  <span className="reels-product-pill-price">R$ 149,90</span>
                </div>
                <button
                  type="button"
                  className="reels-product-pill-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeReels()
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  VER PRODUTO
                </button>
              </div>
            </div>
          </div>

          {/* Seta Próximo Reel (Desktop/Tablet) */}
          <button
            type="button"
            className="reels-nav-side-btn next"
            onClick={(e) => {
              e.stopPropagation()
              setActiveReelIndex((prev) => (prev + 1) % REELS_DATA.length)
            }}
            aria-label="Próximo reel"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
