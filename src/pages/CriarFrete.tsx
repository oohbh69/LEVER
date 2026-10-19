import { useState, type ChangeEvent } from 'react'

export interface CustomShippingRate {
  id: string
  name: string
  price: string
  priceNumeric: number
  isFree: boolean
  deliveryTime: string
  selectedStates: string[]
  minOrderValue?: string
  status: 'ativo' | 'inativo'
  createdAt: number
}

interface StateInfo {
  uf: string
  name: string
  region: 'Sudeste' | 'Sul' | 'Centro-Oeste' | 'Nordeste' | 'Norte'
}

export const BRAZIL_STATES: StateInfo[] = [
  // Sudeste
  { uf: 'SP', name: 'São Paulo', region: 'Sudeste' },
  { uf: 'RJ', name: 'Rio de Janeiro', region: 'Sudeste' },
  { uf: 'MG', name: 'Minas Gerais', region: 'Sudeste' },
  { uf: 'ES', name: 'Espírito Santo', region: 'Sudeste' },
  // Sul
  { uf: 'PR', name: 'Paraná', region: 'Sul' },
  { uf: 'SC', name: 'Santa Catarina', region: 'Sul' },
  { uf: 'RS', name: 'Rio Grande do Sul', region: 'Sul' },
  // Centro-Oeste
  { uf: 'DF', name: 'Distrito Federal', region: 'Centro-Oeste' },
  { uf: 'GO', name: 'Goiás', region: 'Centro-Oeste' },
  { uf: 'MT', name: 'Mato Grosso', region: 'Centro-Oeste' },
  { uf: 'MS', name: 'Mato Grosso do Sul', region: 'Centro-Oeste' },
  // Nordeste
  { uf: 'BA', name: 'Bahia', region: 'Nordeste' },
  { uf: 'PE', name: 'Pernambuco', region: 'Nordeste' },
  { uf: 'CE', name: 'Ceará', region: 'Nordeste' },
  { uf: 'MA', name: 'Maranhão', region: 'Nordeste' },
  { uf: 'PB', name: 'Paraíba', region: 'Nordeste' },
  { uf: 'RN', name: 'Rio Grande do Norte', region: 'Nordeste' },
  { uf: 'AL', name: 'Alagoas', region: 'Nordeste' },
  { uf: 'PI', name: 'Piauí', region: 'Nordeste' },
  { uf: 'SE', name: 'Sergipe', region: 'Nordeste' },
  // Norte
  { uf: 'AM', name: 'Amazonas', region: 'Norte' },
  { uf: 'PA', name: 'Pará', region: 'Norte' },
  { uf: 'RO', name: 'Rondônia', region: 'Norte' },
  { uf: 'TO', name: 'Tocantins', region: 'Norte' },
  { uf: 'AC', name: 'Acre', region: 'Norte' },
  { uf: 'AP', name: 'Amapá', region: 'Norte' },
  { uf: 'RR', name: 'Roraima', region: 'Norte' },
]

const initialShippingRates: CustomShippingRate[] = []

interface CriarFretePageProps {
  onBack?: () => void
}

