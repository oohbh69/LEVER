import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface CouponItem {
  id: string
  code: string
  description?: string
  discountType: 'percentage' | 'fixed' | 'free_shipping'
  discountValue: number
  minOrderValue?: string
  usageLimit?: number
  usedCount: number
  oncePerCustomer: boolean
  hasExpiration: boolean
  startDate?: string
  endDate?: string
  status: 'ativo' | 'inativo'
  createdAt: number
}

const initialCoupons: CouponItem[] = []

interface CriarCupomPageProps {
  onBack?: () => void
}

export function CriarCupomPage({ onBack }: CriarCupomPageProps) {
  const [coupons, setCoupons] = useState<CouponItem[]>(initialCoupons)
  const [isLoading, setIsLoading] = useState(true)
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null)

  // Formulário de Criação
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'free_shipping'>('percentage')
  const [discountValue, setDiscountValue] = useState('10')
  const [minOrderValue, setMinOrderValue] = useState('')
  const [hasUsageLimit, setHasUsageLimit] = useState(false)
  const [usageLimit, setUsageLimit] = useState('100')
  const [oncePerCustomer, setOncePerCustomer] = useState(true)
  const [hasExpiration, setHasExpiration] = useState(false)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')

  // Feedback e Validações
  const [errors, setErrors] = useState<{ code?: string; value?: string }>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current))
    }, 3000)
  }

  // Carregar cupons do Supabase
  const loadCoupons = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar cupons do Supabase:', error)
        const cached = localStorage.getItem('lever_custom_coupons')
        if (cached) {
          try {
            setCoupons(JSON.parse(cached))
          } catch (_) {}
        }
      } else if (data) {
        const formatted: CouponItem[] = data.map((row: any) => ({
          id: row.id,
          code: row.code,
          description: row.description || undefined,
          discountType: row.discount_type,
          discountValue: Number(row.discount_value) || 0,
          minOrderValue: row.min_order_value
            ? `R$ ${Number(row.min_order_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : undefined,
          usageLimit: row.usage_limit || undefined,
          usedCount: Number(row.used_count) || 0,
          oncePerCustomer: Boolean(row.once_per_customer),
          hasExpiration: Boolean(row.has_expiration),
          startDate: row.start_date ? row.start_date.slice(0, 10) : undefined,
          endDate: row.end_date ? row.end_date.slice(0, 10) : undefined,
          status: row.status,
          createdAt: new Date(row.created_at).getTime(),
        }))
        setCoupons(formatted)
        try {
          localStorage.setItem('lever_custom_coupons', JSON.stringify(formatted))
        } catch (_) {}
      }
    } catch (err) {
      console.error('Erro ao conectar ao Supabase para cupons:', err)
      const cached = localStorage.getItem('lever_custom_coupons')
      if (cached) {
        try {
          setCoupons(JSON.parse(cached))
        } catch (_) {}
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  // Gerador de código aleatório
  const handleGenerateCode = () => {
    const prefixes = ['LEVER', 'PROMO', 'OFF', 'VIP', 'FLASH']
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const randomNum = Math.floor(10 + Math.random() * 90)
    setCode(`${randomPrefix}${randomNum}`)
    if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }))
  }

  // Formatação de Moeda
  const parseCurrencyInput = (val: string) => {
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

  // Iniciar e cancelar edição
  const handleEditCoupon = (c: CouponItem) => {
    setEditingCouponId(c.id)
    setCode(c.code)
    setDescription(c.description || '')
    setDiscountType(c.discountType)
    setDiscountValue(String(c.discountValue))
    setMinOrderValue(c.minOrderValue || '')
    setHasUsageLimit(Boolean(c.usageLimit))
    setUsageLimit(c.usageLimit ? String(c.usageLimit) : '100')
    setOncePerCustomer(c.oncePerCustomer)
    setHasExpiration(c.hasExpiration)
    setStartDate(c.startDate || new Date().toISOString().slice(0, 10))
    setEndDate(c.endDate || '')
    setStatus(c.status)
    setErrors({})
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingCouponId(null)
    setCode('')
    setDescription('')
    setDiscountType('percentage')
    setDiscountValue('10')
    setMinOrderValue('')
    setHasUsageLimit(false)
    setUsageLimit('100')
    setOncePerCustomer(true)
    setHasExpiration(false)
    setStartDate(new Date().toISOString().slice(0, 10))
    setEndDate('')
    setStatus('ativo')
    setErrors({})
  }

  // Ações da lista: Excluir cupom
  const handleDeleteCoupon = async (id: string) => {
    const coupon = coupons.find((c) => c.id === id)
    if (!coupon) return

    if (!window.confirm(`Tem certeza que deseja excluir o cupom "${coupon.code}"?`)) {
      return
    }

    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id)
      if (error) {
        showToast(`Erro ao excluir cupom: ${error.message}`)
        return
      }

      const updated = coupons.filter((c) => c.id !== id)
      setCoupons(updated)
      try {
        localStorage.setItem('lever_custom_coupons', JSON.stringify(updated))
      } catch (_) {}

      showToast(`Cupom "${coupon.code}" excluído com sucesso.`)
      if (editingCouponId === id) {
        handleCancelEdit()
      }
    } catch (err: any) {
      showToast(`Erro ao excluir: ${err.message || 'Falha na conexão'}`)
    }
  }

  // Ações da lista: Ativar / Pausar
  const handleToggleStatus = async (id: string) => {
    const coupon = coupons.find((c) => c.id === id)
    if (!coupon) return
    const nextStatus = coupon.status === 'ativo' ? 'inativo' : 'ativo'

    // Otimista
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    )

    try {
      const { error } = await supabase
        .from('coupons')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        // Reverter
        setCoupons((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: coupon.status } : c))
        )
        showToast(`Erro ao alterar status: ${error.message}`)
      } else {
        const updated = coupons.map((c) =>
          c.id === id ? { ...c, status: nextStatus } : c
        )
        try {
          localStorage.setItem('lever_custom_coupons', JSON.stringify(updated))
        } catch (_) {}
        showToast(`Cupom "${coupon.code}" ${nextStatus === 'ativo' ? 'ativado' : 'pausado'} com sucesso.`)
      }
    } catch (err: any) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: coupon.status } : c))
      )
      showToast(`Erro: ${err.message || 'Falha de conexão'}`)
    }
  }

  const handleCopyCode = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode)
    showToast(`Código "${couponCode}" copiado para a área de transferência!`)
  }

  // Salvar novo cupom ou atualizar existente
  const handleSaveCoupon = async () => {
    const validationErrors: { code?: string; value?: string } = {}
    const cleanCode = code.trim().toUpperCase()

    if (!cleanCode) {
      validationErrors.code = 'Informe o código do cupom'
    } else if (
      coupons.some((c) => c.code.toUpperCase() === cleanCode && c.id !== editingCouponId)
    ) {
      validationErrors.code = 'Este código de cupom já existe'
    }

    const numValue = parseFloat(discountValue) || 0
    if (discountType !== 'free_shipping' && numValue <= 0) {
      validationErrors.value = 'Informe um valor de desconto válido'
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      window.scrollTo({ top: 120, behavior: 'smooth' })
      return
    }

    setIsSaving(true)
    const parsedMinOrder = minOrderValue.trim() ? parseToNumber(minOrderValue) : null
    const parsedUsageLimit = hasUsageLimit ? parseInt(usageLimit, 10) || null : null

    try {
      if (editingCouponId) {
        // Atualizar cupom existente no Supabase
        const { error: updateErr } = await supabase
          .from('coupons')
          .update({
            code: cleanCode,
            description: description.trim() || null,
            discount_type: discountType,
            discount_value: discountType === 'free_shipping' ? 0 : numValue,
            min_order_value: parsedMinOrder,
            usage_limit: parsedUsageLimit,
            once_per_customer: oncePerCustomer,
            has_expiration: hasExpiration,
            start_date: hasExpiration && startDate ? new Date(startDate).toISOString() : null,
            end_date: hasExpiration && endDate ? new Date(endDate + 'T23:59:59').toISOString() : null,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCouponId)

        if (updateErr) throw updateErr

        showToast(`Cupom "${cleanCode}" atualizado com sucesso!`)
        setEditingCouponId(null)
      } else {
        // Inserir novo cupom no Supabase
        const { error: insertErr } = await supabase
          .from('coupons')
          .insert({
            code: cleanCode,
            description: description.trim() || null,
            discount_type: discountType,
            discount_value: discountType === 'free_shipping' ? 0 : numValue,
            min_order_value: parsedMinOrder,
            usage_limit: parsedUsageLimit,
            used_count: 0,
            once_per_customer: oncePerCustomer,
            has_expiration: hasExpiration,
            start_date: hasExpiration && startDate ? new Date(startDate).toISOString() : null,
            end_date: hasExpiration && endDate ? new Date(endDate + 'T23:59:59').toISOString() : null,
            status,
          })

        if (insertErr) throw insertErr

        showToast(`Cupom "${cleanCode}" criado com sucesso!`)
      }

      // Recarregar dados atualizados do banco
      await loadCoupons()

      // Resetar form
      setCode('')
      setDescription('')
      setDiscountType('percentage')
      setDiscountValue('10')
      setMinOrderValue('')
      setHasUsageLimit(false)
      setHasExpiration(false)
      setStatus('ativo')
      setErrors({})
    } catch (err: any) {
      console.error('Erro ao salvar cupom no Supabase:', err)
      showToast(`Erro ao salvar cupom: ${err.message || 'Verifique a conexão.'}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Simulação de Desconto no Checkout Preview
  const sampleCartSubtotal = 259.9
  const numVal = parseFloat(discountValue) || 0
  let calculatedDiscount = 0
  if (discountType === 'percentage') {
    calculatedDiscount = (sampleCartSubtotal * numVal) / 100
  } else if (discountType === 'fixed') {
    calculatedDiscount = numVal
  }

  return (
    <div className="coupon-page-container">
      {/* Topbar Superior */}
      <header className="product-create-topbar">
        <div className="product-create-topbar-left">
          {onBack && (
            <button
              type="button"
              className="product-create-back-btn"
              onClick={onBack}
              title="Voltar"
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
              <span>Voltar</span>
            </button>
          )}

          <div className="product-create-breadcrumbs">
            <span className="crumb-segment">Marketing</span>
            <span className="crumb-separator">/</span>
            <span className="crumb-current">Cupons de desconto</span>
          </div>
        </div>

        <div className="product-create-topbar-right">
          {editingCouponId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                color: '#4b5563',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Cancelar edição
            </button>
          )}

          <button
            type="button"
            className="product-create-save-btn"
            onClick={handleSaveCoupon}
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
                {editingCouponId ? 'Salvando alterações...' : 'Salvando cupom...'}
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
                {editingCouponId ? 'Salvar alterações' : 'Salvar cupom'}
              </>
            )}
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="product-create-container">
        <div className="product-create-grid">
          {/* Coluna Principal do Formulário (Esquerda) */}
          <div className="product-create-main-col">
            {/* 1. Código e Identificação */}
            <section className="product-form-card">
              <div className="product-card-header">
                <div className="header-title-row">
                  <div>
                    <h2 className="product-card-title">{editingCouponId ? 'Editar cupom' : 'Criar cupom'}</h2>
                    <span className="product-card-desc">
                      {editingCouponId
                        ? 'Atualize os dados e regras deste cupom'
                        : 'Defina o código de desconto que o cliente digitará no checkout'}
                    </span>
                  </div>
                  <span className="product-create-status-badge">
                    <span className="status-dot status-online" />
                    {editingCouponId ? 'Editando' : 'Novo cupom'}
                  </span>
                </div>
              </div>

              <div className="product-card-body">
                <div className="form-group-custom">
                  <div className="label-with-action">
                    <label htmlFor="coupon-code" className="form-label-custom">
                      Código do cupom <span className="required-star">*</span>
                    </label>
                    <button
                      type="button"
                      className="inline-action-link"
                      onClick={handleGenerateCode}
                    >
                      Gerar código aleatório
                    </button>
                  </div>
                  <input
                    type="text"
                    id="coupon-code"
                    className={`form-input-custom ${errors.code ? 'input-error' : ''}`}
                    placeholder="Ex: PRIMEIRACOMPRA, LEVER10, BLACK20..."
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase())
                      if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }))
                    }}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  />
                  {errors.code ? (
                    <span className="form-error-msg">{errors.code}</span>
                  ) : (
                    <span className="form-hint-msg">
                      Os clientes aplicarão este código no carrinho ou no checkout.
                    </span>
                  )}
                </div>

                <div className="form-group-custom">
                  <label htmlFor="coupon-desc" className="form-label-custom">
                    Descrição interna (opcional)
                  </label>
                  <input
                    type="text"
                    id="coupon-desc"
                    className="form-input-custom"
                    placeholder="Ex: Campanha de influenciadores de Outubro, Parceria VIP..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <span className="form-hint-msg">
                    Anotação visível apenas para você e sua equipe de gestão.
                  </span>
                </div>
              </div>
            </section>

            {/* 2. Tipo e Valor do Desconto */}
            <section className="product-form-card">
              <div className="product-card-header">
                <h2 className="product-card-title">Tipo e valor do desconto</h2>
                <span className="product-card-desc">
                  Escolha como a redução de preço será calculada
                </span>
              </div>

              <div className="product-card-body">
                {/* 3 Cartões de Tipo de Desconto */}
                <div className="discount-type-grid">
                  <label
                    className={`discount-type-card ${
                      discountType === 'percentage' ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="discount-type"
                      value="percentage"
                      checked={discountType === 'percentage'}
                      onChange={() => setDiscountType('percentage')}
                      className="radio-input-hidden"
                    />
                    <div className="discount-card-header">
                      <span className="discount-card-symbol">%</span>
                      <span className="discount-card-title">Porcentagem</span>
                    </div>
                    <span className="discount-card-sub">
                      Aplica um percentual de desconto sobre os produtos.
                    </span>
                  </label>

                  <label
                    className={`discount-type-card ${
                      discountType === 'fixed' ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="discount-type"
                      value="fixed"
                      checked={discountType === 'fixed'}
                      onChange={() => setDiscountType('fixed')}
                      className="radio-input-hidden"
                    />
                    <div className="discount-card-header">
                      <span className="discount-card-symbol">R$</span>
                      <span className="discount-card-title">Valor fixo</span>
                    </div>
                    <span className="discount-card-sub">
                      Deduz uma quantia fixa em reais no valor final.
                    </span>
                  </label>

                  <label
                    className={`discount-type-card ${
                      discountType === 'free_shipping' ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="discount-type"
                      value="free_shipping"
                      checked={discountType === 'free_shipping'}
                      onChange={() => setDiscountType('free_shipping')}
                      className="radio-input-hidden"
                    />
                    <div className="discount-card-header">
                      <span className="discount-card-symbol">📦</span>
                      <span className="discount-card-title">Frete grátis</span>
                    </div>
                    <span className="discount-card-sub">
                      Isenta o custo de envio do pedido do cliente.
                    </span>
                  </label>
                </div>

                {/* Campos de Valor e Pedido Mínimo */}
                <div className="form-row-2col">
                  {discountType !== 'free_shipping' && (
                    <div className="form-group-custom">
                      <label htmlFor="discount-val" className="form-label-custom">
                        {discountType === 'percentage'
                          ? 'Porcentagem de desconto (%)'
                          : 'Valor do desconto (R$)'}{' '}
                        <span className="required-star">*</span>
                      </label>
                      <div className="input-with-suffix">
                        <input
                          type="number"
                          id="discount-val"
                          min="1"
                          max={discountType === 'percentage' ? 100 : undefined}
                          className={`form-input-custom ${errors.value ? 'input-error' : ''}`}
                          placeholder={discountType === 'percentage' ? '10' : '25'}
                          value={discountValue}
                          onChange={(e) => {
                            setDiscountValue(e.target.value)
                            if (errors.value) setErrors((prev) => ({ ...prev, value: undefined }))
                          }}
                        />
                        <span className="input-suffix">
                          {discountType === 'percentage' ? '%' : 'R$'}
                        </span>
                      </div>
                      {errors.value && <span className="form-error-msg">{errors.value}</span>}
                    </div>
                  )}

                  <div className="form-group-custom">
                    <label htmlFor="min-order" className="form-label-custom">
                      Valor mínimo do pedido (opcional)
                    </label>
                    <input
                      type="text"
                      id="min-order"
                      className="form-input-custom"
                      placeholder="Ex: R$ 150,00"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(parseCurrencyInput(e.target.value))}
                    />
                    <span className="form-hint-msg">
                      Deixe em branco para permitir qualquer valor de compra.
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Limites e Regras de Uso */}
            <section className="product-form-card">
              <div className="product-card-header">
                <h2 className="product-card-title">Regras e restrições de uso</h2>
                <span className="product-card-desc">
                  Controle a quantidade de utilizações e o período de validade
                </span>
              </div>

              <div className="product-card-body">
                <div className="toggles-list">
                  {/* Limitar a 1 uso por cliente */}
                  <label className="custom-toggle-label">
                    <input
                      type="checkbox"
                      checked={oncePerCustomer}
                      onChange={(e) => setOncePerCustomer(e.target.checked)}
                      className="custom-toggle-checkbox"
                    />
                    <div className="custom-toggle-content">
                      <span className="toggle-title">
                        Limitar a 1 uso por cliente / CPF
                      </span>
                      <span className="toggle-subtitle">
                        Impede que o mesmo comprador use o cupom em múltiplos pedidos.
                      </span>
                    </div>
                  </label>

                  {/* Limite total de utilizações */}
                  <label className="custom-toggle-label">
                    <input
                      type="checkbox"
                      checked={hasUsageLimit}
                      onChange={(e) => setHasUsageLimit(e.target.checked)}
                      className="custom-toggle-checkbox"
                    />
                    <div className="custom-toggle-content">
                      <span className="toggle-title">
                        Limitar número total de utilizações
                      </span>
                      <span className="toggle-subtitle">
                        O cupom expira automaticamente quando a quantidade limite for atingida.
                      </span>
                    </div>
                  </label>

                  {hasUsageLimit && (
                    <div className="toggle-subfield-indent">
                      <input
                        type="number"
                        min="1"
                        className="form-input-custom"
                        placeholder="Ex: 100"
                        value={usageLimit}
                        onChange={(e) => setUsageLimit(e.target.value)}
                      />
                      <span className="form-hint-msg">Total máximo de pedidos com este cupom</span>
                    </div>
                  )}

                  {/* Data de expiração */}
                  <label className="custom-toggle-label">
                    <input
                      type="checkbox"
                      checked={hasExpiration}
                      onChange={(e) => setHasExpiration(e.target.checked)}
                      className="custom-toggle-checkbox"
                    />
                    <div className="custom-toggle-content">
                      <span className="toggle-title">
                        Definir período de validade do cupom
                      </span>
                      <span className="toggle-subtitle">
                        O cupom só funcionará entre as datas programadas.
                      </span>
                    </div>
                  </label>

                  {hasExpiration && (
                    <div className="form-row-2col toggle-subfield-row">
                      <div className="form-group-custom">
                        <label className="form-label-custom">Data de início</label>
                        <input
                          type="date"
                          className="form-input-custom"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group-custom">
                        <label className="form-label-custom">Data de término</label>
                        <input
                          type="date"
                          className="form-input-custom"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 4. Tabela de Cupons Cadastrados */}
            <section className="product-form-card">
              <div className="product-card-header">
                <div className="header-title-row">
                  <div>
                    <h2 className="product-card-title">Cupons cadastrados na loja</h2>
                    <span className="product-card-desc">
                      Lista de todos os códigos promocionais ativos e pausados
                    </span>
                  </div>
                  <span className="dashboard-filter-count">
                    {coupons.length} {coupons.length === 1 ? 'cupom' : 'cupons'}
                  </span>
                </div>
              </div>

              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Desconto</th>
                      <th>Utilizações</th>
                      <th>Validade</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: '#6b7280',
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              fontSize: '0.85rem',
                            }}
                          >
                            <svg
                              className="spin-icon"
                              width="16"
                              height="16"
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
                            Carregando cupons...
                          </div>
                        </td>
                      </tr>
                    ) : coupons.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: '#6b7280',
                          }}
                        >
                          Nenhum cupom de desconto cadastrado.
                        </td>
                      </tr>
                    ) : (
                      coupons.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span
                                style={{
                                  color: '#111111',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {c.code}
                              </span>
                              <button
                                type="button"
                                title="Copiar código"
                                onClick={() => handleCopyCode(c.code)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#9ca3af',
                                  cursor: 'pointer',
                                  padding: '0.2rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect x="9" y="9" width="13" height="13" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              </button>
                            </div>
                            {c.description && (
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: '#6b7280',
                                  marginTop: '0.15rem',
                                }}
                              >
                                {c.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ color: '#111111' }}>
                              {c.discountType === 'percentage' && `${c.discountValue}% OFF`}
                              {c.discountType === 'fixed' && `R$ ${c.discountValue.toFixed(2).replace('.', ',')}`}
                              {c.discountType === 'free_shipping' && 'Frete Grátis'}
                            </span>
                            {c.minOrderValue && (
                              <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                                Mín. {c.minOrderValue}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>
                              {c.usedCount}
                              {c.usageLimit ? ` / ${c.usageLimit}` : ' usos'}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>
                              {c.hasExpiration && c.endDate
                                ? `Até ${c.endDate.split('-').reverse().join('/')}`
                                : 'Sem expiração'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`order-badge ${
                                c.status === 'ativo' ? 'paid' : 'pending'
                              }`}
                            >
                              {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              <button
                                type="button"
                                className="order-action-btn"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem' }}
                                onClick={() => handleEditCoupon(c)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="order-action-btn"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem' }}
                                onClick={() => handleToggleStatus(c.id)}
                              >
                                {c.status === 'ativo' ? 'Pausar' : 'Ativar'}
                              </button>
                              <button
                                type="button"
                                className="order-action-btn"
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.74rem',
                                  color: '#ef4444',
                                  borderColor: '#fca5a5',
                                }}
                                onClick={() => handleDeleteCoupon(c.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Coluna Lateral de Status e Prévia (Direita) */}
          <div className="product-create-side-col">
            {/* Status do Cupom */}
            <section className="product-side-card">
              <div className="product-side-card-header">
                <h3 className="product-side-title">Status do cupom</h3>
                <span className="product-side-desc">
                  Ativação imediata para compradores
                </span>
              </div>

              <div className="visibility-options">
                <label
                  className={`visibility-radio-card ${status === 'ativo' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="coupon-status"
                    value="ativo"
                    checked={status === 'ativo'}
                    onChange={() => setStatus('ativo')}
                    className="radio-input-hidden"
                  />
                  <div className="visibility-card-left">
                    <span className="visibility-indicator-dot online" />
                  </div>
                  <div className="visibility-card-info">
                    <span className="visibility-name">Ativo na loja</span>
                    <span className="visibility-explanation">
                      Pode ser inserido e validado no carrinho e checkout.
                    </span>
                  </div>
                </label>

                <label
                  className={`visibility-radio-card ${status === 'inativo' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="coupon-status"
                    value="inativo"
                    checked={status === 'inativo'}
                    onChange={() => setStatus('inativo')}
                    className="radio-input-hidden"
                  />
                  <div className="visibility-card-left">
                    <span className="visibility-indicator-dot hidden" />
                  </div>
                  <div className="visibility-card-info">
                    <span className="visibility-name">Pausado / Inativo</span>
                    <span className="visibility-explanation">
                      Salvo no painel, mas não concede desconto aos clientes.
                    </span>
                  </div>
                </label>
              </div>
            </section>

            {/* Prévia no Checkout */}
            <section className="product-side-card">
              <div className="product-side-card-header">
                <h3 className="product-side-title">Prévia no checkout</h3>
                <span className="product-side-desc">
                  Como o desconto aparece para o cliente
                </span>
              </div>

              <div className="coupon-checkout-preview-card">
                <div className="coupon-preview-ticket">
                  <div className="coupon-ticket-badge">
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
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    <span>{code.trim() || 'SEUCUPOM'}</span>
                  </div>
                  <span className="coupon-ticket-desc">
                    {discountType === 'percentage' && `${numVal}% de desconto aplicado`}
                    {discountType === 'fixed' && `R$ ${numVal.toFixed(2).replace('.', ',')} de desconto`}
                    {discountType === 'free_shipping' && 'Frete grátis aplicado'}
                  </span>
                </div>

                <div className="coupon-calculation-box">
                  <div className="coupon-calc-row">
                    <span>Subtotal simulado (1x Óculos)</span>
                    <span>R$ 259,90</span>
                  </div>
                  <div className="coupon-calc-row discount-row">
                    <span>Cupom ({code.trim() || 'SEUCUPOM'})</span>
                    <span>
                      {discountType === 'free_shipping'
                        ? '- Frete Grátis'
                        : `- ${calculatedDiscount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}`}
                    </span>
                  </div>
                  <div className="coupon-calc-row total-row">
                    <span>Total estimado</span>
                    <span>
                      {discountType === 'free_shipping'
                        ? 'R$ 259,90'
                        : (sampleCartSubtotal - calculatedDiscount).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                    </span>
                  </div>
                </div>

                <div className="checkout-preview-tip">
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
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>
                    O cliente insere o código no campo de cupom antes de finalizar o pagamento.
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="order-toast-notification">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
