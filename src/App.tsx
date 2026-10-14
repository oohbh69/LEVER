import { useRef, useState, useEffect } from 'react'
import { ProdutoPage } from './pages/Produto'
import { ContatoPage } from './pages/Contato'
import { PoliticaFretePage } from './pages/PoliticaFrete'
import { QuemSomosPage } from './pages/QuemSomos'
import { SegurancaPage } from './pages/Seguranca'
import { RastreioPage } from './pages/Rastreio'
import { TrocasDevolucoesPage } from './pages/TrocasDevolucoes'

type PageRoute =
  | 'home'
  | 'produto'
  | 'contato'
  | 'politica-de-frete'
  | 'quem-somos'
  | 'e-seguro-comprar'
  | 'rastrear-pedido'
  | 'trocas-e-devolucoes'

interface Product {
  id: number
  name: string
  price: string
  installments: string
  tag?: string
}

interface InfoBenefit {
  id: number
  icon: string
  title: string
  description: string
}

const INFO_BENEFITS: InfoBenefit[] = [
  {
    id: 1,
    icon: '☀️',
    title: 'Proteção UV400',
    description: 'contra os raios do sol',
  },
  {
    id: 2,
    icon: '👓',
    title: 'Acetato reforçado',
    description: 'com dobradiças bem firmes',
  },
  {
    id: 3,
    icon: '🔄',
    title: '7 dias para testar',
    description: '(não gostou? É só devolver)',
  },
  {
    id: 4,
    icon: '💳',
    title: 'Até 6x sem juros',
    description: 'no cartão ou no Pix',
  },
]

const FAVORITE_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Camiseta Oversized Minimalist',
    price: 'R$ 149,90',
    installments: '3x de R$ 49,96 sem juros',
    tag: 'Mais Vendido',
  },
  {
    id: 2,
    name: 'Moletom Boxy Heavyweight',
    price: 'R$ 299,90',
    installments: '6x de R$ 49,98 sem juros',
    tag: 'Destaque',
  },
  {
    id: 3,
    name: 'Calça Cargo Utility Pants',
    price: 'R$ 259,90',
    installments: '5x de R$ 51,98 sem juros',
  },
  {
    id: 4,
    name: 'Jaqueta Corta-Vento Street',
    price: 'R$ 329,90',
    installments: '6x de R$ 54,98 sem juros',
    tag: 'Novo',
  },
  {
    id: 5,
    name: 'Boné Dad Hat Classic',
    price: 'R$ 119,90',
    installments: '2x de R$ 59,95 sem juros',
  },
]

