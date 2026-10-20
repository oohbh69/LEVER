import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabase'
import { parseDescriptionAndMeasurements, type ProductMeasurements } from './CriarProduto'

interface ProductPageProps {
  productId?: string | null
  productTitle?: string
  category?: string
}

export function ProdutoPage({
  productId,
  productTitle,
  category,
}: ProductPageProps) {
  const [productData, setProductData] = useState<any>(null)
  const [images, setImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [viewerImageIndex, setViewerImageIndex] = useState(0)

  // Carregar dados reais e fotos do Supabase
  useEffect(() => {
    let isMounted = true

    async function loadProduct() {
      try {
        setIsLoading(true)
        let resolvedProductId = productId
        let resolvedProductTitle = productTitle

        // Se não tiver ID passado pelas props, tenta pegar do hash (#produto?id=...), search (?id=...) ou sessionStorage
        if (!resolvedProductId && typeof window !== 'undefined') {
          const hashMatch = window.location.hash.match(/[#?&]id=([a-zA-Z0-9_-]+)/)
          const searchMatch = window.location.search.match(/[?&]id=([a-zA-Z0-9_-]+)/)
          resolvedProductId =
            hashMatch?.[1] ||
            searchMatch?.[1] ||
            sessionStorage.getItem('lever_selected_product_id')
        }

        let query = supabase
          .from('products')
          .select(`
            *,
            categories(name),
            product_images(image_url, sort_order, is_cover),
            product_tags(tag_name)
          `)

        if (resolvedProductId) {
          query = query.eq('id', resolvedProductId)
        } else if (resolvedProductTitle) {
          query = query.ilike('name', resolvedProductTitle)
        } else {
          query = query
            .eq('visibility', 'visivel')
            .order('created_at', { ascending: false })
            .limit(1)
        }

        let { data, error } = await query.maybeSingle()

        // Fallback robusto: se não encontrou, pega o produto ativo mais recente da loja
        if (!data) {
          const { data: fallbackData } = await supabase
            .from('products')
            .select(`
              *,
              categories(name),
              product_images(image_url, sort_order, is_cover),
              product_tags(tag_name)
            `)
            .eq('visibility', 'visivel')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          data = fallbackData
        }

        if (error && !data) {
          console.error('Erro ao buscar dados do produto na página de produto:', error)
          return
        }

        if (data && isMounted) {
          setProductData(data)
          let loadedImgs: string[] = []

          if (Array.isArray(data.product_images) && data.product_images.length > 0) {
            const sorted = [...data.product_images].sort(
              (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
            )
            loadedImgs = sorted.map((img: any) => img.image_url)
          }

          // Fallback para consulta direta na tabela product_images se a relação vier vazia
          if (loadedImgs.length === 0 && data.id) {
            const { data: directImgs } = await supabase
              .from('product_images')
              .select('image_url, sort_order')
              .eq('product_id', data.id)
              .order('sort_order', { ascending: true })
            if (directImgs && directImgs.length > 0) {
              loadedImgs = directImgs.map((img: any) => img.image_url)
            }
          }

          setImages(loadedImgs)
          setActiveImage(0)
        }
      } catch (err) {
        console.error('Falha ao carregar produto:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      isMounted = false
    }
  }, [productId, productTitle])

  // Dados reais derivados
  const currentTitle = productData?.name || productTitle || 'Óculos LEVER'
  const currentCategory = productData?.categories?.name || category || 'Eyewear'
  const currentSku = productData?.sku || ''
  const currentStock = productData?.stock ?? null
  const isAvailable = currentStock === null || currentStock > 0

  const regularPrice = productData?.price ? Number(productData.price) : 0
  const promoPriceNum = productData?.promo_price ? Number(productData.promo_price) : null
  const hasDiscount = promoPriceNum !== null && promoPriceNum > 0 && promoPriceNum < regularPrice
  const effectivePrice = hasDiscount ? promoPriceNum : regularPrice
  const discountPercent =
    hasDiscount && regularPrice > 0
      ? Math.round(((regularPrice - promoPriceNum) / regularPrice) * 100)
      : 0
  const installmentsPrice = (effectivePrice / 3).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const totalImages = images.length > 0 ? images.length : 1

  const { cleanDescription, measurements: parsedMeasurements } = parseDescriptionAndMeasurements(
    productData?.description
  )

  let productMeasurements: ProductMeasurements = {
    totalWidth:
      productData?.total_width !== null && productData?.total_width !== undefined
        ? String(productData.total_width)
        : parsedMeasurements.totalWidth || '',
    lensWidth:
      productData?.lens_width !== null && productData?.lens_width !== undefined
        ? String(productData.lens_width)
        : parsedMeasurements.lensWidth || '',
    lensHeight:
      productData?.lens_height !== null && productData?.lens_height !== undefined
        ? String(productData.lens_height)
        : parsedMeasurements.lensHeight || '',
    bridge:
      productData?.bridge !== null && productData?.bridge !== undefined
        ? String(productData.bridge)
        : parsedMeasurements.bridge || '',
    templeLength:
      productData?.temple_length !== null && productData?.temple_length !== undefined
        ? String(productData.temple_length)
        : parsedMeasurements.templeLength || '',
  }

  if (
    !productMeasurements.totalWidth &&
    !productMeasurements.lensWidth &&
    productData?.id &&
    typeof window !== 'undefined'
  ) {
    try {
      const cached = localStorage.getItem(`lever_measurements_${productData.id}`)
      if (cached) {
        productMeasurements = JSON.parse(cached)
      }
    } catch (_) {}
  }

  const hasAnyMeasurement = Boolean(
    productMeasurements.totalWidth ||
      productMeasurements.lensWidth ||
      productMeasurements.lensHeight ||
      productMeasurements.bridge ||
      productMeasurements.templeLength
  )

  const { addItem } = useCart()

  const handleAddToCart = () => {
    if (!isAvailable) return

    addItem(
      {
        id: productData?.id || 101,
        name: currentTitle,
        price: effectivePrice,
        priceFormatted: `R$ ${effectivePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        installments: `3x de R$ ${installmentsPrice} sem juros`,
        tag: hasDiscount ? 'Promoção' : undefined,
        variant: currentSku ? `SKU: ${currentSku}` : 'Eyewear UV400',
        image: images[0] || undefined,
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

  // Atalhos de teclado (Esc para fechar, Setas para navegar) e trava de scroll no modal
  useEffect(() => {
    if (!isImageViewerOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImageViewerOpen(false)
      } else if (isImageViewerOpen) {
        if (e.key === 'ArrowRight') {
          setViewerImageIndex((prev) => {
            const next = (prev + 1) % totalImages
            setActiveImage(next)
            return next
          })
        } else if (e.key === 'ArrowLeft') {
          setViewerImageIndex((prev) => {
            const next = (prev - 1 + totalImages) % totalImages
            setActiveImage(next)
            return next
          })
        }
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isImageViewerOpen, totalImages])

  return (
    <div className="product-page-container">
      <div className="product-detail-layout">
        {/* Sessão de Imagens */}
        <div className="product-gallery-section">
          <div
            className="main-image-wrapper"
            onClick={() => images.length > 0 && openImageViewer(activeImage)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && images.length > 0) {
                e.preventDefault()
                openImageViewer(activeImage)
              }
            }}
            aria-label="Clique para abrir o visualizador de imagem"
          >
            {hasDiscount && (
              <span className="product-badge" style={{ fontWeight: 400 }}>
                {discountPercent}% OFF
              </span>
            )}

            {images.length > 0 && (
              <span className="main-image-zoom-indicator" title="Clique para ampliar" style={{ fontWeight: 400 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                <span>AMPLIAR</span>
              </span>
            )}

            {isLoading ? (
              <div className="main-image-placeholder">
                <span className="gallery-placeholder-label" style={{ fontWeight: 400 }}>
                  Carregando fotos reais...
                </span>
              </div>
            ) : images.length > 0 ? (
              <img
                src={images[activeImage] || images[0]}
                alt={currentTitle}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
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
                <span className="gallery-placeholder-label" style={{ fontWeight: 400 }}>
                  Fotos em preparação
                </span>
              </div>
            )}
          </div>

          {/* Miniaturas de Imagens Reais */}
          {images.length > 1 && (
            <div className="thumbnails-row">
              {images.map((imgUrl, index) => (
                <button
                  key={index}
                  type="button"
                  className={`thumbnail-btn ${activeImage === index ? 'active' : ''}`}
                  onClick={() => setActiveImage(index)}
                  aria-label={`Ver foto ${index + 1}`}
                  style={{ overflow: 'hidden', padding: 0 }}
                >
                  <img
                    src={imgUrl}
                    alt={`Miniatura ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    width="60"
                    height="60"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Coluna de Informações do Produto */}
        <div className="product-info-column">
          {/* Sessão de Título, Categoria e SKU Real */}
          <div className="product-title-section">
            <div className="product-category-row">
              <span className="product-pdp-category">{currentCategory}</span>
              {currentSku && <span className="product-pdp-sku">SKU: {currentSku}</span>}
            </div>

            <h1 className="product-pdp-title">{currentTitle}</h1>

            {/* Status Real de Estoque */}
            {currentStock !== null && (
              <div className="product-stock-indicator">
                {currentStock > 0 ? (
                  <span className="stock-pill in-stock">
                    <span className="stock-dot"></span>
                    Em estoque ({currentStock} {currentStock === 1 ? 'unidade' : 'unidades'})
                  </span>
                ) : (
                  <span className="stock-pill out-of-stock">
                    <span className="stock-dot out"></span>
                    Esgotado
                  </span>
                )}
              </div>
            )}

            <div className="product-title-divider"></div>
          </div>

          {/* Sessão de Preço Real */}
          <div className="product-price-section">
            <div className="price-row">
              {hasDiscount && (
                <span className="price-old">
                  de R$ {regularPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              {hasDiscount && <span className="price-by">por</span>}
              <span className="price-current">
                R$ {effectivePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {hasDiscount && (
                <span className="price-discount-tag">{discountPercent}% OFF</span>
              )}
            </div>

            <p className="price-installments">
              ou 3x de R$ {installmentsPrice} sem juros no cartão de crédito
            </p>
          </div>

          {/* Bloco de Ações e Adicionar ao Carrinho */}
          <div className="product-actions-block">
            <div className="product-qty-add-row">
              <div className="quantity-selector">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  aria-label="Diminuir quantidade"
                  disabled={quantity <= 1 || !isAvailable}
                >
                  −
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  aria-label="Aumentar quantidade"
                  disabled={!isAvailable || (currentStock !== null && quantity >= currentStock)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="main-pdp-btn"
                onClick={handleAddToCart}
                disabled={!isAvailable}
              >
                {!isAvailable
                  ? 'PRODUTO ESGOTADO'
                  : addedToCart
                  ? '✓ ADICIONADO AO CARRINHO'
                  : 'ADICIONAR AO CARRINHO'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sessão de Benefícios Institucionais LEVER */}
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
              <h3 className="pdp-benefit-title" style={{ fontWeight: 400 }}>Envio Rápido</h3>
              <p className="pdp-benefit-desc" style={{ fontWeight: 400 }}>
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
              <h3 className="pdp-benefit-title" style={{ fontWeight: 400 }}>Pagamento Seguro</h3>
              <p className="pdp-benefit-desc" style={{ fontWeight: 400 }}>
                Nossos pagamentos são processados com total segurança via Mercado Pago.
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
              <h3 className="pdp-benefit-title" style={{ fontWeight: 400 }}>7 Dias para testar</h3>
              <p className="pdp-benefit-desc" style={{ fontWeight: 400 }}>
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
              <h3 className="pdp-benefit-title" style={{ fontWeight: 400 }}>Garantia LEVER</h3>
              <p className="pdp-benefit-desc" style={{ fontWeight: 400 }}>
                Suporte dedicado em caso de dúvidas ou problemas com seu pedido.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Sessão Ficha técnica e medidas reais */}
      <section className="pdp-specs-section" aria-labelledby="specs-heading">
        <div className="section-header">
          <h2 id="specs-heading" className="specs-section-title" style={{ fontWeight: 400 }}>
            Ficha técnica e medidas
          </h2>
        </div>

        <div className="pdp-specs-grid">
          {/* Coluna 1: Especificações e Logística Real */}
          <div className="pdp-specs-card">
            <h3 className="specs-card-title" style={{ fontWeight: 400 }}>Especificações</h3>

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
                  <span className="spec-material-name" style={{ fontWeight: 400 }}>Lentes</span>
                </div>
                <p className="spec-material-desc" style={{ fontWeight: 400 }}>
                  Lentes com proteção total UV400 contra raios solares UVA e UVB.
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
                  <span className="spec-material-name" style={{ fontWeight: 400 }}>Armação</span>
                </div>
                <p className="spec-material-desc" style={{ fontWeight: 400 }}>
                  Acabamento premium em acetato de alta densidade, resistente e confortável.
                </p>
              </div>

              {/* Dados Reais de Envio e Peso */}
              {(productData?.length || productData?.weight) && (
                <div className="spec-material-item">
                  <div className="spec-material-header">
                    <div className="spec-material-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="21 8 21 21 3 21 3 8" />
                        <rect x="1" y="3" width="22" height="5" />
                        <line x1="10" y1="12" x2="14" y2="12" />
                      </svg>
                    </div>
                    <span className="spec-material-name" style={{ fontWeight: 400 }}>Embalagem e Envio</span>
                  </div>
                  <p className="spec-material-desc" style={{ fontWeight: 400 }}>
                    {productData?.length && productData?.width && productData?.height
                      ? `Dimensões da embalagem: ${productData.length} cm x ${productData.width} cm x ${productData.height} cm`
                      : ''}
                    {productData?.weight
                      ? ` • Peso: ${productData.weight >= 1 ? `${productData.weight} kg` : `${Math.round(productData.weight * 1000)}g`}`
                      : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Medidas do produto */}
          <div className="pdp-specs-card">
            <div className="specs-card-header-flex">
              <h3 className="specs-card-title" style={{ fontWeight: 400 }}>Medidas do produto</h3>
              <span className="specs-unit-badge" style={{ fontWeight: 400 }}>Padrão em mm</span>
            </div>

            {hasAnyMeasurement ? (
              <div className="specs-measurements-list">
                {productMeasurements.totalWidth && (
                  <div className="measurement-item">
                    <span className="measurement-label" style={{ fontWeight: 400 }}>Largura total</span>
                    <span className="measurement-guide-line"></span>
                    <span className="measurement-num" style={{ fontWeight: 400 }}>
                      {productMeasurements.totalWidth} mm
                    </span>
                  </div>
                )}

                {productMeasurements.lensWidth && (
                  <div className="measurement-item">
                    <span className="measurement-label" style={{ fontWeight: 400 }}>Largura da lente</span>
                    <span className="measurement-guide-line"></span>
                    <span className="measurement-num" style={{ fontWeight: 400 }}>
                      {productMeasurements.lensWidth} mm
                    </span>
                  </div>
                )}

                {productMeasurements.lensHeight && (
                  <div className="measurement-item">
                    <span className="measurement-label" style={{ fontWeight: 400 }}>Altura de lente</span>
                    <span className="measurement-guide-line"></span>
                    <span className="measurement-num" style={{ fontWeight: 400 }}>
                      {productMeasurements.lensHeight} mm
                    </span>
                  </div>
                )}

                {productMeasurements.bridge && (
                  <div className="measurement-item">
                    <span className="measurement-label" style={{ fontWeight: 400 }}>Ponte</span>
                    <span className="measurement-guide-line"></span>
                    <span className="measurement-num" style={{ fontWeight: 400 }}>
                      {productMeasurements.bridge} mm
                    </span>
                  </div>
                )}

                {productMeasurements.templeLength && (
                  <div className="measurement-item">
                    <span className="measurement-label" style={{ fontWeight: 400 }}>Comprimento das hastes</span>
                    <span className="measurement-guide-line"></span>
                    <span className="measurement-num" style={{ fontWeight: 400 }}>
                      {productMeasurements.templeLength} mm
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '1.25rem 0', color: '#6b7280', fontSize: '0.86rem', fontWeight: 400, lineHeight: 1.6 }}>
                Dimensões técnicas em conformidade com o padrão internacional de armações. Se desejar medidas específicas deste modelo, consulte nosso suporte.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sessão Sobre este modelo (Descrição Real) */}
      <section className="pdp-about-model-section" aria-labelledby="about-model-heading">
        <div className="section-header">
          <h2 id="about-model-heading" className="about-model-title" style={{ fontWeight: 400 }}>
            Sobre este modelo
          </h2>
        </div>

        <div className="about-model-text-content">
          {cleanDescription ? (
            <div style={{ whiteSpace: 'pre-line', lineHeight: '1.7', color: '#4b5563', fontSize: '0.9rem', fontWeight: 400 }}>
              {cleanDescription}
            </div>
          ) : (
            <div style={{ color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.7', fontWeight: 400 }}>
              {currentTitle} original LEVER. Estrutura desenvolvida com materiais de alto padrão, lentes com proteção solar UV400 e acabamento para máximo conforto e durabilidade no uso diário.
            </div>
          )}
        </div>
      </section>

      {/* Barra Fixa de Compra (Fixa desde o início da página) */}
      <aside className="pdp-sticky-bar" aria-label="Barra de compra rápida">
        <div className="sticky-bar-container">
          {/* Informações Resumidas do Produto Real */}
          <div className="sticky-bar-product-info">
            <div className="sticky-product-thumb" style={{ overflow: 'hidden' }}>
              {images.length > 0 ? (
                <img
                  src={images[0]}
                  alt={currentTitle}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              )}
            </div>
            <div className="sticky-product-text">
              <span className="sticky-product-title">{currentTitle}</span>
              <span className="sticky-product-price">
                R$ {effectivePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="sticky-product-installments">3x de R$ {installmentsPrice} sem juros</span>
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
                disabled={quantity <= 1 || !isAvailable}
              >
                −
              </button>
              <span className="qty-value">{quantity}</span>
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity((prev) => prev + 1)}
                aria-label="Aumentar quantidade"
                disabled={!isAvailable || (currentStock !== null && quantity >= currentStock)}
              >
                +
              </button>
            </div>

            <button
              type="button"
              className="pdp-add-cart-btn sticky-add-btn"
              onClick={handleAddToCart}
              disabled={!isAvailable}
            >
              {!isAvailable
                ? 'ESGOTADO'
                : addedToCart
                ? '✓ NO CARRINHO'
                : 'ADICIONAR AO CARRINHO'}
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
            <span className="viewer-counter" style={{ fontWeight: 400 }}>
              {viewerImageIndex + 1} / {totalImages} — Foto {viewerImageIndex + 1}
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
            {images.length > 1 && (
              <button
                type="button"
                className="viewer-nav-btn prev"
                onClick={(e) => {
                  e.stopPropagation()
                  const nextIndex = (viewerImageIndex - 1 + totalImages) % totalImages
                  setViewerImageIndex(nextIndex)
                  setActiveImage(nextIndex)
                }}
                aria-label="Foto anterior"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            <div className="viewer-image-container">
              {images.length > 0 ? (
                <img
                  src={images[viewerImageIndex] || images[0]}
                  alt={currentTitle}
                  style={{
                    maxWidth: '90vw',
                    maxHeight: '80vh',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              ) : (
                <div className="viewer-image-placeholder">
                  <span className="viewer-image-title" style={{ fontWeight: 400 }}>{currentTitle}</span>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <button
                type="button"
                className="viewer-nav-btn next"
                onClick={(e) => {
                  e.stopPropagation()
                  const nextIndex = (viewerImageIndex + 1) % totalImages
                  setViewerImageIndex(nextIndex)
                  setActiveImage(nextIndex)
                }}
                aria-label="Próxima foto"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>

          {/* Faixa Inferior de Miniaturas Reais */}
          {images.length > 1 && (
            <div className="viewer-thumbnails-strip">
              {images.map((imgUrl, index) => (
                <button
                  key={index}
                  type="button"
                  className={`viewer-thumb-btn ${viewerImageIndex === index ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setViewerImageIndex(index)
                    setActiveImage(index)
                  }}
                  style={{ overflow: 'hidden', padding: 0 }}
                >
                  <img
                    src={imgUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
