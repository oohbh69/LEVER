import { useRef, useState, useEffect } from 'react'
import { ProdutoPage } from './pages/Produto'
import { ContatoPage } from './pages/Contato'
import { PoliticaFretePage } from './pages/PoliticaFrete'
import { QuemSomosPage } from './pages/QuemSomos'
import { SegurancaPage } from './pages/Seguranca'
import { RastreioPage } from './pages/Rastreio'
import { TrocasDevolucoesPage } from './pages/TrocasDevolucoes'
import { CheckoutPage } from './pages/Checkout'
import { PainelPage } from './pages/Painel'
import { DashboardPage } from './pages/Dashboard'
import { CartProvider, useCart } from './context/CartContext'
import { CartDrawer } from './components/CartDrawer'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { getVitrineConfig, type VitrineConfig } from './pages/CarrosselVitrine'

type PageRoute =
  | 'home'
  | 'produto'
  | 'carrinho'
  | 'checkout'
  | 'contato'
  | 'politica-de-frete'
  | 'quem-somos'
  | 'e-seguro-comprar'
  | 'rastrear-pedido'
  | 'trocas-e-devolucoes'
  | 'painel'
  | 'dashboard'
  | 'criar-produto'
  | 'frete'
  | 'cupom'
  | 'carrossel-vitrine'

