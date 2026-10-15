import { useState, useEffect } from 'react'
import { useCart, formatBRL } from '../context/CartContext'

interface CheckoutPageProps {
  onBackToStore?: () => void
}

type CheckoutStep = 'identificacao' | 'endereco' | 'pagamento'

interface IdentificacaoData {
  nomeCompleto: string
  cpf: string
  email: string
  telefone: string
}

interface EnderecoData {
  cep: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  freteTipo: 'standard' | 'express'
}

interface PagamentoData {
  metodo: 'pix' | 'cartao'
  cartaoNumero: string
  cartaoNome: string
  cartaoValidade: string
  cartaoCvv: string
  cartaoParcelas: number
}

export function CheckoutPage({ onBackToStore }: CheckoutPageProps) {
  const { items, subtotal, hasFreeShipping, clearCart } = useCart()

  // Etapa atual (Pílulas: identificacao -> endereco -> pagamento)
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('identificacao')

  // Formulário: 1. Identificação
  const [identificacao, setIdentificacao] = useState<IdentificacaoData>({
    nomeCompleto: '',
    cpf: '',
    email: '',
    telefone: '',
  })

  // Formulário: 2. Endereço de entrega
  const [endereco, setEndereco] = useState<EnderecoData>({
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    freteTipo: 'standard',
  })

  // Formulário: 3. Pagamento
  const [pagamento, setPagamento] = useState<PagamentoData>({
    metodo: 'pix',
    cartaoNumero: '',
    cartaoNome: '',
    cartaoValidade: '',
    cartaoCvv: '',
    cartaoParcelas: 1,
  })

  // Estados de controle e feedback
  const [isSearchingCep, setIsSearchingCep] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isOrderFinished, setIsOrderFinished] = useState(false)
  const [generatedOrderNumber, setGeneratedOrderNumber] = useState('')
  const [copiedPix, setCopiedPix] = useState(false)

  // Rolagem suave para o topo ao trocar de etapa
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep, isOrderFinished])

  // Máscaras de formatação
  const formatCPF = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  const formatTelefone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const formatCEP = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 5) return digits
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }

  const formatCartaoNumero = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatValidade = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  // Busca de CEP real via ViaCEP (automática ao digitar ou manual)
  const handleBuscarCep = async (overrideCep?: string) => {
    const rawVal = overrideCep !== undefined ? overrideCep : endereco.cep
    const cleanCep = rawVal.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      if (!overrideCep) {
        setCepError('Informe um CEP válido com 8 dígitos para consultar.')
      }
      return
    }

    setCepError(null)
    setIsSearchingCep(true)

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await res.json()

      if (data.erro) {
        setCepError('CEP não encontrado. Por favor, preencha o endereço manualmente.')
      } else {
        setEndereco((prev) => ({
          ...prev,
          rua: data.logradouro || prev.rua,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          uf: data.uf || prev.uf,
        }))
        setCepError(null)
        // Foca automaticamente no campo Número após o preenchimento automático
        setTimeout(() => {
          document.getElementById('input-numero')?.focus()
        }, 150)
      }
    } catch {
      setCepError('Não foi possível consultar o CEP automaticamente. Preencha os campos abaixo.')
    } finally {
      setIsSearchingCep(false)
    }
  }

  // Cálculo de Frete e Total
  const freteValor = hasFreeShipping
    ? 0
    : endereco.freteTipo === 'express'
    ? 24.9
    : 14.9
  const totalComFrete = subtotal + freteValor

  // Validação de Etapa 1: Identificação
  const handleAvancarParaEndereco = (e: React.FormEvent) => {
    e.preventDefault()
    if (!identificacao.nomeCompleto.trim()) {
      setValidationError('Por favor, informe seu nome completo.')
      return
    }
    const cleanCpf = identificacao.cpf.replace(/\D/g, '')
    if (cleanCpf.length !== 11) {
      setValidationError('Por favor, digite um CPF válido com 11 dígitos.')
      return
    }
    if (!identificacao.email.trim()) {
      setValidationError('Por favor, informe seu e-mail para rastreio.')
      return
    }
    if (!identificacao.email.includes('@') || !identificacao.email.includes('.')) {
      setValidationError('Por favor, informe um endereço de e-mail válido.')
      return
    }
    const cleanTelefone = identificacao.telefone.replace(/\D/g, '')
    if (cleanTelefone.length < 10) {
      setValidationError('Por favor, informe seu WhatsApp / celular completo com DDD.')
      return
    }
    setValidationError(null)
    setCurrentStep('endereco')
  }

  // Validação de Etapa 2: Endereço de Entrega
  const handleAvancarParaPagamento = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCep = endereco.cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      setValidationError('Informe um CEP válido com 8 dígitos.')
      return
    }
    if (!endereco.rua.trim()) {
      setValidationError('Informe o nome da rua ou logradouro.')
      return
    }
    if (!endereco.numero.trim()) {
      setValidationError('Informe o número do endereço.')
      return
    }
    if (!endereco.bairro.trim()) {
      setValidationError('Informe o bairro.')
      return
    }
    if (!endereco.cidade.trim()) {
      setValidationError('Informe a cidade.')
      return
    }
    const cleanUf = endereco.uf.trim()
    if (cleanUf.length !== 2) {
      setValidationError('Informe a sigla do estado (UF) com 2 letras.')
      return
    }
    setValidationError(null)
    setCurrentStep('pagamento')
  }

  // Conclusão do Pedido
  const handleFinalizarCompra = (e: React.FormEvent) => {
    e.preventDefault()

    if (pagamento.metodo === 'cartao') {
      const cleanCartao = pagamento.cartaoNumero.replace(/\s/g, '')
      if (cleanCartao.length < 15) {
        setValidationError('Informe um número de cartão de crédito válido.')
        return
      }
      if (!pagamento.cartaoNome.trim()) {
        setValidationError('Informe o nome como impresso no cartão.')
        return
      }
      if (pagamento.cartaoValidade.length < 5) {
        setValidationError('Informe a validade do cartão (MM/AA).')
        return
      }
      if (pagamento.cartaoCvv.length < 3) {
        setValidationError('Informe o código de segurança (CVV).')
        return
      }
    }

    setValidationError(null)
    const randomOrder = `#LVR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    setGeneratedOrderNumber(randomOrder)
    setIsOrderFinished(true)
    clearCart()
  }

  // Se o pedido foi concluído com sucesso
  if (isOrderFinished) {
    return (
      <div className="checkout-page-container">
        <div className="checkout-success-wrapper">
          <div className="success-badge-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <h1 className="success-order-title">PEDIDO CONFIRMADO COM SUCESSO!</h1>
          <p className="success-order-number">
            Número do Pedido: <strong>{generatedOrderNumber}</strong>
          </p>
          <p className="success-order-desc">
            Obrigado por comprar com a <strong>LEVER</strong>, {identificacao.nomeCompleto.split(' ')[0]}.
            Enviamos os detalhes do seu pedido e o código de rastreamento para o seu e-mail{' '}
            <strong>{identificacao.email || 'cadastrado'}</strong>.
          </p>

          {/* Dados de Entrega Confirmados */}
          <div className="success-summary-box">
            <h3 className="summary-box-title">Endereço de Entrega</h3>
            <p className="summary-box-text">
              {endereco.rua}, {endereco.numero}
              {endereco.complemento ? ` - ${endereco.complemento}` : ''}
            </p>
            <p className="summary-box-text">
              {endereco.bairro} — {endereco.cidade}/{endereco.uf} • CEP: {endereco.cep}
            </p>
            <p className="summary-box-shipping">
              Modalidade: <strong>{endereco.freteTipo === 'express' ? 'Sedex Expresso Prioritário' : 'Envio Standard Econômico'}</strong>
            </p>
          </div>

          {/* Se foi Pix, mostra o QR Code e chave Pix */}
          {pagamento.metodo === 'pix' && (
            <div className="success-pix-container">
              <span className="pix-box-title">PAGAMENTO VIA PIX (APROVAÇÃO INSTANTÂNEA)</span>
              <p className="pix-box-desc">
                Copie o código abaixo e cole no aplicativo do seu banco na opção <strong>Pix Copia e Cola</strong>.
              </p>
              <div className="pix-code-display">
                00020126580014br.gov.bcb.pix0136leverglasses-checkout-demo-20265204000053039865405802BR5913LEVER_GLASSES6009SAO_PAULO62070503***6304
              </div>
              <button
                type="button"
                className="pix-copy-action-btn"
                onClick={() => {
                  setCopiedPix(true)
                  setTimeout(() => setCopiedPix(false), 2200)
                }}
              >
                {copiedPix ? '✓ CÓDIGO PIX COPIADO!' : 'COPIAR CÓDIGO PIX'}
              </button>
            </div>
          )}

          <button
            type="button"
            className="checkout-return-btn"
            onClick={() => {
              if (onBackToStore) onBackToStore()
              else window.location.hash = ''
            }}
          >
            VOLTAR PARA A LOJA
          </button>
        </div>
      </div>
    )
  }

  // Se o carrinho estiver vazio antes de finalizar
  if (items.length === 0) {
    return (
      <div className="checkout-page-container">
        <div className="checkout-empty-box">
          <div className="empty-cart-circle">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h2 className="empty-title">SEU CARRINHO ESTÁ VAZIO</h2>
          <p className="empty-desc">
            Adicione itens da nossa coleção para prosseguir com o checkout seguro da LEVER.
          </p>
          <button
            type="button"
            className="checkout-return-btn"
            onClick={() => {
              if (onBackToStore) onBackToStore()
              else window.location.hash = ''
            }}
          >
            VER COLEÇÃO DE ÓCULOS
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page-container">
      {/* Cabeçalho do Checkout */}
      <header className="checkout-header-bar">
        <div className="checkout-header-inner">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              if (onBackToStore) onBackToStore()
              else window.location.hash = ''
            }}
            className="checkout-brand-link"
          >
            <img src="/lever-logo-cropped.png" alt="LEVER" className="checkout-brand-logo" />
          </a>

          <div className="checkout-header-security">
            <svg
              width="15"
              height="15"
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
            <span>Ambiente 100% Criptografado & Seguro</span>
          </div>
        </div>
      </header>

      {/* Grid Principal do Checkout: Formulário à Esquerda, Resumo à Direita */}
      <main className="checkout-main-grid">
        <div className="checkout-form-column">
          {validationError && (
            <div className="checkout-error-banner" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{validationError}</span>
            </div>
          )}

          {/* ==============================================================
              ETAPA 1: IDENTIFICAÇÃO
              ============================================================== */}
          {currentStep === 'identificacao' && (
            <section className="checkout-step-section" aria-labelledby="step-1-heading">
              <div className="step-section-header">
                <span className="step-counter-text">Etapa 1 de 3</span>
                <h2 id="step-1-heading" className="step-title">
                  Identificação
                </h2>
                <p className="step-subtitle">
                  Utilizamos seus dados cadastrais para emissão da nota fiscal e garantia dos produtos.
                </p>
              </div>

              <form onSubmit={handleAvancarParaEndereco} className="checkout-step-form">
                <div className="form-field-group">
                  <label htmlFor="input-nome-completo" className="checkout-form-label">
                    Nome completo <span className="req">*</span>
                  </label>
                  <input
                    id="input-nome-completo"
                    type="text"
                    required
                    autoComplete="name"
                    autoCapitalize="words"
                    className="checkout-text-input"
                    placeholder="Ex: Amanda Silva Santos"
                    value={identificacao.nomeCompleto}
                    onChange={(e) =>
                      setIdentificacao((prev) => ({ ...prev, nomeCompleto: e.target.value }))
                    }
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="input-cpf" className="checkout-form-label">
                    CPF <span className="req">*</span>
                  </label>
                  <input
                    id="input-cpf"
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={14}
                    className="checkout-text-input"
                    placeholder="000.000.000-00"
                    value={identificacao.cpf}
                    onChange={(e) =>
                      setIdentificacao((prev) => ({ ...prev, cpf: formatCPF(e.target.value) }))
                    }
                  />
                </div>

                <div className="form-fields-grid-2">
                  <div className="form-field-group">
                    <label htmlFor="input-email" className="checkout-form-label">
                      E-mail para rastreio <span className="req">*</span>
                    </label>
                    <input
                      id="input-email"
                      type="email"
                      required
                      inputMode="email"
                      autoComplete="email"
                      className="checkout-text-input"
                      placeholder="seuemail@exemplo.com"
                      value={identificacao.email}
                      onChange={(e) =>
                        setIdentificacao((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="input-telefone" className="checkout-form-label">
                      WhatsApp / Celular <span className="req">*</span>
                    </label>
                    <input
                      id="input-telefone"
                      type="tel"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={15}
                      className="checkout-text-input"
                      placeholder="(11) 90000-0000"
                      value={identificacao.telefone}
                      onChange={(e) =>
                        setIdentificacao((prev) => ({
                          ...prev,
                          telefone: formatTelefone(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <button type="submit" className="checkout-primary-action-btn">
                  <span>IR PARA ENTREGA</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </form>
            </section>
          )}

          {/* ==============================================================
              ETAPA 2: ENDEREÇO DE ENTREGA
              ============================================================== */}
          {currentStep === 'endereco' && (
            <section className="checkout-step-section" aria-labelledby="step-2-heading">
              <div className="step-section-header">
                <span className="step-counter-text">Etapa 2 de 3</span>
                <h2 id="step-2-heading" className="step-title">
                  Endereço de Entrega
                </h2>
                <p className="step-subtitle">
                  Digite seu CEP para carregar o endereço automaticamente com o <strong>Busca CEP</strong>.
                </p>
              </div>

              <form onSubmit={handleAvancarParaPagamento} className="checkout-step-form">
                {/* Campo CEP com Botão Buscar CEP Integrado */}
                <div className="form-field-group">
                  <div className="form-label-with-hint">
                    <label htmlFor="input-cep" className="checkout-form-label">
                      CEP <span className="req">*</span>
                    </label>
                    <a
                      href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cep-hint-link"
                    >
                      Não sei meu CEP
                    </a>
                  </div>
                  <div className="cep-input-wrapper">
                    <input
                      id="input-cep"
                      type="text"
                      required
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={9}
                      className="checkout-text-input"
                      placeholder="00000-000"
                      value={endereco.cep}
                      onChange={(e) => {
                        const formatted = formatCEP(e.target.value)
                        setEndereco((prev) => ({ ...prev, cep: formatted }))
                        const digits = formatted.replace(/\D/g, '')
                        if (digits.length === 8) {
                          handleBuscarCep(digits)
                        } else {
                          setCepError(null)
                        }
                      }}
                    />
                    {isSearchingCep && (
                      <div className="cep-inline-spinner-wrap" title="Buscando endereço...">
                        <span className="cep-inline-spinner" />
                      </div>
                    )}
                  </div>
                  {cepError && <p className="cep-inline-error">{cepError}</p>}
                </div>

                {/* Rua / Logradouro */}
                <div className="form-field-group">
                  <label htmlFor="input-rua" className="checkout-form-label">
                    Rua / Logradouro <span className="req">*</span>
                  </label>
                  <input
                    id="input-rua"
                    type="text"
                    required
                    autoComplete="address-line1"
                    className="checkout-text-input"
                    placeholder="Ex: Av. Paulista ou Rua Oscar Freire"
                    value={endereco.rua}
                    onChange={(e) =>
                      setEndereco((prev) => ({ ...prev, rua: e.target.value }))
                    }
                  />
                </div>

                {/* Número e Complemento (ergonômico no mobile) */}
                <div className="form-fields-grid-2 form-fields-row-num-comp">
                  <div className="form-field-group num-col">
                    <label htmlFor="input-numero" className="checkout-form-label">
                      Número <span className="req">*</span>
                    </label>
                    <input
                      id="input-numero"
                      type="text"
                      required
                      inputMode="numeric"
                      autoComplete="address-line2"
                      className="checkout-text-input"
                      placeholder="123"
                      value={endereco.numero}
                      onChange={(e) =>
                        setEndereco((prev) => ({ ...prev, numero: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-field-group comp-col">
                    <label htmlFor="input-complemento" className="checkout-form-label">
                      Complemento (opcional)
                    </label>
                    <input
                      id="input-complemento"
                      type="text"
                      autoComplete="address-line3"
                      className="checkout-text-input"
                      placeholder="Apto, Bloco, etc."
                      value={endereco.complemento}
                      onChange={(e) =>
                        setEndereco((prev) => ({ ...prev, complemento: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Bairro, Cidade e UF */}
                <div className="form-fields-grid-3">
                  <div className="form-field-group">
                    <label htmlFor="input-bairro" className="checkout-form-label">
                      Bairro <span className="req">*</span>
                    </label>
                    <input
                      id="input-bairro"
                      type="text"
                      required
                      autoComplete="address-level3"
                      className="checkout-text-input"
                      placeholder="Bela Vista"
                      value={endereco.bairro}
                      onChange={(e) =>
                        setEndereco((prev) => ({ ...prev, bairro: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="input-cidade" className="checkout-form-label">
                      Cidade <span className="req">*</span>
                    </label>
                    <input
                      id="input-cidade"
                      type="text"
                      required
                      autoComplete="address-level2"
                      className="checkout-text-input"
                      placeholder="São Paulo"
                      value={endereco.cidade}
                      onChange={(e) =>
                        setEndereco((prev) => ({ ...prev, cidade: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-field-group uf-field">
                    <label htmlFor="input-uf" className="checkout-form-label">
                      UF <span className="req">*</span>
                    </label>
                    <input
                      id="input-uf"
                      type="text"
                      required
                      maxLength={2}
                      autoCapitalize="characters"
                      className="checkout-text-input text-uppercase"
                      placeholder="SP"
                      value={endereco.uf}
                      onChange={(e) =>
                        setEndereco((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))
                      }
                    />
                  </div>
                </div>

                {/* Opções de Envio */}
                <div className="checkout-shipping-options">
                  <span className="shipping-select-title">SELECIONE A MODALIDADE DE ENVIO:</span>
                  <div className="shipping-cards-stack">
                    <label
                      className={`shipping-method-card ${
                        endereco.freteTipo === 'standard' ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="frete_opcao"
                        checked={endereco.freteTipo === 'standard'}
                        onChange={() =>
                          setEndereco((prev) => ({ ...prev, freteTipo: 'standard' }))
                        }
                      />
                      <div className="shipping-method-info">
                        <strong>LEVER Standard Econômico</strong>
                        <small>Entrega de 4 a 7 dias úteis com rastreio</small>
                      </div>
                      <span className="shipping-method-tag">
                        {hasFreeShipping ? 'GRÁTIS' : 'R$ 14,90'}
                      </span>
                    </label>

                    <label
                      className={`shipping-method-card ${
                        endereco.freteTipo === 'express' ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="frete_opcao"
                        checked={endereco.freteTipo === 'express'}
                        onChange={() =>
                          setEndereco((prev) => ({ ...prev, freteTipo: 'express' }))
                        }
                      />
                      <div className="shipping-method-info">
                        <strong>LEVER Sedex Expresso Prioritário</strong>
                        <small>Entrega rápida de 1 a 3 dias úteis</small>
                      </div>
                      <span className="shipping-method-tag">R$ 24,90</span>
                    </label>
                  </div>
                </div>

                <div className="form-action-buttons-row">
                  <button
                    type="button"
                    className="checkout-back-link-btn"
                    onClick={() => setCurrentStep('identificacao')}
                  >
                    ← Voltar para Identificação
                  </button>

                  <button type="submit" className="checkout-primary-action-btn">
                    <span>IR PARA O PAGAMENTO</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* ==============================================================
              ETAPA 3: MÉTODO DE PAGAMENTO
              ============================================================== */}
          {currentStep === 'pagamento' && (
            <section className="checkout-step-section" aria-labelledby="step-3-heading">
              <div className="step-section-header">
                <span className="step-counter-text">Etapa 3 de 3</span>
                <h2 id="step-3-heading" className="step-title">
                  Selecionar Método de Pagamento
                </h2>
                <p className="step-subtitle">
                  Processamento protegido com criptografia bancária antifraude Mercado Pago.
                </p>
              </div>

              <form onSubmit={handleFinalizarCompra} className="checkout-step-form">
                {/* Seletores de Método */}
                <div className="payment-methods-selector">
                  <label
                    className={`payment-tab-btn ${
                      pagamento.metodo === 'pix' ? 'active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={pagamento.metodo === 'pix'}
                      onChange={() =>
                        setPagamento((prev) => ({ ...prev, metodo: 'pix' }))
                      }
                    />
                    <div className="tab-btn-content">
                      <span className="tab-btn-title">Pix Instantâneo</span>
                      <span className="tab-btn-badge">Aprovação Imediata</span>
                    </div>
                  </label>

                  <label
                    className={`payment-tab-btn ${
                      pagamento.metodo === 'cartao' ? 'active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={pagamento.metodo === 'cartao'}
                      onChange={() =>
                        setPagamento((prev) => ({ ...prev, metodo: 'cartao' }))
                      }
                    />
                    <div className="tab-btn-content">
                      <span className="tab-btn-title">Cartão de Crédito</span>
                      <span className="tab-btn-sub">Até 6x sem juros</span>
                    </div>
                  </label>
                </div>

                {/* Conteúdo Dinâmico por Método */}
                {pagamento.metodo === 'pix' && (
                  <div className="payment-tab-panel">
                    <p className="pix-info-text">
                      O código Pix e o QR Code serão gerados imediatamente na tela seguinte para aprovação instantânea do seu pedido.
                    </p>
                  </div>
                )}

                {pagamento.metodo === 'cartao' && (
                  <div className="payment-tab-panel">
                    <div className="form-field-group">
                      <label htmlFor="card-number" className="checkout-form-label">
                        Número do Cartão de Crédito <span className="req">*</span>
                      </label>
                      <input
                        id="card-number"
                        type="text"
                        required
                        inputMode="numeric"
                        autoComplete="cc-number"
                        maxLength={19}
                        className="checkout-text-input"
                        placeholder="0000 0000 0000 0000"
                        value={pagamento.cartaoNumero}
                        onChange={(e) =>
                          setPagamento((prev) => ({
                            ...prev,
                            cartaoNumero: formatCartaoNumero(e.target.value),
                          }))
                        }
                      />
                    </div>

                    <div className="form-field-group">
                      <label htmlFor="card-name" className="checkout-form-label">
                        Nome impresso no Cartão <span className="req">*</span>
                      </label>
                      <input
                        id="card-name"
                        type="text"
                        required
                        autoComplete="cc-name"
                        autoCapitalize="characters"
                        className="checkout-text-input text-uppercase"
                        placeholder="COMO IMPRESSO NO CARTÃO"
                        value={pagamento.cartaoNome}
                        onChange={(e) =>
                          setPagamento((prev) => ({ ...prev, cartaoNome: e.target.value }))
                        }
                      />
                    </div>

                    <div className="form-fields-grid-2 form-fields-row-card-exp">
                      <div className="form-field-group">
                        <label htmlFor="card-exp" className="checkout-form-label">
                          Validade <span className="req">*</span>
                        </label>
                        <input
                          id="card-exp"
                          type="text"
                          required
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          maxLength={5}
                          className="checkout-text-input"
                          placeholder="MM/AA"
                          value={pagamento.cartaoValidade}
                          onChange={(e) =>
                            setPagamento((prev) => ({
                              ...prev,
                              cartaoValidade: formatValidade(e.target.value),
                            }))
                          }
                        />
                      </div>

                      <div className="form-field-group">
                        <label htmlFor="card-cvv" className="checkout-form-label">
                          CVV <span className="req">*</span>
                        </label>
                        <input
                          id="card-cvv"
                          type="text"
                          required
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          maxLength={4}
                          className="checkout-text-input"
                          placeholder="123"
                          value={pagamento.cartaoCvv}
                          onChange={(e) =>
                            setPagamento((prev) => ({
                              ...prev,
                              cartaoCvv: e.target.value.replace(/\D/g, '').slice(0, 4),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="form-field-group">
                      <label htmlFor="card-installments" className="checkout-form-label">
                        Parcelamento
                      </label>
                      <select
                        id="card-installments"
                        className="checkout-select-input"
                        value={pagamento.cartaoParcelas}
                        onChange={(e) =>
                          setPagamento((prev) => ({
                            ...prev,
                            cartaoParcelas: Number(e.target.value),
                          }))
                        }
                      >
                        <option value={1}>1x de {formatBRL(totalComFrete)} sem juros</option>
                        <option value={2}>2x de {formatBRL(totalComFrete / 2)} sem juros</option>
                        <option value={3}>3x de {formatBRL(totalComFrete / 3)} sem juros</option>
                        <option value={4}>4x de {formatBRL(totalComFrete / 4)} sem juros</option>
                        <option value={5}>5x de {formatBRL(totalComFrete / 5)} sem juros</option>
                        <option value={6}>6x de {formatBRL(totalComFrete / 6)} sem juros</option>
                      </select>
                    </div>
                  </div>
                )}


                <div className="form-action-buttons-row">
                  <button
                    type="button"
                    className="checkout-back-link-btn"
                    onClick={() => setCurrentStep('endereco')}
                  >
                    ← Voltar para Endereço
                  </button>

                  <button type="submit" className="checkout-primary-action-btn">
                    <span>FINALIZAR PEDIDO</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>

        {/* Coluna do Resumo do Pedido - Fica ABAIXO do Formulário no Mobile */}
        <aside className="checkout-summary-column" aria-label="Resumo da Compra">
          <div className="checkout-summary-card">
            <div className="summary-card-header-row">
              <h3 className="summary-card-heading">Seu Pedido LEVER</h3>
              <span className="summary-items-count-badge">
                {items.reduce((acc, it) => acc + it.quantity, 0)} {items.reduce((acc, it) => acc + it.quantity, 0) === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {/* Lista dos Itens do Pedido */}
            <div className="summary-items-list">
              {items.map((item) => (
                <div key={item.id} className="summary-item-row">
                  <div className="summary-item-thumb">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="6.5" cy="14.5" r="3.5" />
                      <circle cx="17.5" cy="14.5" r="3.5" />
                      <path d="M3 11h3l2 4h8l2-4h3" />
                    </svg>
                    <span className="summary-item-badge">{item.quantity}</span>
                  </div>

                  <div className="summary-item-meta">
                    <span className="summary-item-title">{item.name}</span>
                    <span className="summary-item-variant">{item.variant || 'Acetato UV400'}</span>
                  </div>

                  <span className="summary-item-price">
                    {formatBRL(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-math-breakdown">
              <div className="math-row">
                <span>Subtotal</span>
                <strong>{formatBRL(subtotal)}</strong>
              </div>

              <div className="math-row">
                <span>Frete ({endereco.freteTipo === 'express' ? 'Sedex' : 'Standard'})</span>
                <span>
                  {freteValor === 0 ? <strong className="green-text">GRÁTIS</strong> : formatBRL(freteValor)}
                </span>
              </div>

              <div className="math-divider" />

              <div className="math-row total-highlight">
                <span>TOTAL A PAGAR</span>
                <span className="final-price">{formatBRL(totalComFrete)}</span>
              </div>

              <p className="installments-disclaimer">
                ou em até 6x de {formatBRL(totalComFrete / 6)} sem juros no cartão
              </p>
            </div>

            {/* Selos de Confiança e Garantia */}
            <div className="summary-security-footer">
              <div className="security-point">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>7 dias para testar ou devolver sem custos</span>
              </div>
              <div className="security-point">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Pagamento seguro via Mercado Pago</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