export function CriarFretePage({ onBack }: CriarFretePageProps) {
  const [shippingRates, setShippingRates] = useState<CustomShippingRate[]>(initialShippingRates)

  // Formulário de Criar Frete Personalizado
  const [shippingName, setShippingName] = useState('')
  const [price, setPrice] = useState('R$ 15,00')
  const [isFree, setIsFree] = useState(false)
  const [deliveryTime, setDeliveryTime] = useState('2 a 5 dias úteis')
  const [selectedStates, setSelectedStates] = useState<string[]>(['SP', 'RJ', 'MG', 'ES'])
  const [minOrderValue, setMinOrderValue] = useState('')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')

  // Feedback e erros
  const [errors, setErrors] = useState<{ name?: string; price?: string; states?: string }>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current))
    }, 3000)
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

  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = parseCurrencyInput(e.target.value)
    setPrice(formatted)
    setIsFree(false)
    if (errors.price) {
      setErrors((prev) => ({ ...prev, price: undefined }))
    }
  }

  const handleToggleFree = (checked: boolean) => {
    setIsFree(checked)
    if (checked) {
      setPrice('R$ 0,00')
      if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }))
    } else {
      setPrice('R$ 15,00')
    }
  }

  // Seleção de Estados
  const toggleState = (uf: string) => {
    setSelectedStates((prev) => {
      const next = prev.includes(uf) ? prev.filter((s) => s !== uf) : [...prev, uf]
      if (errors.states && next.length > 0) {
        setErrors((errs) => ({ ...errs, states: undefined }))
      }
      return next
    })
  }

  const selectAllStates = () => {
    setSelectedStates(BRAZIL_STATES.map((s) => s.uf))
    if (errors.states) setErrors((errs) => ({ ...errs, states: undefined }))
  }

  const clearAllStates = () => {
    setSelectedStates([])
  }

  const selectRegion = (regionName: 'Sudeste' | 'Sul' | 'Centro-Oeste' | 'Nordeste' | 'Norte') => {
    const regionUfs = BRAZIL_STATES.filter((s) => s.region === regionName).map((s) => s.uf)
    setSelectedStates((prev) => {
      const unique = Array.from(new Set([...prev, ...regionUfs]))
      if (errors.states && unique.length > 0) {
        setErrors((errs) => ({ ...errs, states: undefined }))
      }
      return unique
    })
  }

  // Ações da lista
  const handleDeleteRate = (id: string) => {
    const rate = shippingRates.find((r) => r.id === id)
    setShippingRates((prev) => prev.filter((r) => r.id !== id))
    showToast(`Modalidade "${rate?.name || ''}" removida com sucesso.`)
  }

  const handleToggleStatus = (id: string) => {
    let nowActive = false
    setShippingRates((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          nowActive = r.status !== 'ativo'
          return { ...r, status: nowActive ? 'ativo' : 'inativo' }
        }
        return r
      })
    )
    showToast(`Modalidade ${nowActive ? 'ativada' : 'desativada'} na loja.`)
  }

  // Salvar novo frete
  const handleSaveRate = () => {
    const validationErrors: { name?: string; price?: string; states?: string } = {}
    if (!shippingName.trim()) {
      validationErrors.name = 'Informe o nome do frete'
    }
    if (!isFree && (!price.trim() || parseToNumber(price) < 0)) {
      validationErrors.price = 'Informe o valor do frete'
    }
    if (selectedStates.length === 0) {
      validationErrors.states = 'Selecione pelo menos um estado (UF) para atender'
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      window.scrollTo({ top: 120, behavior: 'smooth' })
      return
    }

    setIsSaving(true)

    const newRate: CustomShippingRate = {
      id: String(Date.now()),
      name: shippingName.trim(),
      price: isFree ? 'R$ 0,00' : price.trim(),
      priceNumeric: isFree ? 0 : parseToNumber(price),
      isFree,
      deliveryTime: deliveryTime.trim() || '2 a 5 dias úteis',
      selectedStates: [...selectedStates],
      minOrderValue: minOrderValue.trim() || undefined,
      status,
      createdAt: Date.now(),
    }

    setTimeout(() => {
      setShippingRates((prev) => [newRate, ...prev])
      showToast(`Frete personalizado "${newRate.name}" criado com sucesso!`)
      setIsSaving(false)
      // Resetar form
      setShippingName('')
      setPrice('R$ 15,00')
      setIsFree(false)
      setSelectedStates(['SP', 'RJ', 'MG', 'ES'])
      setMinOrderValue('')
      setErrors({})
    }, 300)
  }

  return (
    <div className="shipping-page-container">
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
            <span className="crumb-segment">Logística</span>
            <span className="crumb-separator">/</span>
            <span className="crumb-current">Frete personalizado</span>
          </div>
        </div>

        <div className="product-create-topbar-right">
          <button
            type="button"
            className="product-create-save-btn"
            onClick={handleSaveRate}
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
                Salvando frete...
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
                Salvar frete personalizado
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
            {/* 1. Criar Frete Personalizado */}
            <section className="product-form-card">
              <div className="product-card-header">
                <div className="header-title-row">
                  <div>
                    <h2 className="product-card-title">Criar frete personalizado</h2>
                    <span className="product-card-desc">
                      Configure modalidades próprias com valor fixo e regras por estado
                    </span>
                  </div>
                  <span className="product-create-status-badge">
                    <span className="status-dot status-online" />
                    Regra ativa
                  </span>
                </div>
              </div>

              <div className="product-card-body">
                {/* Nome do Frete e Valor */}
                <div className="form-row-2col">
                  {/* Nome do Frete */}
                  <div className="form-group-custom">
                    <label htmlFor="shipping-name" className="form-label-custom">
                      Nome do frete <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      id="shipping-name"
                      className={`form-input-custom ${errors.name ? 'input-error' : ''}`}
                      placeholder="Ex: Entrega Expressa LEVER, Frete Fixo SP..."
                      value={shippingName}
                      onChange={(e) => {
                        setShippingName(e.target.value)
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                      }}
                    />
                    {errors.name ? (
                      <span className="form-error-msg">{errors.name}</span>
                    ) : (
                      <span className="form-hint-msg">
                        Nome visível para o cliente no carrinho e checkout.
                      </span>
                    )}
                  </div>

                  {/* Valor do Frete */}
                  <div className="form-group-custom">
                    <div className="label-with-action">
                      <label htmlFor="shipping-price" className="form-label-custom">
                        Valor do frete <span className="required-star">*</span>
                      </label>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.76rem',
                          color: '#4b5563',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isFree}
                          onChange={(e) => handleToggleFree(e.target.checked)}
                          style={{ accentColor: '#000000', cursor: 'pointer' }}
                        />
                        <span>Frete grátis</span>
                      </label>
                    </div>

                    <input
                      type="text"
                      id="shipping-price"
                      className={`form-input-custom ${errors.price ? 'input-error' : ''}`}
                      placeholder="R$ 0,00"
                      value={isFree ? 'R$ 0,00 (Grátis)' : price}
                      disabled={isFree}
                      onChange={handlePriceChange}
                    />
                    {errors.price ? (
                      <span className="form-error-msg">{errors.price}</span>
                    ) : (
                      <span className="form-hint-msg">
                        {isFree
                          ? 'Esta modalidade será calculada como gratuita.'
                          : 'Custo cobrado do comprador no momento do pedido.'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Prazo de Entrega e Valor Mínimo */}
                <div className="form-row-2col">
                  <div className="form-group-custom">
                    <label htmlFor="shipping-time" className="form-label-custom">
                      Prazo estimado de entrega
                    </label>
                    <input
                      type="text"
                      id="shipping-time"
                      className="form-input-custom"
                      placeholder="Ex: 1 a 3 dias úteis, Mesmo dia..."
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                    />
                    <span className="form-hint-msg">
                      Estimativa comunicada ao cliente.
                    </span>
                  </div>

                  <div className="form-group-custom">
                    <label htmlFor="shipping-min-order" className="form-label-custom">
                      Grátis a partir de (opcional)
                    </label>
                    <input
                      type="text"
                      id="shipping-min-order"
                      className="form-input-custom"
                      placeholder="Ex: R$ 199,90"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(parseCurrencyInput(e.target.value))}
                    />
                    <span className="form-hint-msg">
                      Se o pedido atingir este valor, o frete zera automaticamente.
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Selecionar Estado */}
            <section className="product-form-card">
              <div className="product-card-header">
                <div className="header-title-row">
                  <div>
                    <h2 className="product-card-title">Selecionar estado</h2>
                    <span className="product-card-desc">
                      Escolha os estados brasileiros (UF) atendidos por esta taxa de frete
                    </span>
                  </div>

                  <div className="shipping-state-count">
                    <span>
                      {selectedStates.length} de {BRAZIL_STATES.length} estados selecionados
                    </span>
                  </div>
                </div>
              </div>

              <div className="product-card-body">
                {/* Botões de Ação Rápida por Região */}
                <div className="shipping-region-shortcuts">
                  <span className="shortcuts-label">Atalhos rápidos:</span>
                  <button
                    type="button"
                    className="shipping-shortcut-btn"
                    onClick={selectAllStates}
                  >
                    Todo o Brasil (27)
                  </button>
                  <button
                    type="button"
                    className="shipping-shortcut-btn"
                    onClick={() => selectRegion('Sudeste')}
                  >
                    Sudeste (SP, RJ, MG, ES)
                  </button>
                  <button
                    type="button"
                    className="shipping-shortcut-btn"
                    onClick={() => selectRegion('Sul')}
                  >
                    Sul (PR, SC, RS)
                  </button>
                  <button
                    type="button"
                    className="shipping-shortcut-btn"
                    onClick={() => selectRegion('Centro-Oeste')}
                  >
                    Centro-Oeste
                  </button>
                  <button
                    type="button"
                    className="shipping-shortcut-btn"
                    onClick={() => selectRegion('Nordeste')}
                  >
                    Nordeste
                  </button>
                  <button
                    type="button"
                    className="shipping-shortcut-btn"
                    onClick={() => selectRegion('Norte')}
                  >
                    Norte
                  </button>
                  <button
                    type="button"
                    className="shipping-shortcut-btn danger"
                    onClick={clearAllStates}
                  >
                    Limpar
                  </button>
                </div>

                {errors.states && (
                  <div className="form-error-banner">
                    {errors.states}
                  </div>
                )}

                {/* Grade de Estados (UFs) */}
                <div className="states-selection-grid">
                  {BRAZIL_STATES.map((st) => {
                    const isSelected = selectedStates.includes(st.uf)
                    return (
                      <label
                        key={st.uf}
                        className={`state-checkbox-card ${isSelected ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="state-native-checkbox"
                          checked={isSelected}
                          onChange={() => toggleState(st.uf)}
                        />
                        <div className="state-card-content">
                          <span className="state-uf-badge">{st.uf}</span>
                          <span className="state-full-name">{st.name}</span>
                          <span className="state-region-name">{st.region}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* 3. Tabela de Fretes Já Criados */}
            <section className="product-form-card">
              <div className="product-card-header">
                <div className="header-title-row">
                  <div>
                    <h2 className="product-card-title">Fretes cadastrados na loja</h2>
                    <span className="product-card-desc">
                      Todas as regras personalizadas ativas no checkout
                    </span>
                  </div>
                  <span className="dashboard-filter-count">
                    {shippingRates.length}{' '}
                    {shippingRates.length === 1 ? 'modalidade' : 'modalidades'}
                  </span>
                </div>
              </div>

              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Nome do frete</th>
                      <th>Valor</th>
                      <th>Prazo</th>
                      <th>Estados atendidos</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippingRates.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: '#6b7280',
                          }}
                        >
                          Nenhuma regra de frete personalizado cadastrada.
                        </td>
                      </tr>
                    ) : (
                      shippingRates.map((rate) => (
                        <tr key={rate.id}>
                          <td>
                            <span style={{ color: '#111111' }}>{rate.name}</span>
                            {rate.minOrderValue && (
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: '#15803d',
                                  marginTop: '0.15rem',
                                }}
                              >
                                Grátis acima de {rate.minOrderValue}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ color: rate.isFree ? '#15803d' : '#111111' }}>
                              {rate.isFree ? 'Grátis' : rate.price}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>
                              {rate.deliveryTime}
                            </span>
                          </td>
                          <td>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.25rem',
                                maxWidth: '240px',
                              }}
                            >
                              {rate.selectedStates.length === BRAZIL_STATES.length ? (
                                <span className="product-tag-chip">Todo o Brasil (27)</span>
                              ) : (
                                rate.selectedStates.map((uf) => (
                                  <span
                                    key={uf}
                                    className="product-tag-chip"
                                    style={{ padding: '0.15rem 0.35rem', fontSize: '0.68rem' }}
                                  >
                                    {uf}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`order-badge ${
                                rate.status === 'ativo' ? 'paid' : 'pending'
                              }`}
                            >
                              {rate.status === 'ativo' ? 'Ativo' : 'Inativo'}
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
                                onClick={() => handleToggleStatus(rate.id)}
                              >
                                {rate.status === 'ativo' ? 'Pausar' : 'Ativar'}
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
                                onClick={() => handleDeleteRate(rate.id)}
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

          {/* Coluna Lateral de Prévia e Configurações (Direita) */}
          <div className="product-create-side-col">
            {/* Status da Modalidade */}
            <section className="product-side-card">
              <div className="product-side-card-header">
                <h3 className="product-side-title">Status da modalidade</h3>
                <span className="product-side-desc">
                  Disponibilidade para cotação na loja
                </span>
              </div>

              <div className="visibility-options">
                <label
                  className={`visibility-radio-card ${status === 'ativo' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="shipping-status"
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
                      Exibido no checkout para os compradores dos estados selecionados.
                    </span>
                  </div>
                </label>

                <label
                  className={`visibility-radio-card ${status === 'inativo' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="shipping-status"
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
                      Fica salvo nas configurações, mas não aparece aos clientes.
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
                  Como o comprador verá ao calcular o frete
                </span>
              </div>

              <div className="shipping-checkout-preview-card">
                <div className="shipping-checkout-option active">
                  <div className="checkout-radio-indicator">
                    <div className="checkout-radio-dot" />
                  </div>
                  <div className="checkout-option-info">
                    <span className="checkout-option-name">
                      {shippingName.trim() || 'Nome do Frete Personalizado'}
                    </span>
                    <span className="checkout-option-time">
                      Previsão de entrega: {deliveryTime || '2 a 5 dias úteis'}
                    </span>
                    <div className="checkout-option-states">
                      <span>Atende: </span>
                      {selectedStates.length === BRAZIL_STATES.length
                        ? 'Todo o Brasil'
                        : selectedStates.length === 0
                        ? 'Nenhum estado selecionado'
                        : `${selectedStates.slice(0, 5).join(', ')}${
                            selectedStates.length > 5
                              ? ` +${selectedStates.length - 5} estados`
                              : ''
                          }`}
                    </div>
                  </div>
                  <div className="checkout-option-price">
                    {isFree ? 'Grátis' : price || 'R$ 0,00'}
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
                    O cliente só verá esta opção se o CEP de entrega for de um dos estados selecionados.
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Toast de notificação */}
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