interface Product {
  id: string | number
  name: string
  price: string
  priceNumeric: number
  installments: string
  tag?: string
  imageUrl?: string
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

function AppContent() {
  const getRouteFromUrl = (): PageRoute => {
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
    const pathname = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase()

    const route = hash || pathname
    switch (route) {
      case 'painel':
        return 'painel'
      case 'dashboard':
        return 'dashboard'
      case 'criar-produto':
        return 'criar-produto'
      case 'frete':
        return 'frete'
      case 'cupom':
        return 'cupom'
      case 'carrossel-vitrine':
        return 'carrossel-vitrine'
      case 'carrinho':
        openCart()
        return 'home'
      case 'checkout':
        return 'checkout'
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

  const [currentPage, setCurrentPage] = useState<PageRoute>(getRouteFromUrl)
  const [selectedProductName, setSelectedProductName] = useState('')
  const [addedCardId, setAddedCardId] = useState<string | number | null>(null)
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [vitrineConfig, setVitrineConfig] = useState<VitrineConfig>(getVitrineConfig)

  useEffect(() => {
    const handleVitrineUpdate = () => {
      setVitrineConfig(getVitrineConfig())
    }
    window.addEventListener('vitrine-config-updated', handleVitrineUpdate)
    return () => {
      window.removeEventListener('vitrine-config-updated', handleVitrineUpdate)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function fetchVitrineProducts() {
      try {
        setIsLoadingProducts(true)
        const { data, error } = await supabase
          .from('products')
          .select('*, product_images(*)')
          .eq('visibility', 'visivel')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Erro ao buscar produtos da vitrine:', error)
          return
        }

        if (data && isMounted) {
          let list: Product[] = data.map((item: any) => {
            const rawPrice = Number(item.price) || 0
            const promo = item.promo_price ? Number(item.promo_price) : null
            const finalPrice = promo && promo > 0 && promo < rawPrice ? promo : rawPrice
            const installmentsCalc = (finalPrice / 3).toFixed(2).replace('.', ',')

            const coverImg = item.product_images?.find((img: any) => img.is_cover)?.image_url
            const firstImg = item.product_images?.[0]?.image_url
            const primaryImg = coverImg || firstImg || undefined

            const customTag = vitrineConfig.customTags[item.id]
            const defaultTag = promo && promo > 0 && promo < rawPrice ? 'Promoção' : undefined

            return {
              id: item.id,
              name: item.name,
              price: `R$ ${finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              priceNumeric: finalPrice,
              installments: `3x de R$ ${installmentsCalc} sem juros`,
              tag: customTag || defaultTag,
              imageUrl: primaryImg,
            }
          })

          if (vitrineConfig.featuredProductIds && vitrineConfig.featuredProductIds.length > 0) {
            const featuredMap = new Map(list.map((p) => [String(p.id), p]))
            const orderedList: Product[] = []
            for (const id of vitrineConfig.featuredProductIds) {
              const prod = featuredMap.get(String(id))
              if (prod) orderedList.push(prod)
            }
            if (orderedList.length > 0) {
              list = orderedList
            }
          }

          setFavoriteProducts(list)
        }
      } catch (err) {
        console.error('Erro ao conectar com a vitrine:', err)
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false)
        }
      }
    }

    fetchVitrineProducts()

    return () => {
      isMounted = false
    }
  }, [vitrineConfig])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])
  const { openCart, totalItems, addItem } = useCart()
  const announcementText = 'ENVIO GRÁTIS A PARTIR DE R$ 199,90'
  const repeatCount = 5
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPage(getRouteFromUrl())
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    handleLocationChange()
    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [])

  useEffect(() => {
    const routeTitles: Record<PageRoute, string> = {
      home: 'LEVER',
      produto: selectedProductName ? `LEVER | ${selectedProductName}` : 'LEVER | Óculos de Sol',
      carrinho: 'LEVER | Carrinho',
      checkout: 'LEVER | Checkout Seguro',
      contato: 'LEVER | Contato',
      'politica-de-frete': 'LEVER | Política de Frete',
      'quem-somos': 'LEVER | Quem Somos',
      'e-seguro-comprar': 'LEVER | É Seguro Comprar',
      'rastrear-pedido': 'LEVER | Rastrear Pedido',
      'trocas-e-devolucoes': 'LEVER | Trocas e Devoluções',
      painel: 'LEVER | Login',
      dashboard: 'LEVER | Dashboard',
      'criar-produto': 'LEVER | Criar Produto',
      frete: 'LEVER | Frete Personalizado',
      cupom: 'LEVER | Cupons de Desconto',
      'carrossel-vitrine': 'LEVER | Carrossel Vitrine',
    }
    document.title = routeTitles[currentPage] || 'LEVER'
  }, [currentPage, selectedProductName])

  const navigateTo = (page: PageRoute) => {
    if (page === 'home') {
      window.history.pushState({}, '', '/')
      window.location.hash = ''
    } else if (page === 'painel') {
      window.history.pushState({}, '', '/painel')
      window.location.hash = ''
    } else if (page === 'dashboard') {
      window.history.pushState({}, '', '/dashboard')
      window.location.hash = ''
    } else if (page === 'criar-produto') {
      window.history.pushState({}, '', '/criar-produto')
      window.location.hash = ''
    } else if (page === 'frete') {
      window.history.pushState({}, '', '/frete')
      window.location.hash = ''
    } else if (page === 'cupom') {
      window.history.pushState({}, '', '/cupom')
      window.location.hash = ''
    } else if (page === 'carrossel-vitrine') {
      window.history.pushState({}, '', '/carrossel-vitrine')
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

  const isDashboardRoute =
    currentPage === 'painel' ||
    currentPage === 'dashboard' ||
    currentPage === 'criar-produto' ||
    currentPage === 'frete' ||
    currentPage === 'cupom' ||
    currentPage === 'carrossel-vitrine'

  if (isDashboardRoute) {
    if (isAuthLoading) {
      return (
        <div
          style={{
            minHeight: '100vh',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa',
            color: '#6b7280',
            fontSize: '0.85rem',
            fontWeight: 400,
          }}
        >
          Carregando...
        </div>
      )
    }

    if (!session) {
      return (
        <PainelPage
          onLogin={() => {
            navigateTo(currentPage === 'painel' ? 'dashboard' : currentPage)
          }}
          onBackToStore={() => navigateTo('home')}
        />
      )
    }

    const initialTab =
      currentPage === 'painel' || currentPage === 'dashboard'
        ? 'dashboard'
        : currentPage

    return (
      <DashboardPage
        initialTab={initialTab}
        onLogout={() => {
          navigateTo('painel')
        }}
        onNavigateToStore={() => navigateTo('home')}
      />
    )
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
            aria-label={`Carrinho (${totalItems} ${totalItems === 1 ? 'item' : 'itens'})`}
            id="cart-btn"
            onClick={openCart}
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
            {totalItems > 0 && (
              <span className="header-cart-badge">{totalItems}</span>
            )}
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
            {/* Espaço para o Banner ou Banner da Vitrine */}
            <section className="banner-area" aria-label="Banner">
              {(() => {
                const activeBanner = vitrineConfig.banners?.find((b) => b.isActive)
                if (activeBanner) {
                  return (
                    <div
                      className="banner-active-container"
                      style={{
                        position: 'relative',
                        width: '100%',
                        minHeight: '260px',
                        maxHeight: '440px',
                        overflow: 'hidden',
                        cursor: activeBanner.linkUrl ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (activeBanner.linkUrl) {
                          if (activeBanner.linkUrl.startsWith('/')) {
                            const page = activeBanner.linkUrl.replace(/^\//, '') as PageRoute
                            navigateTo(page || 'home')
                          } else {
                            window.location.href = activeBanner.linkUrl
                          }
                        }
                      }}
                    >
                      <img
                        src={activeBanner.imageUrl}
                        alt={activeBanner.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          padding: '2rem 2.5rem',
                          color: '#ffffff',
                        }}
                      >
                        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 400, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                          {activeBanner.title}
                        </h2>
                        {activeBanner.subtitle && (
                          <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', fontWeight: 400, opacity: 0.9 }}>
                            {activeBanner.subtitle}
                          </p>
                        )}
                        {activeBanner.buttonText && (
                          <span
                            style={{
                              marginTop: '0.85rem',
                              alignSelf: 'flex-start',
                              padding: '0.45rem 1rem',
                              backgroundColor: '#ffffff',
                              color: '#000000',
                              fontSize: '0.75rem',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              fontWeight: 400,
                            }}
                          >
                            {activeBanner.buttonText}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                }

                return (
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
                )
              })()}
            </section>

            {/* Carrossel Os Queridinhos */}
            {vitrineConfig.isEnabled && (
              <section className="favorites-section" aria-labelledby="favorites-heading">
                <div className="section-header">
                  <h2 id="favorites-heading" className="section-title">
                    {vitrineConfig.sectionTitle || 'Os Queridinhos'}
                  </h2>

                {favoriteProducts.length > 0 && (
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
                )}
              </div>

              {isLoadingProducts ? (
                <div
                  style={{
                    padding: '3.5rem 1.5rem',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontWeight: 400,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      border: '2px solid #e5e7eb',
                      borderTopColor: '#111827',
                      borderRadius: '50%',
                      animation: 'spinLoading 0.8s linear infinite',
                    }}
                  />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 400, color: '#6b7280', letterSpacing: '0.02em' }}>
                    Carregando vitrine...
                  </p>
                </div>
              ) : favoriteProducts.length === 0 ? (
                <div
                  style={{
                    padding: '4rem 1.5rem',
                    textAlign: 'center',
                    backgroundColor: '#fafafa',
                    border: '1px solid #f3f4f6',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.95rem',
                      fontWeight: 400,
                      color: '#111827',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Nenhum produto cadastrado na vitrine
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      fontWeight: 400,
                      color: '#6b7280',
                      maxWidth: '380px',
                      lineHeight: '1.5',
                    }}
                  >
                    Novos modelos e lançamentos exclusivos da coleção estarão disponíveis em breve.
                  </p>
                </div>
              ) : (
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
                  {favoriteProducts.map((product) => (
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
                          <span className="product-tag" style={{ fontWeight: 400 }}>
                            {product.tag}
                          </span>
                        )}
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
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
                        )}
                      </div>

                      <div className="product-info">
                        <h3 className="product-name" style={{ fontWeight: 400 }}>
                          {product.name}
                        </h3>
                        <p className="product-price" style={{ fontWeight: 400 }}>
                          {product.price}
                        </p>
                        <span className="product-installments" style={{ fontWeight: 400 }}>
                          {product.installments}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="product-add-btn"
                        style={{ fontWeight: 400 }}
                        aria-label={`Adicionar ${product.name} ao carrinho`}
                        onClick={(e) => {
                          e.stopPropagation()
                          addItem({
                            id: product.id,
                            name: product.name,
                            price: product.priceNumeric,
                            priceFormatted: product.price,
                            installments: product.installments,
                            image: product.imageUrl,
                            tag: product.tag,
                          })
                          setAddedCardId(product.id)
                          setTimeout(() => setAddedCardId(null), 1500)
                        }}
                      >
                        {addedCardId === product.id ? 'ADICIONADO ✓' : 'ADICIONAR'}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

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
        {currentPage === 'checkout' && (
          <CheckoutPage onBackToStore={() => navigateTo('home')} />
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
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <a href="tel:+5511920713667" className="footer-email">
                  11 92071-3667
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
      {/* Carrinho Lateral */}
      <CartDrawer
        onNavigateToCatalog={() => navigateTo('home')}
        onNavigateToCheckout={() => navigateTo('checkout')}
      />
    </div>
  )
}

export function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  )
}

export default App
