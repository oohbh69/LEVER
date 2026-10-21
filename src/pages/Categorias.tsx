import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'

export interface CategoryData {
  id: string
  name: string
  slug: string
  description?: string | null
}

interface ProductItem {
  id: string
  name: string
  price: number
  promo_price: number | null
  category_id: string | null
  category_name?: string
  category_slug?: string
  cover_image?: string
  hover_image?: string
  created_at: string
}

interface CategoriasPageProps {
  categorySlug?: string | null
  onNavigateToProduct: (id: string, name: string) => void
  onNavigateToHome: () => void
  onSelectCategory?: (slug: string | null) => void
}

function formatCategoryName(name?: string | null) {
  if (!name) return ''
  const trimmed = name.trim()
  if (trimmed === trimmed.toUpperCase()) {
    const lower = trimmed.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }
  return trimmed
}

type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'name_asc'

export function CategoriasPage({
  categorySlug,
  onNavigateToProduct,
  onNavigateToHome,
  onSelectCategory,
}: CategoriasPageProps) {
  const { addItem, openCart } = useCart()

  const [categories, setCategories] = useState<CategoryData[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(categorySlug || null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [isLoading, setIsLoading] = useState(true)
  const [addedProductId, setAddedProductId] = useState<string | null>(null)

  // Sincronizar quando a prop categorySlug mudar (ex: navegação via menu lateral ou histórico)
  useEffect(() => {
    setSelectedSlug(categorySlug || null)
  }, [categorySlug])

  // Carregar dados de categorias e produtos do Supabase
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setIsLoading(true)

        const [catRes, prodRes] = await Promise.all([
          supabase
            .from('categories')
            .select('id, name, slug, description, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('products')
            .select(`
              id,
              name,
              price,
              promo_price,
              category_id,
              created_at,
              visibility,
              categories(id, name, slug),
              product_images(image_url, is_cover, sort_order)
            `)
            .eq('visibility', 'visivel')
            .order('created_at', { ascending: false }),
        ])

        if (!isMounted) return

        if (catRes.data) {
          setCategories(catRes.data)
        }

        if (prodRes.data) {
          const mapped: ProductItem[] = prodRes.data.map((item: any) => {
            const sortedImages = (item.product_images || []).sort(
              (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
            )
            const cover =
              sortedImages.find((img: any) => img.is_cover)?.image_url ||
              sortedImages[0]?.image_url ||
              ''
            const hover =
              sortedImages.find((img: any) => !img.is_cover && img.image_url !== cover)?.image_url ||
              sortedImages[1]?.image_url ||
              cover

            return {
              id: item.id,
              name: item.name,
              price: Number(item.price) || 0,
              promo_price: item.promo_price ? Number(item.promo_price) : null,
              category_id: item.category_id,
              category_name: item.categories?.name,
              category_slug: item.categories?.slug,
              cover_image: cover,
              hover_image: hover,
              created_at: item.created_at,
            }
          })
          setProducts(mapped)
        }
      } catch (err) {
        console.error('Erro ao carregar dados da página de categorias:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  // Categoria ativa selecionada
  const activeCategory = useMemo(() => {
    if (!selectedSlug) return null
    return (
      categories.find(
        (c) => c.slug.toLowerCase() === selectedSlug.toLowerCase()
      ) || null
    )
  }, [categories, selectedSlug])

  // Filtragem e ordenação dos produtos
  const filteredProducts = useMemo(() => {
    let result = [...products]

    // Filtro por categoria
    if (selectedSlug) {
      result = result.filter((p) => {
        if (activeCategory) {
          return p.category_id === activeCategory.id || p.category_slug === activeCategory.slug
        }
        return p.category_slug?.toLowerCase() === selectedSlug.toLowerCase()
      })
    }

    // Filtro por busca rápida
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }

    // Ordenação
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => {
          const priceA = a.promo_price && a.promo_price > 0 ? a.promo_price : a.price
          const priceB = b.promo_price && b.promo_price > 0 ? b.promo_price : b.price
          return priceA - priceB
        })
        break
      case 'price_desc':
        result.sort((a, b) => {
          const priceA = a.promo_price && a.promo_price > 0 ? a.promo_price : a.price
          const priceB = b.promo_price && b.promo_price > 0 ? b.promo_price : b.price
          return priceB - priceA
        })
        break
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'recent':
      default:
        result.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        break
    }

    return result
  }, [products, selectedSlug, activeCategory, searchTerm, sortBy])

  const handleSelectCategory = (slug: string | null) => {
    setSelectedSlug(slug)
    if (onSelectCategory) {
      onSelectCategory(slug)
    }
  }

  const handleAddToCart = (e: React.MouseEvent, product: ProductItem) => {
    e.stopPropagation()
    const finalPrice =
      product.promo_price && product.promo_price > 0 && product.promo_price < product.price
        ? product.promo_price
        : product.price
    const installmentsCalc = (finalPrice / 3).toFixed(2).replace('.', ',')
    const formattedPrice = `R$ ${finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      priceFormatted: formattedPrice,
      installments: `3x de R$ ${installmentsCalc} sem juros`,
      image: product.cover_image,
      tag: product.promo_price ? 'Promoção' : undefined,
    })

    setAddedProductId(product.id)
    setTimeout(() => {
      setAddedProductId(null)
    }, 1400)
    openCart()
  }

  return (
    <div className="category-page-container">
      {/* Navegação / Breadcrumbs */}
      <nav className="category-breadcrumbs" aria-label="Caminho de navegação">
        <button
          type="button"
          className="category-breadcrumb-link"
          onClick={onNavigateToHome}
        >
          Início
        </button>
        <span className="category-breadcrumb-separator">/</span>
        <button
          type="button"
          className={`category-breadcrumb-link ${!selectedSlug ? 'active' : ''}`}
          onClick={() => handleSelectCategory(null)}
        >
          Categorias
        </button>
        {activeCategory && (
          <>
            <span className="category-breadcrumb-separator">/</span>
            <span className="category-breadcrumb-current" style={{ fontWeight: 400, textTransform: 'none' }}>
              {formatCategoryName(activeCategory.name)}
            </span>
          </>
        )}
      </nav>

      {/* Header da Página de Categorias */}
      <header className="category-page-header">
        <div className="category-header-info">
          <h1 className="category-title" style={{ fontWeight: 400, textTransform: 'none' }}>
            {activeCategory ? formatCategoryName(activeCategory.name) : 'Todos produtos'}
          </h1>
        </div>

        <div className="category-header-meta">
          <span className="category-product-count" style={{ fontWeight: 400 }}>
            {filteredProducts.length}{' '}
            {filteredProducts.length === 1 ? 'modelo' : 'modelos'}
          </span>
        </div>
      </header>

      {/* Filtro de Categorias (Pills Horizontais) */}
      <section className="category-pills-bar" aria-label="Filtrar por categoria">
        <div className="category-pills-track">
          <button
            type="button"
            className={`category-pill-btn ${!selectedSlug ? 'active' : ''}`}
            onClick={() => handleSelectCategory(null)}
            style={{ fontWeight: 400, textTransform: 'none' }}
          >
            <span>Todos produtos</span>
            <span className="category-pill-count">{products.length}</span>
          </button>

          {categories.map((cat) => {
            const isActive = selectedSlug?.toLowerCase() === cat.slug.toLowerCase()
            const count = products.filter(
              (p) => p.category_id === cat.id || p.category_slug === cat.slug
            ).length

            return (
              <button
                key={cat.id}
                type="button"
                className={`category-pill-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectCategory(cat.slug)}
                style={{ fontWeight: 400, textTransform: 'none' }}
              >
                <span>{formatCategoryName(cat.name)}</span>
                <span className="category-pill-count">{count}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Barra de Ferramentas (Busca e Ordenação) */}
      <div className="category-toolbar">
        <div className="category-search-box">
          <svg
            className="category-search-icon"
            width="18"
            height="18"
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
          <input
            type="text"
            className="category-search-input"
            placeholder="Buscar modelo na categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="category-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        <div className="category-sort-box">
          <label htmlFor="category-sort-select" className="category-sort-label">
            Ordenar por:
          </label>
          <select
            id="category-sort-select"
            className="category-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="recent">Mais Recentes</option>
            <option value="price_asc">Menor Preço</option>
            <option value="price_desc">Maior Preço</option>
            <option value="name_asc">Nome (A - Z)</option>
          </select>
        </div>
      </div>

      {/* Conteúdo Principal: Grid de Produtos */}
      {isLoading ? (
        <div className="category-grid-loading">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="category-skeleton-card">
              <div className="category-skeleton-img shimmer-animated" />
              <div className="category-skeleton-text shimmer-animated" />
              <div className="category-skeleton-price shimmer-animated" />
              <div className="category-skeleton-btn shimmer-animated" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="category-empty-state">
          <div className="category-empty-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
          </div>
          <h2 className="category-empty-title">Nenhum produto encontrado</h2>
          <p className="category-empty-desc">
            {searchTerm
              ? `Não encontramos resultados para "${searchTerm}" nesta categoria.`
              : 'Não há modelos disponíveis no momento nesta seleção.'}
          </p>
          <div className="category-empty-actions">
            {searchTerm && (
              <button
                type="button"
                className="category-empty-btn-outline"
                onClick={() => setSearchTerm('')}
              >
                Limpar busca
              </button>
            )}
            {selectedSlug && (
              <button
                type="button"
                className="category-empty-btn-primary"
                onClick={() => handleSelectCategory(null)}
              >
                Ver todas as categorias
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="category-products-grid">
          {filteredProducts.map((product) => {
            const hasPromo =
              product.promo_price &&
              product.promo_price > 0 &&
              product.promo_price < product.price
            const displayPrice = hasPromo ? product.promo_price! : product.price
            const installments = (displayPrice / 3).toFixed(2).replace('.', ',')
            const isAdded = addedProductId === product.id

            return (
              <article
                key={product.id}
                className="category-product-card"
                onClick={() => onNavigateToProduct(product.id, product.name)}
              >
                {/* Imagem do Produto com transição de hover */}
                <div className="category-product-image-wrap">
                  {hasPromo && (
                    <span className="category-badge-promo" style={{ fontWeight: 400, textTransform: 'none' }}>
                      Promoção
                    </span>
                  )}
                  {product.category_name && (
                    <span className="category-badge-cat" style={{ fontWeight: 400, textTransform: 'none' }}>
                      {formatCategoryName(product.category_name)}
                    </span>
                  )}

                  {product.cover_image ? (
                    <img
                      src={product.cover_image}
                      alt={product.name}
                      className="category-product-img primary"
                      loading="lazy"
                    />
                  ) : (
                    <div className="category-product-placeholder">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}

                  {product.hover_image && product.hover_image !== product.cover_image && (
                    <img
                      src={product.hover_image}
                      alt={`${product.name} detalhe`}
                      className="category-product-img hover"
                      loading="lazy"
                    />
                  )}
                </div>

                {/* Informações de Preço e Nome */}
                <div className="category-product-body">
                  <span className="category-product-category-name" style={{ fontWeight: 400, textTransform: 'none' }}>
                    {formatCategoryName(product.category_name) || 'Coleção Lever'}
                  </span>
                  <h3 className="category-product-name" style={{ fontWeight: 400, textTransform: 'none' }}>
                    {product.name}
                  </h3>

                  <div className="category-product-pricing">
                    {hasPromo && (
                      <span className="category-product-old-price" style={{ fontWeight: 400 }}>
                        R${' '}
                        {product.price.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                    <span className="category-product-price" style={{ fontWeight: 400 }}>
                      R${' '}
                      {displayPrice.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <span className="category-product-installments" style={{ fontWeight: 400 }}>
                    em até 3x de R$ {installments} sem juros
                  </span>
                </div>

                {/* Botão de Compra Rápida */}
                <button
                  type="button"
                  className={`category-product-buy-btn ${isAdded ? 'added' : ''}`}
                  onClick={(e) => handleAddToCart(e, product)}
                  aria-label={`Adicionar ${product.name} ao carrinho`}
                  style={{ fontWeight: 400, textTransform: 'none' }}
                >
                  {isAdded ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Adicionado</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                      <span>Adicionar</span>
                    </>
                  )}
                </button>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CategoriasPage
