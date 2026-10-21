import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface CategoryItem {
  id: string
  name: string
  slug: string
  sort_order?: number
}

interface MenuDrawerProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (page: string, categorySlug?: string) => void
  activeCategorySlug?: string | null
}

const CACHE_KEY = 'lever_cached_categories'

function formatCategoryName(name: string) {
  if (!name) return ''
  const trimmed = name.trim()
  // Se for toda em maiúsculo (ex: ESPORTE, DIA A DIA), formata para minúsculo com primeira letra maiúscula
  if (trimmed === trimmed.toUpperCase()) {
    const lower = trimmed.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }
  return trimmed
}

export function MenuDrawer({
  isOpen,
  onClose,
  onNavigate,
  activeCategorySlug,
}: MenuDrawerProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch (_) {}
    return [
      { id: '1', name: 'Esporte', slug: 'esporte' },
      { id: '2', name: 'Dia a dia', slug: 'dia-a-dia' },
    ]
  })
  const [isLoading, setIsLoading] = useState(false)

  // Carregar categorias ativas do banco de dados
  useEffect(() => {
    let isMounted = true

    async function fetchCategories() {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (error) {
          console.error('Erro ao carregar categorias:', error)
          return
        }

        if (data && isMounted) {
          setCategories(data)
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data))
          } catch (_) {}
        }
      } catch (err) {
        console.error('Falha ao buscar categorias:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchCategories()

    return () => {
      isMounted = false
    }
  }, [])

  // Fechar no ESC e bloquear scroll do fundo
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCategoryClick = (slug?: string) => {
    onClose()
    onNavigate('categoria', slug)
  }

  return (
    <div
      className="menu-drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Menu de Categorias"
    >
      <div className="menu-drawer-panel">
        {/* Cabeçalho */}
        <div className="menu-drawer-header">
          <span className="menu-drawer-title" style={{ fontWeight: 400, textTransform: 'none' }}>
            Categorias
          </span>

          <button
            type="button"
            className="menu-drawer-close-btn"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Lista de Categorias */}
        <div className="menu-drawer-content">
          <nav className="menu-categories-list" aria-label="Categorias">
            {/* Todos produtos */}
            <button
              type="button"
              className={`menu-category-item ${!activeCategorySlug ? 'active' : ''}`}
              onClick={() => handleCategoryClick()}
              style={{ fontWeight: 400, textTransform: 'none' }}
            >
              <span className="menu-category-name" style={{ fontWeight: 400, textTransform: 'none' }}>
                Todos produtos
              </span>
              <span className="menu-category-arrow">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </button>

            {/* Categorias dinâmicas */}
            {categories.map((cat) => {
              const isActive = activeCategorySlug === cat.slug

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`menu-category-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(cat.slug)}
                  style={{ fontWeight: 400, textTransform: 'none' }}
                >
                  <span className="menu-category-name" style={{ fontWeight: 400, textTransform: 'none' }}>
                    {formatCategoryName(cat.name)}
                  </span>
                  <span className="menu-category-arrow">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </button>
              )
            })}

            {isLoading && categories.length === 0 && (
              <div className="menu-categories-loading">
                <span className="menu-skeleton-line" />
                <span className="menu-skeleton-line" />
              </div>
            )}
          </nav>
        </div>

        {/* Rodapé com Botão Preto de Rastreio */}
        <div className="menu-drawer-footer">
          <a
            href="https://rastreamento.correios.com.br/app/index.php"
            target="_blank"
            rel="noopener noreferrer"
            className="menu-drawer-track-btn"
            style={{ borderRadius: 0, fontWeight: 400, textTransform: 'none' }}
          >
            Rastrear meu pedido
          </a>
        </div>
      </div>
    </div>
  )
}
