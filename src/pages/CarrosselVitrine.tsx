import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { uploadFileToR2 } from '../lib/r2'

export interface VitrineBanner {
  id: string
  title: string
  subtitle?: string
  buttonText?: string
  linkUrl?: string
  imageUrl: string
  isActive: boolean
}

export interface CategoryBannerItem {
  id: string
  title: string
  buttonText?: string
  linkUrl?: string
  imageUrl?: string
  isActive: boolean
  sortOrder: number
}

export interface VitrineConfig {
  sectionTitle: string
  sectionSubtitle?: string
  isEnabled: boolean
  autoScroll: boolean
  autoScrollInterval: number
  featuredProductIds: string[]
  customTags: Record<string, string>
  banners: VitrineBanner[]
  categoriesSectionTitle: string
  categoriesIsEnabled: boolean
  categoryBanners: CategoryBannerItem[]
}

const DEFAULT_CONFIG: VitrineConfig = {
  sectionTitle: 'Os Queridinhos',
  sectionSubtitle: 'Confira os modelos favoritos e mais procurados da coleção',
  isEnabled: true,
  autoScroll: false,
  autoScrollInterval: 4,
  featuredProductIds: [],
  customTags: {},
  banners: [],
  categoriesSectionTitle: 'Categorias',
  categoriesIsEnabled: true,
  categoryBanners: [
    {
      id: 'default-cat-1',
      title: 'Coleção Verão',
      buttonText: 'CONFERIR',
      linkUrl: '/',
      imageUrl: '',
      isActive: true,
      sortOrder: 0,
    },
    {
      id: 'default-cat-2',
      title: 'Lançamentos',
      buttonText: 'CONFERIR',
      linkUrl: '/',
      imageUrl: '',
      isActive: true,
      sortOrder: 1,
    },
  ],
}

const STORAGE_KEY = 'lever_vitrine_config'

export function getVitrineConfig(): VitrineConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    }
  } catch (err) {
    console.error('Erro ao ler vitrine config:', err)
  }
  return DEFAULT_CONFIG
}

export function saveVitrineConfig(config: VitrineConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    window.dispatchEvent(new Event('vitrine-config-updated'))
  } catch (err) {
    console.error('Erro ao salvar vitrine config:', err)
  }
}

export async function fetchVitrineConfigFromSupabase(): Promise<VitrineConfig> {
  try {
    // 1. Buscar configurações da vitrine
    const { data: settingsData } = await supabase
      .from('vitrine_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()

    // 2. Buscar banners do banco
    const { data: bannersData, error: bannersErr } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true })

    if (bannersErr) {
      console.error('Erro ao buscar banners do Supabase:', bannersErr)
    }

    const banners: VitrineBanner[] = (bannersData || []).map((b: any) => ({
      id: String(b.id),
      title: b.title || 'Nova Coleção',
      subtitle: b.subtitle || undefined,
      buttonText: b.button_text || undefined,
      linkUrl: b.link_url || undefined,
      imageUrl: b.image_url,
      isActive: b.is_active ?? true,
    }))

    // 3. Buscar banners de categoria do banco
    const { data: catBannersData, error: catBannersErr } = await supabase
      .from('category_banners')
      .select('*')
      .order('sort_order', { ascending: true })

    if (catBannersErr) {
      console.error('Erro ao buscar banners de categoria do Supabase:', catBannersErr)
    }

    const categoryBanners: CategoryBannerItem[] = (catBannersData || []).map((cb: any) => ({
      id: String(cb.id),
      title: cb.title || 'Categoria',
      buttonText: cb.button_text || undefined,
      linkUrl: cb.link_url || undefined,
      imageUrl: cb.image_url || undefined,
      isActive: cb.is_active ?? true,
      sortOrder: cb.sort_order ?? 0,
    }))

    const config: VitrineConfig = {
      sectionTitle: settingsData?.section_title ?? DEFAULT_CONFIG.sectionTitle,
      sectionSubtitle: settingsData?.section_subtitle ?? DEFAULT_CONFIG.sectionSubtitle,
      isEnabled: settingsData?.is_enabled ?? DEFAULT_CONFIG.isEnabled,
      autoScroll: settingsData?.auto_scroll ?? DEFAULT_CONFIG.autoScroll,
      autoScrollInterval: settingsData?.auto_scroll_interval ?? DEFAULT_CONFIG.autoScrollInterval,
      featuredProductIds: Array.isArray(settingsData?.featured_product_ids)
        ? settingsData.featured_product_ids
        : DEFAULT_CONFIG.featuredProductIds,
      customTags:
        typeof settingsData?.custom_tags === 'object' && settingsData?.custom_tags !== null
          ? settingsData.custom_tags
          : DEFAULT_CONFIG.customTags,
      banners: banners.length > 0 ? banners : getVitrineConfig().banners,
      categoriesSectionTitle:
        settingsData?.categories_section_title ?? DEFAULT_CONFIG.categoriesSectionTitle,
      categoriesIsEnabled:
        settingsData?.categories_is_enabled ?? DEFAULT_CONFIG.categoriesIsEnabled,
      categoryBanners:
        categoryBanners.length > 0 ? categoryBanners : getVitrineConfig().categoryBanners || DEFAULT_CONFIG.categoryBanners,
    }

    saveVitrineConfig(config)
    return config
  } catch (err) {
    console.error('Falha geral ao buscar vitrine do Supabase:', err)
    return getVitrineConfig()
  }
}

interface ProductItem {
  id: string
  name: string
  sku: string
  price: number
  priceFormatted: string
  promoPrice?: number
  promoPriceFormatted?: string
  imageUrl?: string
  category?: string
}

interface CarrosselVitrinePageProps {
  onBack?: () => void
  onNavigateToStore?: () => void
}