export function App() {
  const [currentPage, setCurrentPage] = useState<PageRoute>('home')
  const [selectedProductName, setSelectedProductName] = useState('')
  const announcementText = 'ENVIO GRÁTIS A PARTIR DE R$ 199,90'
  const repeatCount = 5
  const carouselRef = useRef<HTMLDivElement>(null)

  const getPageFromHash = (): PageRoute => {
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
    switch (hash) {
      case 'produto':
        return 'produto'
      case 'contato':
        return 'contato'
      case 'politica-de-frete':
        return 'politica-de-frete'
      case 'quem-somos':
        return 'quem-somos'
      case 'e-seguro-comprar':
        return 'e-seguro-comprar'
      case 'rastrear-pedido':
        return 'rastrear-pedido'
      case 'trocas-e-devolucoes':
        return 'trocas-e-devolucoes'
      default:
        return 'home'
    }
  }

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateTo = (page: PageRoute) => {
    if (page === 'home') {
      window.location.hash = ''
    } else {
      window.location.hash = page
    }
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Lógica para clicar e arrastar (Mouse e Touch) no carrossel
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const hasMovedRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!carouselRef.current) return
    isDraggingRef.current = true
    hasMovedRef.current = false
    startXRef.current = e.pageX - carouselRef.current.offsetLeft
    scrollLeftRef.current = carouselRef.current.scrollLeft
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !carouselRef.current) return
    const x = e.pageX - carouselRef.current.offsetLeft
    const walk = x - startXRef.current

    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true
      if (!isDragging) setIsDragging(true)
      carouselRef.current.scrollLeft = scrollLeftRef.current - walk
    }
  }

  const handlePointerUpOrCancel = () => {
    isDraggingRef.current = false
    setTimeout(() => {
      setIsDragging(false)
      hasMovedRef.current = false
    }, 50)
  }


  return (
    <div className="app-layout">
      {/* Cabeçalho */}
      <header className="site-header">
        <div className="header-left">
          <button
            type="button"
            className="header-btn"
            aria-label="Menu"
            id="menu-toggle-btn"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        <div className="header-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              navigateTo('home')
            }}
            className="header-logo-link"
            aria-label="LEVER início"
          >
            <img
              src="/lever-logo-cropped.png"
              alt="LEVER Logo"
              className="header-logo"
            />
          </a>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="header-btn"
            aria-label="Pesquisar"
            id="search-btn"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <button
            type="button"
            className="header-btn"
            aria-label="Carrinho"
            id="cart-btn"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>
        </div>
      </header>

      {/* Barra de anúncio com carrossel infinito */}
      <aside className="announcement-bar" aria-label="Aviso de promoção">
        <div className="announcement-track">
          <div className="announcement-group">
            {Array.from({ length: repeatCount }).map((_, index) => (
              <span key={`first-${index}`} className="announcement-item-wrapper">
                <span className="announcement-text">{announcementText}</span>
                <span className="announcement-dot">•</span>
              </span>
            ))}
          </div>
          <div className="announcement-group" aria-hidden="true">
            {Array.from({ length: repeatCount }).map((_, index) => (
              <span key={`second-${index}`} className="announcement-item-wrapper">
                <span className="announcement-text">{announcementText}</span>
                <span className="announcement-dot">•</span>
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Navegação de retorno quando fora da Home */}
      {currentPage !== 'home' && (
        <div className="breadcrumb-bar">
          <button
            type="button"
            className="back-home-btn"
            onClick={() => navigateTo('home')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Voltar para a Loja
          </button>
        </div>
      )}

      {/* Conteúdo Dinâmico */}
      <main className="main-content">
        {currentPage === 'home' && (
          <>
            {/* Espaço para o Banner */}
            <section className="banner-area" aria-label="Banner">
              <div className="banner-placeholder">
                <svg
                  className="banner-placeholder-icon"
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="banner-placeholder-text">Espaço reservado para o banner</span>
              </div>
            </section>

            {/* Carrossel Os Queridinhos */}
            <section className="favorites-section" aria-labelledby="favorites-heading">
              <div className="section-header">
                <h2 id="favorites-heading" className="section-title">
                  Os Queridinhos
                </h2>

                <div className="carousel-controls">
                  <button
                    type="button"
                    className="carousel-nav-btn"
                    onClick={() => handleScroll('left')}
                    aria-label="Produto anterior"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="carousel-nav-btn"
                    onClick={() => handleScroll('right')}
                    aria-label="Próximo produto"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                className={`carousel-container ${isDragging ? 'is-dragging' : ''}`}
                ref={carouselRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUpOrCancel}
                onPointerCancel={handlePointerUpOrCancel}
                onClickCapture={(e) => {
                  if (hasMovedRef.current) {
                    e.stopPropagation()
                    e.preventDefault()
                  }
                }}
              >
                {FAVORITE_PRODUCTS.map((product) => (
                  <article
                    key={product.id}
                    className="product-card"
                    onClick={() => {
                      if (!hasMovedRef.current) {
                        setSelectedProductName(product.name)
                        navigateTo('produto')
                      }
                    }}
                  >
                    <div className="product-placeholder-box">
                      {product.tag && (
                        <span className="product-tag">{product.tag}</span>
                      )}
                      <div className="product-placeholder-icon">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                      </div>
                    </div>

                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-price">{product.price}</p>
                      <span className="product-installments">{product.installments}</span>
                    </div>

                    <button
                      type="button"
                      className="product-add-btn"
                      aria-label={`Adicionar ${product.name} ao carrinho`}
                    >
                      ADICIONAR
                    </button>
                  </article>
                ))}
              </div>
            </section>

            {/* Sessão Categorias */}
            <section className="categories-section" aria-labelledby="categories-heading">
              <div className="section-header">
                <h2 id="categories-heading" className="section-title">
                  Categorias
                </h2>
              </div>

              <div className="categories-grid">
                {/* Banner 1: Coleção Verão */}
                <article className="category-banner">
                  <div className="category-banner-placeholder">
                    <svg
                      className="category-placeholder-icon"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                    <span className="category-placeholder-tag">Espaço para o Banner</span>
                  </div>
                  <div className="category-banner-overlay">
                    <h3 className="category-banner-title">Coleção Verão</h3>
                    <span className="category-banner-link">CONFERIR</span>
                  </div>
                </article>

                {/* Banner 2: Lançamentos */}
                <article className="category-banner">
                  <div className="category-banner-placeholder">
                    <svg
                      className="category-placeholder-icon"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className="category-placeholder-tag">Espaço para o Banner</span>
                  </div>
                  <div className="category-banner-overlay">
                    <h3 className="category-banner-title">Lançamentos</h3>
                    <span className="category-banner-link">CONFERIR</span>
                  </div>
                </article>
              </div>
            </section>

            {/* Sessão Informativa */}
            <section className="info-benefits-section" aria-label="Informações e Diferenciais">
              <div className="info-benefits-container">
                <div className="info-benefits-grid">
                  {INFO_BENEFITS.map((item) => (
                    <article key={item.id} className="info-benefit-card">
                      <span className="info-benefit-icon" role="img" aria-label={item.title}>
                        {item.icon}
                      </span>
                      <div className="info-benefit-content">
                        <h3 className="info-benefit-title">{item.title}</h3>
                        <p className="info-benefit-desc">{item.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Páginas do Rodapé e Produto */}
        {currentPage === 'produto' && (
          <ProdutoPage
            productTitle={selectedProductName || 'Óculos de Sol LEVER Blackout Acetato UV400'}
          />
        )}
        {currentPage === 'contato' && <ContatoPage />}
        {currentPage === 'politica-de-frete' && <PoliticaFretePage />}
        {currentPage === 'quem-somos' && <QuemSomosPage />}
        {currentPage === 'e-seguro-comprar' && <SegurancaPage />}
        {currentPage === 'rastrear-pedido' && <RastreioPage />}
        {currentPage === 'trocas-e-devolucoes' && <TrocasDevolucoesPage />}
      </main>

      {/* Rodapé */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-top-brand">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                navigateTo('home')
              }}
              className="footer-logo-link"
              aria-label="LEVER início"
            >
              <img
                src="/lever-logo-cropped.png"
                alt="LEVER Glasses"
                className="footer-logo"
              />
            </a>
          </div>

          <div className="footer-main">
            <div className="footer-brand">
              <div className="footer-contact">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <a href="mailto:leverglasses@gmail.com" className="footer-email">
                  leverglasses@gmail.com
                </a>
              </div>
            </div>

            <nav className="footer-nav" aria-label="Links institucionais e de suporte">
              <ul className="footer-links-list">
                <li>
                  <a
                    href="#contato"
                    onClick={(e) => {
                      e.preventDefault()
                      navigateTo('contato')
                    }}
                  >
                    Contato
                  </a>
                </li>
                <li>
                  <a
                    href="#politica-de-frete"
                    onClick={(e) => {
                      e.preventDefault()
                      navigateTo('politica-de-frete')
                    }}
                  >
                    Politica de Frete
                  </a>
                </li>
                <li>
                  <a
                    href="#quem-somos"
                    onClick={(e) => {
                      e.preventDefault()
                      navigateTo('quem-somos')
                    }}
                  >
                    Quem somos
                  </a>
                </li>
                <li>
                  <a
                    href="#e-seguro-comprar"
                    onClick={(e) => {
                      e.preventDefault()
                      navigateTo('e-seguro-comprar')
                    }}
                  >
                    É seguro comprar?
                  </a>
                </li>
                <li>
                  <a
                    href="#rastrear-pedido"
                    onClick={(e) => {
                      e.preventDefault()
                      navigateTo('rastrear-pedido')
                    }}
                  >
                    Rastrear Pedido
                  </a>
                </li>
                <li>
                  <a
                    href="#trocas-e-devolucoes"
                    onClick={(e) => {
                      e.preventDefault()
                      navigateTo('trocas-e-devolucoes')
                    }}
                  >
                    Trocas e Devoluções
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="footer-security">
            <div className="security-badge">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Pagamento seguro processado pela Mercado Pago</span>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">
              @2020 Lever Glasses Todos direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
