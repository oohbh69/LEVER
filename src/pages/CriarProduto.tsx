import { useState, useRef, type ChangeEvent } from 'react'
import { uploadFileToR2 } from '../lib/r2'
import { supabase } from '../lib/supabase'

export interface NewProductData {
  id: string
  name: string
  sku: string
  description: string
  category: string
  subCategory?: string
  tags?: string[]
  price: string
  priceNumeric: number
  promoPrice: string
  promoPriceNumeric?: number
  costPrice?: string
  stock: number
  stockLocation?: string
  lowStockAlert?: number
  trackStock: boolean
  continueSellingOutOfStock: boolean
  weight: string
  length: string
  width: string
  height: string
  visibility: 'visivel' | 'oculto' | 'rascunho'
  freeShipping: boolean
  freeShippingScope: 'brasil' | 'regional'
  showFreeShippingBadge: boolean
  images: string[]
  videos: string[]
  createdAt: number
}

interface CriarProdutoProps {
  onBack: () => void
  onSave: (product: NewProductData) => void
}

export function CriarProdutoPage({ onBack, onSave }: CriarProdutoProps) {
  // Nome, Descrição e SKU
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')

  // Fotos e Vídeos
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [mediaUrlInput, setMediaUrlInput] = useState('')
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Preço e Preço promocional
  const [price, setPrice] = useState('')
  const [promoPrice, setPromoPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')

  // Dimensões de envio
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')

  // Estoque
  const [stock, setStock] = useState('')
  const [stockLocation, setStockLocation] = useState('')
  const [lowStockAlert, setLowStockAlert] = useState('')
  const [trackStock, setTrackStock] = useState(true)
  const [continueSellingOutOfStock, setContinueSellingOutOfStock] = useState(false)

  // Categoria & Tags
  const [categoriesList, setCategoriesList] = useState<string[]>([
    'Eyewear',
    'Roupas',
    'Acessórios',
  ])
  const [category, setCategory] = useState('Eyewear')
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryModalError, setCategoryModalError] = useState('')
  const [barcode, setBarcode] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // Visibilidade
  const [visibility, setVisibility] = useState<'visivel' | 'oculto' | 'rascunho'>('visivel')

  // Oferecer frete grátis
  const [freeShipping, setFreeShipping] = useState(false)
  const [freeShippingScope, setFreeShippingScope] = useState<'brasil' | 'regional'>('brasil')
  const [showFreeShippingBadge, setShowFreeShippingBadge] = useState(true)

  // Feedback e Validações
  const [formErrors, setFormErrors] = useState<{ name?: string; price?: string }>({})
  const [isSaving, setIsSaving] = useState(false)

  // Formatação de Moeda
  const parseCurrencyInput = (val: string) => {
    // Mantém dígitos
    const cleanDigits = val.replace(/\D/g, '')
    if (!cleanDigits) return ''
    const numberValue = parseFloat(cleanDigits) / 100
    return numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const parseToNumber = (val: string): number => {
    if (!val) return 0
    const clean = val.replace(/[^\d,]/g, '').replace(',', '.')
    return parseFloat(clean) || 0
  }

  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = parseCurrencyInput(e.target.value)
    setPrice(formatted)
    if (formErrors.price) {
      setFormErrors((prev) => ({ ...prev, price: undefined }))
    }
  }

  const handlePromoPriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = parseCurrencyInput(e.target.value)
    setPromoPrice(formatted)
  }

  const handleCostPriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = parseCurrencyInput(e.target.value)
    setCostPrice(formatted)
  }

  // Cálculos automáticos de preço e desconto
  const priceNum = parseToNumber(price)
  const promoNum = parseToNumber(promoPrice)
  const costNum = parseToNumber(costPrice)

  const hasDiscount = promoNum > 0 && priceNum > 0 && promoNum < priceNum
  const discountPercent = hasDiscount
    ? Math.round(((priceNum - promoNum) / priceNum) * 100)
    : 0
  const discountDiff = hasDiscount ? priceNum - promoNum : 0

  const effectiveSellingPrice = promoNum > 0 ? promoNum : priceNum
  const estimatedProfit =
    costNum > 0 && effectiveSellingPrice > costNum
      ? effectiveSellingPrice - costNum
      : 0
  const profitMarginPercent =
    effectiveSellingPrice > 0 && costNum > 0
      ? Math.round((estimatedProfit / effectiveSellingPrice) * 100)
      : 0

  // Cálculo de cubagem
  const packageVolume =
    (parseFloat(length) || 0) * (parseFloat(width) || 0) * (parseFloat(height) || 0)

  // Gerador de SKU
  const handleGenerateSku = () => {
    const catCode = category.slice(0, 3).toUpperCase() || 'LEV'
    const randomCode = Math.floor(1000 + Math.random() * 9000)
    const generated = `LEV-${catCode}-${randomCode}`
    setSku(generated)
  }

  // Upload e gerenciamento de fotos/vídeos para o Cloudflare R2
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileList = Array.from(files)
    setIsUploadingMedia(true)
    setUploadProgress(10)

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        const isVideo = file.type.startsWith('video/')
        const folder = isVideo ? 'products/videos' : 'products/images'

        const res = await uploadFileToR2(file, folder as 'products', (p) => {
          setUploadProgress(Math.round(((i + p / 100) / fileList.length) * 100))
        })

        if (isVideo) {
          setVideos((prev) => [...prev, res.url])
        } else {
          setImages((prev) => [...prev, res.url])
        }
      }
    } catch (err: any) {
      console.error('Erro ao enviar mídia para o Cloudflare R2:', err)
      alert(err.message || 'Erro no upload para o Cloudflare R2.')
    } finally {
      setIsUploadingMedia(false)
      setUploadProgress(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAddMediaUrl = () => {
    if (!mediaUrlInput.trim()) return
    const url = mediaUrlInput.trim()
    const isVideo =
      url.endsWith('.mp4') ||
      url.endsWith('.mov') ||
      url.includes('youtube.com') ||
      url.includes('vimeo.com')

    if (isVideo) {
      setVideos((prev) => [...prev, url])
    } else {
      setImages((prev) => [...prev, url])
    }
    setMediaUrlInput('')
    setShowUrlModal(false)
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return
    setImages((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.unshift(item)
      return copy
    })
  }

  const handleRemoveVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index))
  }

  // Tags
  const handleAddTag = () => {
    const cleanTag = tagInput.trim().replace(/^#/, '')
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags((prev) => [...prev, cleanTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove))
  }

  // Presets rápidos de dimensões
  const applyDimensionPreset = (preset: 'oculos' | 'acessorio' | 'vestuario') => {
    if (preset === 'oculos') {
      setWeight('0.250')
      setLength('18')
      setWidth('12')
      setHeight('6')
    } else if (preset === 'acessorio') {
      setWeight('0.100')
      setLength('15')
      setWidth('10')
      setHeight('3')
    } else if (preset === 'vestuario') {
      setWeight('0.450')
      setLength('30')
      setWidth('25')
      setHeight('8')
    }
  }

  // Inserção rápida na descrição
  const handleInsertTemplate = (templateText: string) => {
    setDescription((prev) => (prev ? `${prev}\n• ${templateText}` : `• ${templateText}`))
  }

  // Submissão do produto
  const handleSaveProduct = async () => {
    const errors: { name?: string; price?: string } = {}
    if (!name.trim()) {
      errors.name = 'Informe o nome do produto'
    }
    if (!price.trim() || priceNum <= 0) {
      errors.price = 'Informe o preço de venda'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      window.scrollTo({ top: 120, behavior: 'smooth' })
      return
    }

    setIsSaving(true)

    const finalSku = sku.trim() || `LEV-${Math.floor(1000 + Math.random() * 9000)}`

    const newProduct: NewProductData = {
      id: String(Date.now()),
      name: name.trim(),
      sku: finalSku,
      description: description.trim(),
      category,
      tags,
      price,
      priceNumeric: priceNum,
      promoPrice: promoPrice.trim(),
      promoPriceNumeric: promoNum > 0 ? promoNum : undefined,
      costPrice: costPrice.trim(),
      stock: parseInt(stock, 10) || 0,
      stockLocation: stockLocation.trim(),
      lowStockAlert: parseInt(lowStockAlert, 10) || 5,
      trackStock,
      continueSellingOutOfStock,
      weight: weight.trim(),
      length: length.trim(),
      width: width.trim(),
      height: height.trim(),
      visibility,
      freeShipping,
      freeShippingScope,
      showFreeShippingBadge,
      images,
      videos,
      createdAt: Date.now(),
    }

    try {
      // Obter id da categoria
      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', category)
        .maybeSingle()

      let categoryId = catData?.id
      if (!categoryId) {
        const { data: firstCat } = await supabase
          .from('categories')
          .select('id')
          .limit(1)
          .single()
        categoryId = firstCat?.id
      }

      const costPriceClean = costPrice
        ? parseFloat(costPrice.replace(/[^\d,]/g, '').replace(',', '.'))
        : null

      const { data: insertedProduct, error: prodErr } = await supabase
        .from('products')
        .insert({
          name: name.trim(),
          sku: finalSku,
          description: description.trim() || null,
          category_id: categoryId,
          price: priceNum,
          promo_price: promoNum > 0 ? promoNum : null,
          cost_price: costPriceClean && costPriceClean > 0 ? costPriceClean : null,
          stock: parseInt(stock, 10) || 0,
          stock_location: stockLocation.trim() || null,
          low_stock_alert: parseInt(lowStockAlert, 10) || 5,
          track_stock: trackStock,
          continue_selling_out_of_stock: continueSellingOutOfStock,
          weight: parseFloat(weight.replace(',', '.')) || 0.25,
          length: parseFloat(length.replace(',', '.')) || 18,
          width: parseFloat(width.replace(',', '.')) || 12,
          height: parseFloat(height.replace(',', '.')) || 6,
          visibility,
          free_shipping: freeShipping,
          free_shipping_scope: freeShippingScope,
          show_free_shipping_badge: showFreeShippingBadge,
        })
        .select()
        .single()

      if (prodErr) {
        console.error('Erro ao inserir produto no Supabase:', prodErr)
      }

      if (insertedProduct) {
        newProduct.id = insertedProduct.id

        // Inserir imagens associadas
        if (images.length > 0) {
          const imagesPayload = images.map((url, idx) => ({
            product_id: insertedProduct.id,
            image_url: url,
            cf_key: url.split('/').pop() || `img-${idx}`,
            is_cover: idx === 0,
            sort_order: idx,
          }))
          await supabase.from('product_images').insert(imagesPayload)
        }

        // Inserir tags associadas
        if (tags.length > 0) {
          const tagsPayload = tags.map((t) => ({
            product_id: insertedProduct.id,
            tag_name: t,
          }))
          await supabase.from('product_tags').insert(tagsPayload)
        }
      }

      onSave(newProduct)
    } catch (err) {
      console.error('Falha geral ao salvar no Supabase:', err)
      onSave(newProduct)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="product-create-page">
      {/* Barra de Ações Superior */}
      <header className="product-create-topbar">
        <div className="product-create-topbar-left">
          <button
            type="button"
            className="product-create-back-btn"
            onClick={onBack}
            title="Voltar para a lista de produtos"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Voltar aos produtos</span>
          </button>

          <div className="product-create-breadcrumbs">
            <span className="crumb-segment">Produtos</span>
            <span className="crumb-separator">/</span>
            <span className="crumb-current">Criar produto</span>
          </div>
        </div>

        <div className="product-create-topbar-right">
          <span className="product-create-status-badge">
            <span
              className={`status-dot ${
                visibility === 'visivel'
                  ? 'status-online'
                  : visibility === 'rascunho'
                  ? 'status-draft'
                  : 'status-hidden'
              }`}
            />
            {visibility === 'visivel'
              ? 'Status: Visível'
              : visibility === 'rascunho'
              ? 'Status: Rascunho'
              : 'Status: Oculto'}
          </span>

          <button
            type="button"
            className="product-create-discard-btn"
            onClick={onBack}
          >
            Descartar
          </button>

          <button
            type="button"
            className="product-create-save-btn"
            onClick={handleSaveProduct}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <svg
                  className="spin-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                Salvando produto...
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Salvar produto
              </>
            )}
          </button>
        </div>
      </header>

      {/* Conteúdo Principal em Grid */}
      <div className="product-create-container">
        <div className="product-create-grid">
          {/* Coluna Principal (Esquerda - 68%) */}
          <div className="product-create-main-col">
            {/* 1. Nome, Descrição e SKU */}
            <section className="product-form-card">
              <div className="product-card-header">
                <h2 className="product-card-title">Informações gerais</h2>
                <span className="product-card-desc">
                  Identificação principal do item na loja
                </span>
              </div>

              <div className="product-card-body">
                {/* Nome do Produto */}
                <div className="form-group-custom">
                  <label htmlFor="prod-name" className="form-label-custom">
                    Nome do produto <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="prod-name"
                    className={`form-input-custom ${formErrors.name ? 'input-error' : ''}`}
                    placeholder="Ex: Óculos de Sol LEVER Blackout Acetato UV400"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (formErrors.name) {
                        setFormErrors((prev) => ({ ...prev, name: undefined }))
                      }
                    }}
                  />
                  {formErrors.name ? (
                    <span className="form-error-msg">{formErrors.name}</span>
                  ) : (
                    <span className="form-hint-msg">
                      Título público exibido na página do produto e nos resultados de busca.
                    </span>
                  )}
                </div>

                {/* SKU e Código de Barras */}
                <div className="form-row-2col">
                  <div className="form-group-custom">
                    <div className="label-with-action">
                      <label htmlFor="prod-sku" className="form-label-custom">
                        SKU (Código de referência)
                      </label>
                      <button
                        type="button"
                        className="inline-action-link"
                        onClick={handleGenerateSku}
                      >
                        Gerar automático
                      </button>
                    </div>
                    <input
                      type="text"
                      id="prod-sku"
                      className="form-input-custom"
                      placeholder="Ex: LEV-BLK-001"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                    />
                    <span className="form-hint-msg">
                      Código único interno para estoque e logística.
                    </span>
                  </div>

                  <div className="form-group-custom">
                    <label htmlFor="prod-barcode" className="form-label-custom">
                      Código de barras / EAN (opcional)
                    </label>
                    <input
                      type="text"
                      id="prod-barcode"
                      className="form-input-custom"
                      placeholder="Ex: 7891234567890"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                    />
                    <span className="form-hint-msg">
                      Identificador numérico para leitores de código.
                    </span>
                  </div>
                </div>

                {/* Descrição com Toolbar */}
                <div className="form-group-custom">
                  <label htmlFor="prod-desc" className="form-label-custom">
                    Descrição do produto
                  </label>

                  {/* Barra de Ferramentas Simples (SEM negrito) */}
                  <div className="desc-toolbar">
                    <button
                      type="button"
                      className="desc-tool-btn"
                      title="Itálico"
                      onClick={() => setDescription((prev) => `${prev} _texto em itálico_`)}
                    >
                      <em>I</em>
                    </button>
                    <button
                      type="button"
                      className="desc-tool-btn"
                      title="Sublinhado"
                      onClick={() => setDescription((prev) => `${prev} <u>texto sublinhado</u>`)}
                    >
                      <u>U</u>
                    </button>
                    <div className="desc-toolbar-sep" />
                    <button
                      type="button"
                      className="desc-tool-btn"
                      title="Lista com marcadores"
                      onClick={() => setDescription((prev) => `${prev}\n• `)}
                    >
                      • Lista
                    </button>
                    <button
                      type="button"
                      className="desc-tool-btn"
                      title="Lista numerada"
                      onClick={() => setDescription((prev) => `${prev}\n1. `)}
                    >
                      1. Lista
                    </button>
                    <button
                      type="button"
                      className="desc-tool-btn"
                      title="Inserir divisor"
                      onClick={() => setDescription((prev) => `${prev}\n\n---\n\n`)}
                    >
                      ― Linha
                    </button>
                  </div>

                  <textarea
                    id="prod-desc"
                    className="form-textarea-custom"
                    rows={6}
                    placeholder="Descreva detalhes como material da armação, tipo de lentes, proteção UV400, acabamento, sensação de uso e diferenciais de qualidade..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />

                  {/* Modelos rápidos para preenchimento */}
                  <div className="desc-quick-chips">
                    <span className="desc-chip-label">Inserir especificação rápida:</span>
                    <button
                      type="button"
                      className="desc-quick-chip"
                      onClick={() => handleInsertTemplate('Proteção 100% contra raios UVA e UVB (UV400)')}
                    >
                      + Proteção UV400
                    </button>
                    <button
                      type="button"
                      className="desc-quick-chip"
                      onClick={() => handleInsertTemplate('Armação premium em acetato de alta densidade')}
                    >
                      + Acetato premium
                    </button>
                    <button
                      type="button"
                      className="desc-quick-chip"
                      onClick={() => handleInsertTemplate('Dobradiças reforçadas de 5 pontas em aço')}
                    >
                      + Dobradiças de aço
                    </button>
                    <button
                      type="button"
                      className="desc-quick-chip"
                      onClick={() => handleInsertTemplate('Acompanha estojo de proteção e flanela de microfibra')}
                    >
                      + Estojo & Flanela
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Fotos e Vídeos */}
            <section className="product-form-card">
              <div className="product-card-header">
                <div className="header-title-row">
                  <div>
                    <h2 className="product-card-title">Fotos e vídeos</h2>
                    <span className="product-card-desc">
                      Adicione fotos e vídeos curtos do produto para a galeria
                    </span>
                  </div>
                  <div className="header-actions">
                    <button
                      type="button"
                      className="secondary-action-btn"
                      onClick={() => setShowUrlModal(true)}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      Adicionar por link
                    </button>
                  </div>
                </div>
              </div>

              <div className="product-card-body">
                {/* Modal / Linha para adicionar por URL */}
                {showUrlModal && (
                  <div className="inline-url-adder">
                    <input
                      type="url"
                      className="form-input-custom"
                      placeholder="Cole aqui a URL direta da imagem (.jpg, .png, .webp) ou vídeo (.mp4)"
                      value={mediaUrlInput}
                      onChange={(e) => setMediaUrlInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="product-create-save-btn"
                      style={{ height: '38px', padding: '0 1rem' }}
                      onClick={handleAddMediaUrl}
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      className="product-create-discard-btn"
                      style={{ height: '38px' }}
                      onClick={() => setShowUrlModal(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Área de Dropzone de Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                />

                <div
                  className={`media-dropzone ${isUploadingMedia ? 'uploading' : ''}`}
                  onClick={() => {
                    if (!isUploadingMedia) fileInputRef.current?.click()
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (!isUploadingMedia && (e.key === 'Enter' || e.key === ' ')) {
                      fileInputRef.current?.click()
                    }
                  }}
                  style={{ opacity: isUploadingMedia ? 0.8 : 1 }}
                >
                  {isUploadingMedia ? (
                    <div style={{ padding: '1rem', textAlign: 'center' }}>
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ margin: '0 auto 0.75rem auto', display: 'block', animation: 'spin 1.2s linear infinite' }}
                      >
                        <line x1="12" y1="2" x2="12" y2="6" />
                        <line x1="12" y1="18" x2="12" y2="22" />
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                        <line x1="2" y1="12" x2="6" y2="12" />
                        <line x1="18" y1="12" x2="22" y2="12" />
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                      </svg>
                      <p className="media-dropzone-text" style={{ fontWeight: 400 }}>
                        Enviando para o Cloudflare R2... {uploadProgress !== null ? `${uploadProgress}%` : ''}
                      </p>
                      <span className="media-dropzone-sub" style={{ fontWeight: 400 }}>
                        Aguarde a gravação no bucket lever.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="media-dropzone-icon">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="0" ry="0" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <p className="media-dropzone-text">
                        Arraste e solte fotos ou vídeos aqui, ou clique para fazer upload
                      </p>
                      <span className="media-dropzone-sub">
                        Suporta arquivos PNG, JPG, WEBP e vídeos MP4 ou MOV (upload direto para Cloudflare R2)
                      </span>
                      <button
                        type="button"
                        className="media-upload-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                      >
                        Selecionar arquivos
                      </button>
                    </>
                  )}
                </div>

                {/* Galeria de Fotos Carregadas */}
                {images.length > 0 && (
                  <div className="uploaded-media-section">
                    <span className="uploaded-media-title">
                      Fotos adicionadas ({images.length})
                    </span>
                    <div className="uploaded-media-grid">
                      {images.map((imgSrc, idx) => (
                        <div key={idx} className="media-thumbnail-card">
                          <img
                            src={imgSrc}
                            alt={`Foto ${idx + 1}`}
                            className="media-thumbnail-img"
                          />
                          {idx === 0 && (
                            <span className="media-cover-badge">Capa</span>
                          )}
                          <div className="media-thumbnail-actions">
                            {idx !== 0 && (
                              <button
                                type="button"
                                className="media-action-pill"
                                title="Tornar imagem principal / capa"
                                onClick={() => handleSetPrimaryImage(idx)}
                              >
                                Tornar capa
                              </button>
                            )}
                            <button
                              type="button"
                              className="media-action-delete"
                              title="Remover foto"
                              onClick={() => handleRemoveImage(idx)}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Galeria de Vídeos Carregados */}
                {videos.length > 0 && (
                  <div className="uploaded-media-section">
                    <span className="uploaded-media-title">
                      Vídeos adicionados ({videos.length})
                    </span>
                    <div className="uploaded-media-grid">
                      {videos.map((vidSrc, idx) => (
                        <div key={idx} className="media-thumbnail-card video-card">
                          <video
                            src={vidSrc}
                            className="media-thumbnail-img"
                            controls
                            muted
                          />
                          <span className="media-video-badge">Vídeo</span>
                          <button
                            type="button"
                            className="media-action-delete"
                            title="Remover vídeo"
                            onClick={() => handleRemoveVideo(idx)}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {images.length === 0 && videos.length === 0 && (
                  <div className="media-empty-note">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                      Ainda não há fotos ou vídeos enviados. O produto exibirá a ilustração padrão da marca até o upload.
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* 3. Preço e Preço promocional */}
            <section className="product-form-card">
              <div className="product-card-header">
                <h2 className="product-card-title">Preço e precificação</h2>
                <span className="product-card-desc">
                  Defina o valor base e eventuais descontos promocionais
                </span>
              </div>

              <div className="product-card-body">
                <div className="form-row-2col">
                  {/* Preço de venda original */}
                  <div className="form-group-custom">
                    <label htmlFor="prod-price" className="form-label-custom">
                      Preço original (de) <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      id="prod-price"
                      className={`form-input-custom ${formErrors.price ? 'input-error' : ''}`}
                      placeholder="R$ 0,00"
                      value={price}
                      onChange={handlePriceChange}
                    />
                    {formErrors.price ? (
                      <span className="form-error-msg">{formErrors.price}</span>
                    ) : (
                      <span className="form-hint-msg">
                        Valor normal de tabela do produto.
                      </span>
                    )}
                  </div>

                  {/* Preço promocional */}
                  <div className="form-group-custom">
                    <label htmlFor="prod-promo-price" className="form-label-custom">
                      Preço promocional (por)
                    </label>
                    <input
                      type="text"
                      id="prod-promo-price"
                      className="form-input-custom"
                      placeholder="R$ 0,00"
                      value={promoPrice}
                      onChange={handlePromoPriceChange}
                    />
                    <span className="form-hint-msg">
                      Se preenchido, o preço original aparecerá riscado.
                    </span>
                  </div>
                </div>

                {/* Indicador de Desconto */}
                {hasDiscount && (
                  <div className="pricing-discount-banner">
                    <div className="pricing-discount-badge">
                      {discountPercent}% OFF
                    </div>
                    <div className="pricing-discount-info">
                      <span>
                        Desconto ativo de{' '}
                        {discountDiff.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}{' '}
                        para o cliente.
                      </span>
                      <span className="pricing-installment-hint">
                        Parcelamento sugerido: em até 6x de{' '}
                        {(promoNum / 6).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}{' '}
                        sem juros.
                      </span>
                    </div>
                  </div>
                )}

                {/* Custo da mercadoria & Margem (opcional) */}
                <div className="cost-margin-container">
                  <div className="form-row-2col">
                    <div className="form-group-custom">
                      <label htmlFor="prod-cost" className="form-label-custom">
                        Custo da mercadoria (opcional)
                      </label>
                      <input
                        type="text"
                        id="prod-cost"
                        className="form-input-custom"
                        placeholder="R$ 0,00"
                        value={costPrice}
                        onChange={handleCostPriceChange}
                      />
                      <span className="form-hint-msg">
                        Visível apenas para a sua gestão interna.
                      </span>
                    </div>

                    <div className="form-group-custom">
                      <label className="form-label-custom">
                        Margem estimada de lucro
                      </label>
                      <div className="margin-result-box">
                        {costNum > 0 && effectiveSellingPrice > 0 ? (
                          <div>
                            <span className="margin-value">
                              {estimatedProfit.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}{' '}
                              ({profitMarginPercent}% de margem)
                            </span>
                          </div>
                        ) : (
                          <span className="margin-empty">
                            Preencha o preço e custo para calcular
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Dimensões de envio */}
            <section className="product-form-card">
              <div className="product-card-header">
                <div className="header-title-row">
                  <div>
                    <h2 className="product-card-title">Dimensões de envio</h2>
                    <span className="product-card-desc">
                      Medidas utilizadas para o cálculo de frete nos Correios e transportadoras
                    </span>
                  </div>
                  <div className="dimension-presets">
                    <span className="presets-label">Padrões:</span>
                    <button
                      type="button"
                      className="preset-btn"
                      onClick={() => applyDimensionPreset('oculos')}
                    >
                      Óculos LEVER
                    </button>
                    <button
                      type="button"
                      className="preset-btn"
                      onClick={() => applyDimensionPreset('acessorio')}
                    >
                      Acessório
                    </button>
                    <button
                      type="button"
                      className="preset-btn"
                      onClick={() => applyDimensionPreset('vestuario')}
                    >
                      Vestuário
                    </button>
                  </div>
                </div>
              </div>

              <div className="product-card-body">
                <div className="dimensions-grid">
                  {/* Peso */}
                  <div className="form-group-custom">
                    <label htmlFor="dim-weight" className="form-label-custom">
                      Peso (kg)
                    </label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        step="0.01"
                        id="dim-weight"
                        className="form-input-custom"
                        placeholder="0.250"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                      <span className="input-suffix">kg</span>
                    </div>
                    <span className="form-hint-msg">Ex: 0.250 kg = 250g</span>
                  </div>

                  {/* Comprimento */}
                  <div className="form-group-custom">
                    <label htmlFor="dim-length" className="form-label-custom">
                      Comprimento
                    </label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        id="dim-length"
                        className="form-input-custom"
                        placeholder="18"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                      />
                      <span className="input-suffix">cm</span>
                    </div>
                    <span className="form-hint-msg">Frente da embalagem</span>
                  </div>

                  {/* Largura */}
                  <div className="form-group-custom">
                    <label htmlFor="dim-width" className="form-label-custom">
                      Largura
                    </label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        id="dim-width"
                        className="form-input-custom"
                        placeholder="12"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                      />
                      <span className="input-suffix">cm</span>
                    </div>
                    <span className="form-hint-msg">Profundidade</span>
                  </div>

                  {/* Altura */}
                  <div className="form-group-custom">
                    <label htmlFor="dim-height" className="form-label-custom">
                      Altura
                    </label>
                    <div className="input-with-suffix">
                      <input
                        type="number"
                        id="dim-height"
                        className="form-input-custom"
                        placeholder="6"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                      />
                      <span className="input-suffix">cm</span>
                    </div>
                    <span className="form-hint-msg">Espessura vertical</span>
                  </div>
                </div>

                <div className="shipping-box-summary">
                  <div className="shipping-box-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="21 8 21 21 3 21 3 8" />
                      <rect x="1" y="3" width="22" height="5" />
                      <line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                  </div>
                  <div className="shipping-box-details">
                    <span>
                      Embalagem para cotação: {length} cm x {width} cm x {height} cm • Peso {weight} kg
                    </span>
                    <span className="shipping-box-sub">
                      Volume cúbico: {packageVolume.toLocaleString('pt-BR')} cm³
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Estoque */}
            <section className="product-form-card">
              <div className="product-card-header">
                <h2 className="product-card-title">Estoque e inventário</h2>
                <span className="product-card-desc">
                  Controle de unidades disponíveis para venda imediata
                </span>
              </div>

              <div className="product-card-body">
                <div className="form-row-2col">
                  {/* Quantidade em estoque */}
                  <div className="form-group-custom">
                    <label htmlFor="prod-stock" className="form-label-custom">
                      Quantidade disponível em estoque
                    </label>
                    <input
                      type="number"
                      id="prod-stock"
                      min="0"
                      className="form-input-custom"
                      placeholder="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                    <span className="form-hint-msg">
                      Número de peças físicas prontas para envio.
                    </span>
                  </div>

                  {/* Alerta de estoque baixo */}
                  <div className="form-group-custom">
                    <label htmlFor="prod-low-stock" className="form-label-custom">
                      Alerta de estoque baixo
                    </label>
                    <input
                      type="number"
                      id="prod-low-stock"
                      min="1"
                      className="form-input-custom"
                      placeholder="5"
                      value={lowStockAlert}
                      onChange={(e) => setLowStockAlert(e.target.value)}
                    />
                    <span className="form-hint-msg">
                      Notificar quando o estoque atingir este limite.
                    </span>
                  </div>
                </div>

                <div className="form-group-custom">
                  <label htmlFor="prod-location" className="form-label-custom">
                    Localização no estoque / Armazém
                  </label>
                  <input
                    type="text"
                    id="prod-location"
                    className="form-input-custom"
                    placeholder="Ex: Prateleira B, Caixa 04"
                    value={stockLocation}
                    onChange={(e) => setStockLocation(e.target.value)}
                  />
                  <span className="form-hint-msg">
                    Ajuda sua equipe a encontrar a peça na expedição.
                  </span>
                </div>

                <div className="toggles-list">
                  <label className="custom-toggle-label">
                    <input
                      type="checkbox"
                      checked={trackStock}
                      onChange={(e) => setTrackStock(e.target.checked)}
                      className="custom-toggle-checkbox"
                    />
                    <div className="custom-toggle-content">
                      <span className="toggle-title">
                        Controlar estoque automaticamente
                      </span>
                      <span className="toggle-subtitle">
                        Diminui 1 unidade do estoque a cada pedido pago e bloqueia compras ao zerar.
                      </span>
                    </div>
                  </label>

                  <label className="custom-toggle-label">
                    <input
                      type="checkbox"
                      checked={continueSellingOutOfStock}
                      onChange={(e) => setContinueSellingOutOfStock(e.target.checked)}
                      className="custom-toggle-checkbox"
                    />
                    <div className="custom-toggle-content">
                      <span className="toggle-title">
                        Continuar vendendo quando esgotado
                      </span>
                      <span className="toggle-subtitle">
                        Permite que clientes comprem sob encomenda mesmo se a quantidade for 0.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </section>
          </div>

          {/* Coluna Lateral (Direita - 32%) */}
          <div className="product-create-side-col">
            {/* 6. Visibilidade */}
            <section className="product-side-card">
              <div className="product-side-card-header">
                <h3 className="product-side-title">Visibilidade</h3>
                <span className="product-side-desc">
                  Disponibilidade na loja online
                </span>
              </div>

              <div className="visibility-options">
                {/* Opção 1: Visível */}
                <label
                  className={`visibility-radio-card ${
                    visibility === 'visivel' ? 'selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="prod-visibility"
                    value="visivel"
                    checked={visibility === 'visivel'}
                    onChange={() => setVisibility('visivel')}
                    className="radio-input-hidden"
                  />
                  <div className="visibility-card-left">
                    <span className="visibility-indicator-dot online" />
                  </div>
                  <div className="visibility-card-info">
                    <span className="visibility-name">Visível na loja</span>
                    <span className="visibility-explanation">
                      Disponível imediatamente para pesquisa e compra.
                    </span>
                  </div>
                </label>

                {/* Opção 2: Oculto */}
                <label
                  className={`visibility-radio-card ${
                    visibility === 'oculto' ? 'selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="prod-visibility"
                    value="oculto"
                    checked={visibility === 'oculto'}
                    onChange={() => setVisibility('oculto')}
                    className="radio-input-hidden"
                  />
                  <div className="visibility-card-left">
                    <span className="visibility-indicator-dot hidden" />
                  </div>
                  <div className="visibility-card-info">
                    <span className="visibility-name">Oculto</span>
                    <span className="visibility-explanation">
                      Não aparece no catálogo; acessível apenas por link direto.
                    </span>
                  </div>
                </label>

                {/* Opção 3: Rascunho */}
                <label
                  className={`visibility-radio-card ${
                    visibility === 'rascunho' ? 'selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="prod-visibility"
                    value="rascunho"
                    checked={visibility === 'rascunho'}
                    onChange={() => setVisibility('rascunho')}
                    className="radio-input-hidden"
                  />
                  <div className="visibility-card-left">
                    <span className="visibility-indicator-dot draft" />
                  </div>
                  <div className="visibility-card-info">
                    <span className="visibility-name">Rascunho</span>
                    <span className="visibility-explanation">
                      Salvo apenas no painel administrativo para edições futuras.
                    </span>
                  </div>
                </label>
              </div>
            </section>

            {/* 7. Oferecer Frete Grátis */}
            <section className="product-side-card">
              <div className="product-side-card-header">
                <h3 className="product-side-title">Oferecer frete grátis</h3>
                <span className="product-side-desc">
                  Condições especiais de entrega para este item
                </span>
              </div>

              <div className="shipping-offer-container">
                <label className="custom-toggle-label">
                  <input
                    type="checkbox"
                    checked={freeShipping}
                    onChange={(e) => setFreeShipping(e.target.checked)}
                    className="custom-toggle-checkbox"
                  />
                  <div className="custom-toggle-content">
                    <span className="toggle-title">
                      Ativar frete grátis para este produto
                    </span>
                    <span className="toggle-subtitle">
                      O frete será calculado como R$ 0,00 no carrinho e no checkout.
                    </span>
                  </div>
                </label>

                {freeShipping && (
                  <div className="free-shipping-suboptions">
                    <div className="form-group-custom">
                      <label className="form-label-custom">
                        Região de abrangência
                      </label>
                      <select
                        className="form-select-custom"
                        value={freeShippingScope}
                        onChange={(e) =>
                          setFreeShippingScope(e.target.value as 'brasil' | 'regional')
                        }
                      >
                        <option value="brasil">Todo o Brasil</option>
                        <option value="regional">Apenas Sul e Sudeste</option>
                      </select>
                    </div>

                    <label className="custom-toggle-label">
                      <input
                        type="checkbox"
                        checked={showFreeShippingBadge}
                        onChange={(e) => setShowFreeShippingBadge(e.target.checked)}
                        className="custom-toggle-checkbox"
                      />
                      <div className="custom-toggle-content">
                        <span className="toggle-title">
                          Exibir selo "FRETE GRÁTIS" na foto do produto
                        </span>
                        <span className="toggle-subtitle">
                          Aumenta a conversão visual na listagem da loja.
                        </span>
                      </div>
                    </label>

                    <div className="free-shipping-preview-tag">
                      <span className="badge-frete-gratis">
                        FRETE GRÁTIS PARA TODO O BRASIL
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 8. Categoria e Tags */}
            <section className="product-side-card">
              <div className="product-side-card-header">
                <h3 className="product-side-title">Categoria e tags</h3>
                <span className="product-side-desc">
                  Organização para filtros e navegação
                </span>
              </div>

              <div className="product-side-card-body">
                {/* Seleção de Categoria: puramente por seleção, sem digitação */}
                <div className="form-group-custom">
                  <label htmlFor="prod-cat" className="form-label-custom">
                    Categoria principal <span className="required-star">*</span>
                  </label>

                  <select
                    id="prod-cat"
                    className="form-select-custom"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <span className="form-hint-msg">
                    A categoria é selecionada exclusivamente pela lista.
                  </span>
                </div>

                {/* Seleção rápida em botões */}
                <div className="category-quick-chips-group">
                  <span className="category-chips-label">Categorias cadastradas:</span>
                  <div className="category-chips-list">
                    {categoriesList.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`category-chip-btn ${category === cat ? 'active' : ''}`}
                        onClick={() => setCategory(cat)}
                      >
                        {category === cat && <span>✓ </span>}
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botão Criar Categoria */}
                <button
                  type="button"
                  className="category-create-trigger-btn"
                  onClick={() => {
                    setNewCategoryName('')
                    setCategoryModalError('')
                    setIsCategoryModalOpen(true)
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Criar categoria
                </button>

                {/* Tags do Produto */}
                <div className="form-group-custom">
                  <label htmlFor="prod-tag" className="form-label-custom">
                    Tags do produto
                  </label>
                  <div className="tag-input-wrapper">
                    <input
                      type="text"
                      id="prod-tag"
                      className="form-input-custom"
                      placeholder="Adicione uma tag e aperte Enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="tag-add-btn"
                      onClick={handleAddTag}
                    >
                      Adicionar
                    </button>
                  </div>

                  <div className="tags-container">
                    {tags.map((t) => (
                      <span key={t} className="product-tag-chip">
                        #{t}
                        <button
                          type="button"
                          className="tag-remove-x"
                          onClick={() => handleRemoveTag(t)}
                          title="Remover tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Prévia do Card na Loja */}
            <section className="product-side-card">
              <div className="product-side-card-header">
                <h3 className="product-side-title">Prévia na loja</h3>
                <span className="product-side-desc">
                  Como o cliente verá no catálogo
                </span>
              </div>

              <div className="store-card-preview">
                <div className="store-card-preview-img-box">
                  {images[0] ? (
                    <img
                      src={images[0]}
                      alt="Prévia do produto"
                      className="store-card-preview-img"
                    />
                  ) : (
                    <div className="store-card-placeholder">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: '#9ca3af' }}
                      >
                        <circle cx="6" cy="6" r="3" />
                        <circle cx="18" cy="6" r="3" />
                        <line x1="9" y1="6" x2="15" y2="6" />
                        <line x1="3" y1="6" x2="1" y2="10" />
                        <line x1="21" y1="6" x2="23" y2="10" />
                      </svg>
                      <span>Sem imagem cadastrada</span>
                    </div>
                  )}

                  {freeShipping && showFreeShippingBadge && (
                    <span className="preview-floating-badge">
                      FRETE GRÁTIS
                    </span>
                  )}

                  {hasDiscount && (
                    <span className="preview-discount-tag">
                      -{discountPercent}%
                    </span>
                  )}
                </div>

                <div className="store-card-preview-info">
                  <span className="preview-category">
                    {category}
                  </span>
                  <span className="preview-name">
                    {name.trim() || 'Nome do Produto LEVER'}
                  </span>
                  <div className="preview-pricing-row">
                    {hasDiscount ? (
                      <>
                        <span className="preview-old-price">{price}</span>
                        <span className="preview-current-price">{promoPrice}</span>
                      </>
                    ) : (
                      <span className="preview-current-price">
                        {price || 'R$ 0,00'}
                      </span>
                    )}
                  </div>
                  <span className="preview-installments">
                    em até 6x de{' '}
                    {(effectiveSellingPrice / 6 || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}{' '}
                    sem juros
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      {/* Modal Criar Categoria */}
      {isCategoryModalOpen && (
        <div
          className="category-modal-overlay"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="category-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="category-modal-header">
              <div>
                <h3 className="category-modal-title">Criar categoria</h3>
                <span className="category-modal-subtitle">
                  Cadastre uma nova categoria para organizar seus produtos na loja
                </span>
              </div>
              <button
                type="button"
                className="category-modal-close"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="category-modal-body">
              <div className="form-group-custom">
                <label htmlFor="new-cat-name" className="form-label-custom">
                  Nome da nova categoria <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  id="new-cat-name"
                  className={`form-input-custom ${categoryModalError ? 'input-error' : ''}`}
                  placeholder="Ex: Joias, Relógios, Calçados..."
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value)
                    if (categoryModalError) setCategoryModalError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const trimmed = newCategoryName.trim()
                      if (!trimmed) {
                        setCategoryModalError('Informe o nome da categoria.')
                        return
                      }
                      if (categoriesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
                        setCategoryModalError('Esta categoria já existe na lista.')
                        return
                      }
                      setCategoriesList((prev) => [...prev, trimmed])
                      setCategory(trimmed)
                      setIsCategoryModalOpen(false)
                      setNewCategoryName('')
                      setCategoryModalError('')
                    }
                  }}
                  autoFocus
                />
                {categoryModalError && (
                  <span className="form-error-msg">{categoryModalError}</span>
                )}
              </div>
            </div>

            <div className="category-modal-footer">
              <button
                type="button"
                className="product-create-discard-btn"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="product-create-save-btn"
                onClick={() => {
                  const trimmed = newCategoryName.trim()
                  if (!trimmed) {
                    setCategoryModalError('Informe o nome da categoria.')
                    return
                  }
                  if (categoriesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
                    setCategoryModalError('Esta categoria já existe na lista.')
                    return
                  }
                  setCategoriesList((prev) => [...prev, trimmed])
                  setCategory(trimmed)
                  setIsCategoryModalOpen(false)
                  setNewCategoryName('')
                  setCategoryModalError('')
                }}
              >
                Criar categoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