export function CarrosselVitrinePage({ onBack, onNavigateToStore }: CarrosselVitrinePageProps) {
  const [activeTab, setActiveTab] = useState<'produtos' | 'banners' | 'categorias' | 'configuracoes'>('produtos')
  const [config, setConfig] = useState<VitrineConfig>(getVitrineConfig)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)

  // Filtros de busca de produtos
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'todos' | 'selecionados' | 'nao-selecionados'>('todos')

  // Estado para adicionar banner hero
  const [showAddBannerModal, setShowAddBannerModal] = useState(false)
  const [bannerTitle, setBannerTitle] = useState('')
  const [bannerSubtitle, setBannerSubtitle] = useState('')
  const [bannerBtnText, setBannerBtnText] = useState('')
  const [bannerLink, setBannerLink] = useState('')
  const [bannerImageUrl, setBannerImageUrl] = useState('')
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)

  // Estado para adicionar / editar banner de categoria
  const [showCatBannerModal, setShowCatBannerModal] = useState(false)
  const [editingCatBannerId, setEditingCatBannerId] = useState<string | null>(null)
  const [catBannerTitle, setCatBannerTitle] = useState('')
  const [catBannerBtnText, setCatBannerBtnText] = useState('CONFERIR')
  const [catBannerLink, setCatBannerLink] = useState('')
  const [catBannerImageUrl, setCatBannerImageUrl] = useState('')
  const [isUploadingCatBanner, setIsUploadingCatBanner] = useState(false)
  const catBannerFileInputRef = useRef<HTMLInputElement>(null)

  // Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr))
    }, 3000)
  }

  // Carregar produtos reais do Supabase
  useEffect(() => {
    let isMounted = true

    async function loadCatalog() {
      try {
        setIsLoadingProducts(true)
        const { data, error } = await supabase
          .from('products')
          .select('id, name, sku, price, promo_price, visibility, product_images(*), categories(name)')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Erro ao carregar catálogo para vitrine:', error)
          return
        }

        if (data && isMounted) {
          const list: ProductItem[] = data.map((item: any) => {
            const rawPrice = Number(item.price) || 0
            const promo = item.promo_price ? Number(item.promo_price) : undefined
            const cover = item.product_images?.find((img: any) => img.is_cover)?.image_url
            const first = item.product_images?.[0]?.image_url

            return {
              id: item.id,
              name: item.name,
              sku: item.sku,
              price: rawPrice,
              priceFormatted: `R$ ${rawPrice.toFixed(2).replace('.', ',')}`,
              promoPrice: promo,
              promoPriceFormatted: promo ? `R$ ${promo.toFixed(2).replace('.', ',')}` : undefined,
              imageUrl: cover || first || undefined,
              category: item.categories?.name,
            }
          })
          setProducts(list)
        }

        // Carregar configurações e banners reais do banco de dados
        const remoteConfig = await fetchVitrineConfigFromSupabase()
        if (isMounted && remoteConfig) {
          setConfig(remoteConfig)
        }
      } catch (err) {
        console.error('Falha ao carregar produtos:', err)
      } finally {
        if (isMounted) setIsLoadingProducts(false)
      }
    }

    loadCatalog()

    return () => {
      isMounted = false
    }
  }, [])

  // Alternar produto no carrossel
  const handleToggleProductInCarousel = (productId: string) => {
    setConfig((prev) => {
      const isIncluded = prev.featuredProductIds.includes(productId)
      let nextIds: string[]
      if (isIncluded) {
        nextIds = prev.featuredProductIds.filter((id) => id !== productId)
      } else {
        nextIds = [...prev.featuredProductIds, productId]
      }
      return { ...prev, featuredProductIds: nextIds }
    })
  }

  // Definir tag personalizada
  const handleSetProductTag = (productId: string, tag: string) => {
    setConfig((prev) => {
      const nextTags = { ...prev.customTags }
      if (tag.trim()) {
        nextTags[productId] = tag.trim()
      } else {
        delete nextTags[productId]
      }
      return { ...prev, customTags: nextTags }
    })
  }

  // Mover ordem do produto no carrossel
  const handleMoveOrder = (productId: string, direction: 'up' | 'down') => {
    setConfig((prev) => {
      const ids = [...prev.featuredProductIds]
      const idx = ids.indexOf(productId)
      if (idx === -1) return prev

      if (direction === 'up' && idx > 0) {
        const temp = ids[idx - 1]
        ids[idx - 1] = ids[idx]
        ids[idx] = temp
      } else if (direction === 'down' && idx < ids.length - 1) {
        const temp = ids[idx + 1]
        ids[idx + 1] = ids[idx]
        ids[idx] = temp
      }

      return { ...prev, featuredProductIds: ids }
    })
  }

  // Adicionar todos os produtos ou limpar seleção
  const handleSelectAll = () => {
    setConfig((prev) => ({
      ...prev,
      featuredProductIds: products.map((p) => p.id),
    }))
    showToast('Todos os produtos foram incluídos no carrossel da vitrine.')
  }

  const handleClearAll = () => {
    setConfig((prev) => ({
      ...prev,
      featuredProductIds: [],
    }))
    showToast('Seleção do carrossel limpa.')
  }

  // Upload de Banner
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingBanner(true)
      const res = await uploadFileToR2(file, 'products')
      if (res && res.url) {
        setBannerImageUrl(res.url)
        showToast('Imagem do banner enviada com sucesso!')
      }
    } catch (err: any) {
      showToast(err.message || 'Erro durante upload.')
    } finally {
      setIsUploadingBanner(false)
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = ''
    }
  }

  // Salvar novo banner
  const handleSaveBanner = async () => {
    if (!bannerImageUrl.trim()) {
      showToast('Por favor, faça upload ou informe a imagem do banner.')
      return
    }

    setIsSaving(true)

    const bannerPayload = {
      title: bannerTitle.trim() || 'Nova Coleção',
      subtitle: bannerSubtitle.trim() || null,
      button_text: bannerBtnText.trim() || null,
      link_url: bannerLink.trim() || null,
      image_url: bannerImageUrl.trim(),
      is_active: true,
      sort_order: config.banners.length,
    }

    try {
      const { data: inserted, error: insertErr } = await supabase
        .from('banners')
        .insert(bannerPayload)
        .select()
        .single()

      if (insertErr) {
        console.error('Erro ao salvar banner no Supabase:', insertErr)
        showToast('Erro ao gravar banner no banco: ' + insertErr.message)
      } else if (inserted) {
        const newBanner: VitrineBanner = {
          id: String(inserted.id),
          title: inserted.title,
          subtitle: inserted.subtitle || undefined,
          buttonText: inserted.button_text,
          linkUrl: inserted.link_url || undefined,
          imageUrl: inserted.image_url,
          isActive: inserted.is_active,
        }

        const updatedConfig = {
          ...config,
          banners: [newBanner, ...config.banners],
        }

        setConfig(updatedConfig)
        saveVitrineConfig(updatedConfig)
        showToast('Banner salvo e publicado com sucesso!')
      }
    } catch (err) {
      console.error('Falha geral ao salvar banner:', err)
      showToast('Erro ao salvar banner.')
    } finally {
      setIsSaving(false)
      setShowAddBannerModal(false)
      setBannerTitle('')
      setBannerSubtitle('')
      setBannerBtnText('')
      setBannerLink('')
      setBannerImageUrl('')
    }
  }

  const handleDeleteBanner = async (bannerId: string) => {
    const updatedBanners = config.banners.filter((b) => b.id !== bannerId)
    const updatedConfig = { ...config, banners: updatedBanners }
    setConfig(updatedConfig)
    saveVitrineConfig(updatedConfig)
    showToast('Banner removido da vitrine.')

    try {
      await supabase.from('banners').delete().eq('id', bannerId)
    } catch (err) {
      console.error('Erro ao excluir banner do banco:', err)
    }
  }

  const handleToggleBannerActive = async (bannerId: string) => {
    const targetBanner = config.banners.find((b) => b.id === bannerId)
    if (!targetBanner) return

    const newActiveState = !targetBanner.isActive

    const updatedBanners = config.banners.map((b) =>
      b.id === bannerId ? { ...b, isActive: newActiveState } : b
    )
    const updatedConfig = { ...config, banners: updatedBanners }
    setConfig(updatedConfig)
    saveVitrineConfig(updatedConfig)
    showToast(newActiveState ? 'Banner ativado!' : 'Banner pausado!')

    try {
      await supabase
        .from('banners')
        .update({ is_active: newActiveState, updated_at: new Date().toISOString() })
        .eq('id', bannerId)
    } catch (err) {
      console.error('Erro ao alterar status do banner:', err)
    }
  }

  // Handlers para Banners de Categoria
  const handleCatBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingCatBanner(true)
      const res = await uploadFileToR2(file, 'products')
      if (res && res.url) {
        setCatBannerImageUrl(res.url)
        showToast('Imagem da categoria enviada com sucesso!')
      }
    } catch (err: any) {
      showToast(err.message || 'Erro durante upload da imagem.')
    } finally {
      setIsUploadingCatBanner(false)
      if (catBannerFileInputRef.current) catBannerFileInputRef.current.value = ''
    }
  }

  const handleOpenAddCatBanner = () => {
    setEditingCatBannerId(null)
    setCatBannerTitle('')
    setCatBannerBtnText('CONFERIR')
    setCatBannerLink('')
    setCatBannerImageUrl('')
    setShowCatBannerModal(true)
  }

  const handleOpenEditCatBanner = (banner: CategoryBannerItem) => {
    setEditingCatBannerId(banner.id)
    setCatBannerTitle(banner.title)
    setCatBannerBtnText(banner.buttonText || '')
    setCatBannerLink(banner.linkUrl || '')
    setCatBannerImageUrl(banner.imageUrl || '')
    setShowCatBannerModal(true)
  }

  const handleSaveCategoryBanner = async () => {
    if (!catBannerTitle.trim()) {
      showToast('Por favor, informe o título da categoria.')
      return
    }

    setIsSaving(true)

    const payload = {
      title: catBannerTitle.trim(),
      button_text: catBannerBtnText.trim() || null,
      link_url: catBannerLink.trim() || null,
      image_url: catBannerImageUrl.trim() || null,
      updated_at: new Date().toISOString(),
    }

    try {
      if (editingCatBannerId) {
        // Atualizar categoria existente
        const { error: updateErr } = await supabase
          .from('category_banners')
          .update(payload)
          .eq('id', editingCatBannerId)

        if (updateErr) {
          console.error('Erro ao atualizar categoria no Supabase:', updateErr)
          showToast('Erro ao atualizar categoria: ' + updateErr.message)
        } else {
          const updated = (config.categoryBanners || []).map((cb) =>
            cb.id === editingCatBannerId
              ? {
                  ...cb,
                  title: payload.title,
                  buttonText: payload.button_text || undefined,
                  linkUrl: payload.link_url || undefined,
                  imageUrl: payload.image_url || undefined,
                }
              : cb
          )
          const updatedConfig = { ...config, categoryBanners: updated }
          setConfig(updatedConfig)
          saveVitrineConfig(updatedConfig)
          showToast('Banner de categoria atualizado!')
        }
      } else {
        // Inserir nova categoria
        const newSortOrder = (config.categoryBanners || []).length
        const { data: inserted, error: insertErr } = await supabase
          .from('category_banners')
          .insert({
            ...payload,
            sort_order: newSortOrder,
            is_active: true,
          })
          .select()
          .single()

        if (insertErr) {
          console.error('Erro ao inserir categoria:', insertErr)
          showToast('Erro ao salvar categoria: ' + insertErr.message)
        } else if (inserted) {
          const newCatItem: CategoryBannerItem = {
            id: String(inserted.id),
            title: inserted.title,
            buttonText: inserted.button_text || undefined,
            linkUrl: inserted.link_url || undefined,
            imageUrl: inserted.image_url || undefined,
            isActive: inserted.is_active,
            sortOrder: inserted.sort_order,
          }
          const updatedConfig = {
            ...config,
            categoryBanners: [...(config.categoryBanners || []), newCatItem],
          }
          setConfig(updatedConfig)
          saveVitrineConfig(updatedConfig)
          showToast('Banner de categoria adicionado com sucesso!')
        }
      }
    } catch (err) {
      console.error('Falha geral ao salvar categoria:', err)
      showToast('Erro ao salvar categoria.')
    } finally {
      setIsSaving(false)
      setShowCatBannerModal(false)
    }
  }

  const handleToggleCategoryBannerActive = async (id: string) => {
    const target = (config.categoryBanners || []).find((cb) => cb.id === id)
    if (!target) return

    const newActiveState = !target.isActive
    const updated = (config.categoryBanners || []).map((cb) =>
      cb.id === id ? { ...cb, isActive: newActiveState } : cb
    )
    const updatedConfig = { ...config, categoryBanners: updated }
    setConfig(updatedConfig)
    saveVitrineConfig(updatedConfig)
    showToast(newActiveState ? 'Categoria ativada!' : 'Categoria pausada!')

    try {
      await supabase
        .from('category_banners')
        .update({ is_active: newActiveState, updated_at: new Date().toISOString() })
        .eq('id', id)
    } catch (err) {
      console.error('Erro ao alternar status da categoria:', err)
    }
  }

  const handleDeleteCategoryBanner = async (id: string) => {
    const updated = (config.categoryBanners || []).filter((cb) => cb.id !== id)
    const updatedConfig = { ...config, categoryBanners: updated }
    setConfig(updatedConfig)
    saveVitrineConfig(updatedConfig)
    showToast('Banner de categoria removido.')

    try {
      await supabase.from('category_banners').delete().eq('id', id)
    } catch (err) {
      console.error('Erro ao excluir categoria do banco:', err)
    }
  }

  const handleMoveCategoryBannerOrder = async (id: string, direction: 'up' | 'down') => {
    const list = [...(config.categoryBanners || [])]
    const idx = list.findIndex((cb) => cb.id === id)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= list.length) return

    const temp = list[idx]
    list[idx] = list[targetIdx]
    list[targetIdx] = temp

    const updatedConfig = { ...config, categoryBanners: list }
    setConfig(updatedConfig)
    saveVitrineConfig(updatedConfig)

    try {
      for (let i = 0; i < list.length; i++) {
        await supabase
          .from('category_banners')
          .update({ sort_order: i })
          .eq('id', list[i].id)
      }
    } catch (err) {
      console.error('Erro ao sincronizar ordenação de categorias:', err)
    }
  }

  // Salvar alterações gerais
  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      // 1. Salvar configurações no Supabase
      const { error: settingsErr } = await supabase
        .from('vitrine_settings')
        .upsert({
          id: 'default',
          section_title: config.sectionTitle,
          section_subtitle: config.sectionSubtitle || null,
          is_enabled: config.isEnabled,
          auto_scroll: config.autoScroll,
          auto_scroll_interval: config.autoScrollInterval,
          featured_product_ids: config.featuredProductIds,
          custom_tags: config.customTags,
          categories_section_title: config.categoriesSectionTitle || 'Categorias',
          categories_is_enabled: config.categoriesIsEnabled ?? true,
          updated_at: new Date().toISOString(),
        })

      if (settingsErr) {
        console.error('Erro ao salvar configurações de vitrine no Supabase:', settingsErr)
      }

      // 2. Atualizar ordenação dos banners
      for (let i = 0; i < config.banners.length; i++) {
        const b = config.banners[i]
        await supabase
          .from('banners')
          .update({
            sort_order: i,
            is_active: b.isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', b.id)
      }

      // 3. Atualizar ordenação dos banners de categoria
      for (let i = 0; i < (config.categoryBanners || []).length; i++) {
        const cb = config.categoryBanners[i]
        await supabase
          .from('category_banners')
          .update({
            sort_order: i,
            is_active: cb.isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cb.id)
      }

      saveVitrineConfig(config)
      showToast('Configurações do Carrossel Vitrine salvas no banco com sucesso!')
    } catch (err) {
      console.error('Erro ao salvar tudo:', err)
      saveVitrineConfig(config)
      showToast('Configurações salvas localmente.')
    } finally {
      setIsSaving(false)
    }
  }

  // Produtos filtrados para exibição na lista
  const filteredProducts = products.filter((p) => {
    const isSelected = config.featuredProductIds.includes(p.id)
    if (filterMode === 'selecionados' && !isSelected) return false
    if (filterMode === 'nao-selecionados' && isSelected) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = p.name.toLowerCase().includes(q)
      const matchSku = p.sku.toLowerCase().includes(q)
      const matchCat = p.category?.toLowerCase().includes(q)
      if (!matchName && !matchSku && !matchCat) return false
    }

    return true
  })

  // Produtos ativos no carrossel para Live Preview
  const previewProducts = config.featuredProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as ProductItem[]

  // Se nenhum estiver explicitamente selecionado, preview mostra catálogo geral
  const displayPreviewList = previewProducts.length > 0 ? previewProducts : products.slice(0, 6)

  return (
    <div className="shipping-page-container" style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Topbar Superior */}
      <header className="product-create-topbar">
        <div className="product-create-topbar-left">
          {onBack && (
            <button
              type="button"
              className="product-create-back-btn"
              onClick={onBack}
              title="Voltar"
              style={{ fontWeight: 400 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Voltar</span>
            </button>
          )}

          <div className="product-create-breadcrumbs">
            <span className="crumb-segment" style={{ fontWeight: 400 }}>Vitrine</span>
            <span className="crumb-separator">/</span>
            <span className="crumb-current" style={{ fontWeight: 400 }}>Carrossel Vitrine</span>
          </div>
        </div>

        <div className="product-create-topbar-right">
          {onNavigateToStore && (
            <button
              type="button"
              className="product-create-discard-btn"
              style={{ fontWeight: 400 }}
              onClick={onNavigateToStore}
            >
              Ver na loja
            </button>
          )}

          <button
            type="button"
            className="product-create-save-btn"
            style={{ fontWeight: 400 }}
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.75rem 1.5rem 4rem', width: '100%' }}>
        {/* Banner de Apresentação / Header da Página */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: '#111827',
                textTransform: 'uppercase',
              }}
            >
              Carrossel Vitrine
            </h1>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: '#6b7280', fontWeight: 400 }}>
              Gerencie quais produtos aparecem no carrossel da vitrine, a ordem de exibição, etiquetas e banners promocionais.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.78rem',
                color: config.isEnabled ? '#059669' : '#dc2626',
                backgroundColor: config.isEnabled ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${config.isEnabled ? '#a7f3d0' : '#fecaca'}`,
                padding: '0.35rem 0.75rem',
                fontWeight: 400,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: config.isEnabled ? '#059669' : '#dc2626',
                }}
              />
              {config.isEnabled ? 'Carrossel Ativo na Loja' : 'Carrossel Ocultado'}
            </span>
          </div>
        </div>

        {/* Abas de Navegação Interna */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
            marginBottom: '1.5rem',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('produtos')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'produtos' ? '2px solid #000000' : '2px solid transparent',
              color: activeTab === 'produtos' ? '#000000' : '#6b7280',
              fontSize: '0.86rem',
              fontWeight: 400,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'inherit',
            }}
          >
            <span>Produtos no Carrossel</span>
            <span
              style={{
                fontSize: '0.72rem',
                backgroundColor: activeTab === 'produtos' ? '#000000' : '#f3f4f6',
                color: activeTab === 'produtos' ? '#ffffff' : '#6b7280',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: 400,
              }}
            >
              {config.featuredProductIds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'banners' ? '2px solid #000000' : '2px solid transparent',
              color: activeTab === 'banners' ? '#000000' : '#6b7280',
              fontSize: '0.86rem',
              fontWeight: 400,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'inherit',
            }}
          >
            <span>Banner Principal (Topo)</span>
            <span
              style={{
                fontSize: '0.72rem',
                backgroundColor: activeTab === 'banners' ? '#000000' : '#f3f4f6',
                color: activeTab === 'banners' ? '#ffffff' : '#6b7280',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: 400,
              }}
            >
              {config.banners.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categorias')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'categorias' ? '2px solid #000000' : '2px solid transparent',
              color: activeTab === 'categorias' ? '#000000' : '#6b7280',
              fontSize: '0.86rem',
              fontWeight: 400,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontFamily: 'inherit',
            }}
          >
            <span>Banners de Categoria</span>
            <span
              style={{
                fontSize: '0.72rem',
                backgroundColor: activeTab === 'categorias' ? '#000000' : '#f3f4f6',
                color: activeTab === 'categorias' ? '#ffffff' : '#6b7280',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: 400,
              }}
            >
              {(config.categoryBanners || []).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('configuracoes')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'configuracoes' ? '2px solid #000000' : '2px solid transparent',
              color: activeTab === 'configuracoes' ? '#000000' : '#6b7280',
              fontSize: '0.86rem',
              fontWeight: 400,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Configurações Gerais
          </button>
        </div>

        {/* TAB 1: PRODUTOS NO CARROSSEL */}
        {activeTab === 'produtos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Barra de Filtros e Ações Rápidas */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                padding: '1rem 1.25rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 300px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                  <input
                    type="text"
                    placeholder="Buscar produto por nome ou SKU..."
                    className="form-input-custom"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ fontWeight: 400, fontSize: '0.82rem', height: '36px', paddingLeft: '2rem' }}
                  />
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    style={{ position: 'absolute', left: '10px', top: '11px' }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => setFilterMode('todos')}
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      backgroundColor: filterMode === 'todos' ? '#000000' : '#f9fafb',
                      color: filterMode === 'todos' ? '#ffffff' : '#4b5563',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Todos ({products.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('selecionados')}
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      backgroundColor: filterMode === 'selecionados' ? '#000000' : '#f9fafb',
                      color: filterMode === 'selecionados' ? '#ffffff' : '#4b5563',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Na Vitrine ({config.featuredProductIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('nao-selecionados')}
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      backgroundColor: filterMode === 'nao-selecionados' ? '#000000' : '#f9fafb',
                      color: filterMode === 'nao-selecionados' ? '#ffffff' : '#4b5563',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Fora da Vitrine
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    color: '#374151',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            {/* Lista de Produtos para Vitrine */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.84rem', color: '#111827', fontWeight: 400 }}>
                  Catálogo ({filteredProducts.length} produtos listados)
                </span>
                <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 400 }}>
                  Marque a caixa para exibir o produto no carrossel da vitrine
                </span>
              </div>

              {isLoadingProducts ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#6b7280', fontWeight: 400 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 400 }}>Carregando catálogo...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#6b7280', fontWeight: 400 }}>
                  <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 400 }}>
                    Nenhum produto encontrado para os filtros selecionados.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredProducts.map((p) => {
                    const isSelected = config.featuredProductIds.includes(p.id)
                    const orderIndex = config.featuredProductIds.indexOf(p.id)
                    const currentTag = config.customTags[p.id] || ''

                    return (
                      <div
                        key={p.id}
                        style={{
                          padding: '0.85rem 1.25rem',
                          borderBottom: '1px solid #f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* Checkbox + Imagem + Dados */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 auto' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleProductInCarousel(p.id)}
                            style={{
                              width: '18px',
                              height: '18px',
                              accentColor: '#000000',
                              cursor: 'pointer',
                            }}
                            title="Incluir no carrossel da vitrine"
                          />

                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              backgroundColor: '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              </svg>
                            )}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.88rem', color: '#111827', fontWeight: 400 }}>
                                {p.name}
                              </span>
                              {isSelected && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    backgroundColor: '#000000',
                                    color: '#ffffff',
                                    padding: '1px 6px',
                                    fontWeight: 400,
                                    letterSpacing: '0.03em',
                                  }}
                                >
                                  Posição #{orderIndex + 1}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                              <span style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 400 }}>
                                SKU: {p.sku}
                              </span>
                              <span style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 400 }}>
                                {p.category || 'Geral'}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#111827', fontWeight: 400 }}>
                                {p.priceFormatted}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Controles de Tag e Ordem */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                          {/* Seletor de Tag do Card */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 400 }}>Tag:</span>
                            <select
                              value={currentTag}
                              onChange={(e) => handleSetProductTag(p.id, e.target.value)}
                              disabled={!isSelected}
                              style={{
                                height: '32px',
                                fontSize: '0.76rem',
                                fontWeight: 400,
                                border: '1px solid #d1d5db',
                                backgroundColor: isSelected ? '#ffffff' : '#f9fafb',
                                color: '#374151',
                                padding: '0 0.5rem',
                                borderRadius: 0,
                                cursor: isSelected ? 'pointer' : 'not-allowed',
                                fontFamily: 'inherit',
                              }}
                            >
                              <option value="">Sem tag</option>
                              <option value="Mais Vendido">Mais Vendido</option>
                              <option value="Destaque">Destaque</option>
                              <option value="Novo">Novo</option>
                              <option value="Promoção">Promoção</option>
                              <option value="Exclusivo">Exclusivo</option>
                              <option value="Edição Limitada">Edição Limitada</option>
                            </select>
                          </div>

                          {/* Ordenação */}
                          {isSelected && (
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <button
                                type="button"
                                onClick={() => handleMoveOrder(p.id, 'up')}
                                disabled={orderIndex === 0}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  border: '1px solid #d1d5db',
                                  backgroundColor: '#ffffff',
                                  cursor: orderIndex === 0 ? 'not-allowed' : 'pointer',
                                  opacity: orderIndex === 0 ? 0.4 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Mover para a esquerda / cima"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveOrder(p.id, 'down')}
                                disabled={orderIndex === config.featuredProductIds.length - 1}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  border: '1px solid #d1d5db',
                                  backgroundColor: '#ffffff',
                                  cursor: orderIndex === config.featuredProductIds.length - 1 ? 'not-allowed' : 'pointer',
                                  opacity: orderIndex === config.featuredProductIds.length - 1 ? 0.4 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Mover para a direita / baixo"
                              >
                                ↓
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BANNERS & SLIDES */}
        {activeTab === 'banners' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 400, color: '#111827' }}>
                  Banners de Destaque da Vitrine
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6b7280', fontWeight: 400 }}>
                  Estes banners são exibidos no topo da loja antes da listagem dos produtos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddBannerModal(true)}
                style={{
                  padding: '0.55rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 400,
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  border: '1px solid #000000',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                + Adicionar Banner
              </button>
            </div>

            {/* Lista de Banners */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
              {config.banners.length === 0 ? (
                <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#6b7280', fontWeight: 400 }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.25" style={{ margin: '0 auto 0.75rem' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#111827', fontWeight: 400 }}>
                    Nenhum banner cadastrado
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6b7280', fontWeight: 400 }}>
                    Adicione banners com imagem e texto para destacar campanhas e novidades.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', padding: '1.25rem' }}>
                  {config.banners.map((banner) => (
                    <div
                      key={banner.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#fafafa',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ width: '100%', height: '140px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                        <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.88rem', color: '#111827', fontWeight: 400 }}>{banner.title}</span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: banner.isActive ? '#059669' : '#9ca3af',
                              backgroundColor: banner.isActive ? '#ecfdf5' : '#f3f4f6',
                              padding: '2px 6px',
                              fontWeight: 400,
                            }}
                          >
                            {banner.isActive ? 'Ativo' : 'Pausado'}
                          </span>
                        </div>
                        {banner.subtitle && (
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#6b7280', fontWeight: 400 }}>
                            {banner.subtitle}
                          </p>
                        )}
                        <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleBannerActive(banner.id)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.74rem',
                              border: '1px solid #d1d5db',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              cursor: 'pointer',
                              fontWeight: 400,
                              fontFamily: 'inherit',
                            }}
                          >
                            {banner.isActive ? 'Pausar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBanner(banner.id)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.74rem',
                              border: '1px solid #fee2e2',
                              backgroundColor: '#fff5f5',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontWeight: 400,
                              fontFamily: 'inherit',
                            }}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BANNERS DE CATEGORIA */}
        {activeTab === 'categorias' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Cabeçalho da Aba */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 400, color: '#111827' }}>
                  Banners de Categoria da Vitrine
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6b7280', fontWeight: 400 }}>
                  Estes banners compõem a grade de categorias da loja virtual, direcionando clientes para coleções e lançamentos específicos.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddCatBanner}
                style={{
                  padding: '0.55rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 400,
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  border: '1px solid #000000',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                + Adicionar Banner de Categoria
              </button>
            </div>

            {/* Configuração rápida da seção de categorias */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="cat-section-enabled"
                  checked={config.categoriesIsEnabled ?? true}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, categoriesIsEnabled: e.target.checked }))
                  }
                  style={{ width: '18px', height: '18px', accentColor: '#000000', cursor: 'pointer' }}
                />
                <label
                  htmlFor="cat-section-enabled"
                  style={{ fontSize: '0.84rem', color: '#111827', fontWeight: 400, cursor: 'pointer' }}
                >
                  Exibir seção de categorias na vitrine da loja
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label
                  htmlFor="cat-section-title"
                  style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 400 }}
                >
                  Título da Seção:
                </label>
                <input
                  type="text"
                  id="cat-section-title"
                  value={config.categoriesSectionTitle || 'Categorias'}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, categoriesSectionTitle: e.target.value }))
                  }
                  style={{
                    height: '32px',
                    padding: '0 0.5rem',
                    fontSize: '0.82rem',
                    border: '1px solid #d1d5db',
                    fontWeight: 400,
                    width: '180px',
                  }}
                />
              </div>
            </div>

            {/* Grade dos Banners de Categoria */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
              {(config.categoryBanners || []).length === 0 ? (
                <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#6b7280', fontWeight: 400 }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.25" style={{ margin: '0 auto 0.75rem' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#111827', fontWeight: 400 }}>
                    Nenhum banner de categoria cadastrado
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6b7280', fontWeight: 400 }}>
                    Clique em "+ Adicionar Banner de Categoria" para criar os cards da vitrine.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1rem',
                    padding: '1.25rem',
                  }}
                >
                  {(config.categoryBanners || []).map((cb, idx) => (
                    <div
                      key={cb.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#fafafa',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {/* Prévia Visual do Banner */}
                      <div
                        style={{
                          width: '100%',
                          height: '160px',
                          position: 'relative',
                          backgroundColor: '#e5e7eb',
                          overflow: 'hidden',
                        }}
                      >
                        {cb.imageUrl ? (
                          <img
                            src={cb.imageUrl}
                            alt={cb.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              color: '#9ca3af',
                            }}
                          >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <span style={{ fontSize: '0.72rem', fontWeight: 400 }}>Espaço para o Banner</span>
                          </div>
                        )}

                        {/* Overlay simulado */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            color: '#ffffff',
                          }}
                        >
                          <span style={{ fontSize: '0.95rem', fontWeight: 400, textTransform: 'uppercase' }}>
                            {cb.title}
                          </span>
                          {cb.buttonText && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 400,
                                borderBottom: '1px solid #ffffff',
                                paddingBottom: '1px',
                                textTransform: 'uppercase',
                              }}
                            >
                              {cb.buttonText}
                            </span>
                          )}
                        </div>

                        {/* Badge de Status */}
                        <span
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            fontSize: '0.68rem',
                            color: cb.isActive ? '#059669' : '#9ca3af',
                            backgroundColor: cb.isActive ? 'rgba(236, 253, 245, 0.95)' : 'rgba(243, 244, 246, 0.95)',
                            padding: '2px 7px',
                            fontWeight: 400,
                            border: `1px solid ${cb.isActive ? '#a7f3d0' : '#e5e7eb'}`,
                            backdropFilter: 'blur(2px)',
                          }}
                        >
                          {cb.isActive ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>

                      {/* Informações e Ações */}
                      <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.84rem', color: '#111827', fontWeight: 400 }}>
                            {cb.title}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 400 }}>
                            Ordem #{idx + 1}
                          </span>
                        </div>

                        {cb.linkUrl && (
                          <span style={{ fontSize: '0.74rem', color: '#9ca3af', fontWeight: 400, wordBreak: 'break-all' }}>
                            Link: {cb.linkUrl}
                          </span>
                        )}

                        <div
                          style={{
                            marginTop: 'auto',
                            paddingTop: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderTop: '1px solid #f3f4f6',
                          }}
                        >
                          {/* Reordenação */}
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveCategoryBannerOrder(cb.id, 'up')}
                              disabled={idx === 0}
                              style={{
                                width: '26px',
                                height: '26px',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#ffffff',
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                opacity: idx === 0 ? 0.3 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                              }}
                              title="Mover para a esquerda / cima"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCategoryBannerOrder(cb.id, 'down')}
                              disabled={idx === (config.categoryBanners || []).length - 1}
                              style={{
                                width: '26px',
                                height: '26px',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#ffffff',
                                cursor: idx === (config.categoryBanners || []).length - 1 ? 'not-allowed' : 'pointer',
                                opacity: idx === (config.categoryBanners || []).length - 1 ? 0.3 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                              }}
                              title="Mover para a direita / baixo"
                            >
                              ↓
                            </button>
                          </div>

                          {/* Ações */}
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleCategoryBannerActive(cb.id)}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.74rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                cursor: 'pointer',
                                fontWeight: 400,
                                fontFamily: 'inherit',
                              }}
                            >
                              {cb.isActive ? 'Pausar' : 'Ativar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditCatBanner(cb)}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.74rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#ffffff',
                                color: '#374151',
                                cursor: 'pointer',
                                fontWeight: 400,
                                fontFamily: 'inherit',
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategoryBanner(cb.id)}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.74rem',
                                border: '1px solid #fee2e2',
                                backgroundColor: '#fff5f5',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontWeight: 400,
                                fontFamily: 'inherit',
                              }}
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CONFIGURAÇÕES GERAIS */}
        {activeTab === 'configuracoes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '0.96rem', fontWeight: 400, color: '#111827' }}>
                Configurações do Carrossel de Produtos
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group-custom">
                  <label htmlFor="vitrine-title" className="form-label-custom" style={{ fontWeight: 400 }}>
                    Título da Seção na Vitrine
                  </label>
                  <input
                    type="text"
                    id="vitrine-title"
                    className="form-input-custom"
                    value={config.sectionTitle}
                    onChange={(e) => setConfig((prev) => ({ ...prev, sectionTitle: e.target.value }))}
                    style={{ fontWeight: 400 }}
                  />
                  <span className="form-hint-msg" style={{ fontWeight: 400 }}>
                    Padrão: "Os Queridinhos"
                  </span>
                </div>

                <div className="form-group-custom">
                  <label htmlFor="vitrine-subtitle" className="form-label-custom" style={{ fontWeight: 400 }}>
                    Subtítulo / Mensagem de apoio (opcional)
                  </label>
                  <input
                    type="text"
                    id="vitrine-subtitle"
                    className="form-input-custom"
                    value={config.sectionSubtitle || ''}
                    onChange={(e) => setConfig((prev) => ({ ...prev, sectionSubtitle: e.target.value }))}
                    placeholder="Ex: Peças essenciais com design minimalista"
                    style={{ fontWeight: 400 }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid #f3f4f6' }}>
                  <div>
                    <span style={{ fontSize: '0.86rem', color: '#111827', fontWeight: 400, display: 'block' }}>
                      Exibir Carrossel na Vitrine
                    </span>
                    <span style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 400 }}>
                      Se desativado, o carrossel fica oculto para os visitantes.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.isEnabled}
                    onChange={(e) => setConfig((prev) => ({ ...prev, isEnabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#000000', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid #f3f4f6' }}>
                  <div>
                    <span style={{ fontSize: '0.86rem', color: '#111827', fontWeight: 400, display: 'block' }}>
                      Rolagem Automática (Autoplay)
                    </span>
                    <span style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 400 }}>
                      Avança automaticamente os cards de produtos.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoScroll}
                    onChange={(e) => setConfig((prev) => ({ ...prev, autoScroll: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#000000', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>

            {/* Configurações da Seção de Categorias */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '0.96rem', fontWeight: 400, color: '#111827' }}>
                Configurações da Grade de Categorias
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group-custom">
                  <label htmlFor="cat-cfg-title" className="form-label-custom" style={{ fontWeight: 400 }}>
                    Título da Seção de Categorias
                  </label>
                  <input
                    type="text"
                    id="cat-cfg-title"
                    className="form-input-custom"
                    value={config.categoriesSectionTitle || 'Categorias'}
                    onChange={(e) => setConfig((prev) => ({ ...prev, categoriesSectionTitle: e.target.value }))}
                    style={{ fontWeight: 400 }}
                  />
                  <span className="form-hint-msg" style={{ fontWeight: 400 }}>
                    Padrão: "Categorias"
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid #f3f4f6' }}>
                  <div>
                    <span style={{ fontSize: '0.86rem', color: '#111827', fontWeight: 400, display: 'block' }}>
                      Exibir Grade de Categorias na Vitrine
                    </span>
                    <span style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 400 }}>
                      Se desativado, os banners de categorias ficam ocultos na loja.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.categoriesIsEnabled ?? true}
                    onChange={(e) => setConfig((prev) => ({ ...prev, categoriesIsEnabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: '#000000', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Preview Section */}
        <div style={{ marginTop: '2.5rem', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 400 }}>
                PRÉ-VISUALIZAÇÃO AO VIVO
              </span>
              <h4 style={{ margin: '0.2rem 0 0', fontSize: '0.94rem', fontWeight: 400, color: '#111827' }}>
                Como o cliente visualiza a vitrine na loja
              </h4>
            </div>
            <span style={{ fontSize: '0.76rem', color: '#6b7280', fontWeight: 400 }}>
              {displayPreviewList.length} produto(s) exibido(s)
            </span>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#fafafa', border: '1px solid #f0f0f0' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: 400, textTransform: 'uppercase', color: '#111827' }}>
              {config.sectionTitle || 'Os Queridinhos'}
            </h3>

            {displayPreviewList.length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: '#6b7280', fontWeight: 400 }}>
                Nenhum produto cadastrado na vitrine.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {displayPreviewList.map((p) => {
                  const tag = config.customTags[p.id]

                  return (
                    <div
                      key={p.id}
                      style={{
                        width: '200px',
                        flexShrink: 0,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        padding: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1/1',
                          backgroundColor: '#f3f4f6',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {tag && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '6px',
                              left: '6px',
                              backgroundColor: '#000000',
                              color: '#ffffff',
                              fontSize: '0.62rem',
                              fontWeight: 400,
                              padding: '2px 5px',
                              textTransform: 'uppercase',
                              zIndex: 2,
                            }}
                          >
                            {tag}
                          </span>
                        )}
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 400 }}>Sem foto</span>
                        )}
                      </div>
                      <div style={{ padding: '0.5rem 0' }}>
                        <span style={{ fontSize: '0.82rem', color: '#111827', fontWeight: 400, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#111827', fontWeight: 400, marginTop: '0.2rem', display: 'block' }}>
                          {p.promoPriceFormatted || p.priceFormatted}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Adicionar Banner */}
      {showAddBannerModal && (
        <div className="category-modal-overlay" onClick={() => setShowAddBannerModal(false)}>
          <div className="category-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="category-modal-header">
              <div>
                <h3 className="category-modal-title" style={{ fontWeight: 400 }}>Adicionar Banner à Vitrine</h3>
                <span className="category-modal-subtitle" style={{ fontWeight: 400 }}>
                  Faça o upload da imagem ou informe uma URL
                </span>
              </div>
              <button
                type="button"
                className="category-modal-close"
                onClick={() => setShowAddBannerModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="category-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group-custom">
                <label className="form-label-custom" style={{ fontWeight: 400 }}>Imagem do Banner *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input-custom"
                    placeholder="URL da imagem ou faça upload ao lado..."
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    style={{ fontWeight: 400 }}
                  />
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleBannerUpload}
                  />
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={isUploadingBanner}
                    style={{
                      padding: '0 0.85rem',
                      fontSize: '0.76rem',
                      fontWeight: 400,
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      color: '#374151',
                      cursor: isUploadingBanner ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      fontFamily: 'inherit',
                    }}
                  >
                    {isUploadingBanner ? 'Enviando...' : 'Upload'}
                  </button>
                </div>
              </div>

              {bannerImageUrl && (
                <div style={{ width: '100%', height: '110px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                  <img src={bannerImageUrl} alt="Prévia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div className="form-group-custom">
                <label className="form-label-custom" style={{ fontWeight: 400 }}>Título do Banner</label>
                <input
                  type="text"
                  className="form-input-custom"
                  placeholder="Ex: Coleção Verão 2026"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  style={{ fontWeight: 400 }}
                />
              </div>

              <div className="form-group-custom">
                <label className="form-label-custom" style={{ fontWeight: 400 }}>Subtítulo (opcional)</label>
                <input
                  type="text"
                  className="form-input-custom"
                  placeholder="Ex: Óculos polarizados em acetato premium"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  style={{ fontWeight: 400 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group-custom">
                  <label className="form-label-custom" style={{ fontWeight: 400 }}>Texto do Botão (opcional)</label>
                  <input
                    type="text"
                    className="form-input-custom"
                    placeholder="Deixe em branco para sem botão"
                    value={bannerBtnText}
                    onChange={(e) => setBannerBtnText(e.target.value)}
                    style={{ fontWeight: 400 }}
                  />
                </div>
                <div className="form-group-custom">
                  <label className="form-label-custom" style={{ fontWeight: 400 }}>Link de Destino</label>
                  <input
                    type="text"
                    className="form-input-custom"
                    placeholder="/produto ou /"
                    value={bannerLink}
                    onChange={(e) => setBannerLink(e.target.value)}
                    style={{ fontWeight: 400 }}
                  />
                </div>
              </div>
            </div>

            <div className="category-modal-footer">
              <button
                type="button"
                className="product-create-discard-btn"
                style={{ fontWeight: 400 }}
                onClick={() => setShowAddBannerModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="product-create-save-btn"
                style={{ fontWeight: 400 }}
                onClick={handleSaveBanner}
              >
                Salvar Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar / Editar Banner de Categoria */}
      {showCatBannerModal && (
        <div className="category-modal-overlay" onClick={() => setShowCatBannerModal(false)}>
          <div className="category-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="category-modal-header">
              <div>
                <h3 className="category-modal-title" style={{ fontWeight: 400 }}>
                  {editingCatBannerId ? 'Editar Banner de Categoria' : 'Adicionar Banner de Categoria'}
                </h3>
                <span className="category-modal-subtitle" style={{ fontWeight: 400 }}>
                  Configure imagem, título e link do card de categoria
                </span>
              </div>
              <button
                type="button"
                className="category-modal-close"
                onClick={() => setShowCatBannerModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="category-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group-custom">
                <label className="form-label-custom" style={{ fontWeight: 400 }}>Imagem da Categoria (opcional)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input-custom"
                    placeholder="URL da imagem ou faça upload..."
                    value={catBannerImageUrl}
                    onChange={(e) => setCatBannerImageUrl(e.target.value)}
                    style={{ fontWeight: 400 }}
                  />
                  <input
                    type="file"
                    ref={catBannerFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleCatBannerUpload}
                  />
                  <button
                    type="button"
                    onClick={() => catBannerFileInputRef.current?.click()}
                    disabled={isUploadingCatBanner}
                    style={{
                      padding: '0 0.85rem',
                      fontSize: '0.76rem',
                      fontWeight: 400,
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      color: '#374151',
                      cursor: isUploadingCatBanner ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      fontFamily: 'inherit',
                    }}
                  >
                    {isUploadingCatBanner ? 'Enviando...' : 'Upload'}
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem', display: 'block' }}>
                  Se não houver imagem, a vitrine exibirá o espaço reservado padrão.
                </span>
              </div>

              {catBannerImageUrl && (
                <div style={{ width: '100%', height: '110px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                  <img src={catBannerImageUrl} alt="Prévia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div className="form-group-custom">
                <label className="form-label-custom" style={{ fontWeight: 400 }}>Título da Categoria *</label>
                <input
                  type="text"
                  className="form-input-custom"
                  placeholder="Ex: Coleção Verão ou Lançamentos"
                  value={catBannerTitle}
                  onChange={(e) => setCatBannerTitle(e.target.value)}
                  style={{ fontWeight: 400 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group-custom">
                  <label className="form-label-custom" style={{ fontWeight: 400 }}>Texto do Botão / Link</label>
                  <input
                    type="text"
                    className="form-input-custom"
                    placeholder="Ex: CONFERIR"
                    value={catBannerBtnText}
                    onChange={(e) => setCatBannerBtnText(e.target.value)}
                    style={{ fontWeight: 400 }}
                  />
                </div>
                <div className="form-group-custom">
                  <label className="form-label-custom" style={{ fontWeight: 400 }}>Link de Destino</label>
                  <input
                    type="text"
                    className="form-input-custom"
                    placeholder="/ ou /#produtos"
                    value={catBannerLink}
                    onChange={(e) => setCatBannerLink(e.target.value)}
                    style={{ fontWeight: 400 }}
                  />
                </div>
              </div>
            </div>

            <div className="category-modal-footer">
              <button
                type="button"
                className="btn-cancel-custom"
                onClick={() => setShowCatBannerModal(false)}
                style={{ fontWeight: 400 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirm-custom"
                onClick={handleSaveCategoryBanner}
                disabled={isSaving || isUploadingCatBanner}
                style={{ fontWeight: 400 }}
              >
                {isSaving ? 'Gravando...' : editingCatBannerId ? 'Salvar Alterações' : 'Salvar Banner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="order-toast-notification" style={{ fontWeight: 400 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
