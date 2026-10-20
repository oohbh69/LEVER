import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
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
  freteTipo: string
}

interface CustomShippingOption {
  id: string
  name: string
  price: number
  deliveryTime: string
  isFree: boolean
  minOrderValue?: number
  states: string[]
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
  const {
    items,
    subtotal,
    discountAmount,
    hasFreeShipping,
    clearCart,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCart()

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
    freteTipo: '',
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedOrderNumber, setGeneratedOrderNumber] = useState('')
  const [generatedPixCode, setGeneratedPixCode] = useState('')
  const [copiedPix, setCopiedPix] = useState(false)
  const [dbShippingRates, setDbShippingRates] = useState<CustomShippingOption[]>([])

  // Estado do Cupom de Desconto no Checkout
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; isError: boolean } | null>(null)

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return
    setCouponLoading(true)
    setCouponFeedback(null)
    try {
      const res = await applyCoupon(couponCodeInput)
      if (res.success) {
        setCouponFeedback({ message: res.message, isError: false })
        setCouponCodeInput('')
      } else {
        setCouponFeedback({ message: res.message, isError: true })
      }
    } catch {
      setCouponFeedback({ message: 'Erro ao validar cupom.', isError: true })
    } finally {
      setCouponLoading(false)
    }
  }

  // Carregar regras de frete ativas do Supabase
  useEffect(() => {
    async function fetchActiveRates() {
      try {
        const { data, error } = await supabase
          .from('shipping_rates')
          .select(`
            id,
            name,
            price,
            is_free,
            delivery_time,
            min_order_value,
            shipping_rate_states (
              state_uf
            )
          `)
          .eq('status', 'ativo')

        if (data && !error) {
          const mapped: CustomShippingOption[] = data.map((r: any) => ({
            id: r.id,
            name: r.name,
            price: Number(r.price) || 0,
            deliveryTime: r.delivery_time || '2 a 5 dias úteis',
            isFree: Boolean(r.is_free),
            minOrderValue:
              r.min_order_value !== null && r.min_order_value !== undefined
                ? Number(r.min_order_value)
                : undefined,
            states: (r.shipping_rate_states || []).map((s: any) => s.state_uf),
          }))
          setDbShippingRates(mapped)
        }
      } catch (err) {
        console.error('Erro ao buscar taxas de frete para checkout:', err)
      }
    }
    fetchActiveRates()
  }, [])

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

  const cleanCep = endereco.cep.replace(/\D/g, '')
  const isCepCompleted = cleanCep.length === 8 && endereco.uf.trim().length === 2

  // Taxas customizadas cadastradas que atendem o UF atual (APENAS após preenchimento do CEP)
  const matchingCustomRates = useMemo(() => {
    if (!isCepCompleted) return []
    const uf = endereco.uf.trim().toUpperCase()
    return dbShippingRates.filter((r) => r.states.length === 0 || r.states.includes(uf))
  }, [dbShippingRates, endereco.uf, isCepCompleted])

  // Manter a seleção sincronizada com as opções cadastradas disponíveis
  useEffect(() => {
    if (matchingCustomRates.length > 0) {
      const exists = matchingCustomRates.some((r) => r.id === endereco.freteTipo)
      if (!exists) {
        setEndereco((prev) => ({ ...prev, freteTipo: matchingCustomRates[0].id }))
      }
    } else {
      if (endereco.freteTipo) {
        setEndereco((prev) => ({ ...prev, freteTipo: '' }))
      }
    }
  }, [matchingCustomRates, endereco.freteTipo])

  // Modalidade selecionada
  const selectedCustomRate = isCepCompleted
    ? matchingCustomRates.find((r) => r.id === endereco.freteTipo) || matchingCustomRates[0]
    : null

  // Cálculo de Frete e Total - EXCLUSIVAMENTE das opções cadastradas após digitação do CEP
  let freteValor = 0
  let shippingName = selectedCustomRate ? selectedCustomRate.name : 'A calcular'
  const isShippingCalculated = Boolean(isCepCompleted && selectedCustomRate)

  if (selectedCustomRate) {
    const isFreeByMin =
      selectedCustomRate.minOrderValue !== undefined &&
      subtotal >= selectedCustomRate.minOrderValue
    if (hasFreeShipping || selectedCustomRate.isFree || isFreeByMin) {
      freteValor = 0
    } else {
      freteValor = selectedCustomRate.price
    }
  }

  const effectiveDiscount = discountAmount || 0
  const totalComFrete = Math.max(0, subtotal + freteValor - effectiveDiscount)

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
    if (matchingCustomRates.length === 0) {
      setValidationError(
        `Nenhuma modalidade de frete cadastrada para o estado de ${cleanUf.toUpperCase()}. Entre em contato com nosso atendimento.`
      )
      return
    }
    if (!endereco.freteTipo && selectedCustomRate) {
      setEndereco((prev) => ({ ...prev, freteTipo: selectedCustomRate.id }))
    }
    setValidationError(null)
    setCurrentStep('pagamento')
  }

  // Conclusão do Pedido
  const handleFinalizarCompra = async (e: React.FormEvent) => {
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

    if (items.length === 0) {
      setValidationError('Seu carrinho está vazio.')
      return
    }

    setValidationError(null)
    setIsSubmitting(true)

    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const randomOrder = `#LVR-${new Date().getFullYear()}-${randomSuffix}`
    
    const isPix = pagamento.metodo === 'pix'
    const pixCode = `00020126580014br.gov.bcb.pix0136leverglasses-checkout-demo-${randomSuffix}5204000053039865405802BR5913LEVER_GLASSES6009SAO_PAULO62070503***6304`

    try {
      // 1. Criar pedido principal no Supabase
      const effectiveDiscount = discountAmount || 0
      const finalAmount = Math.max(0, totalComFrete - effectiveDiscount)

      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: randomOrder,
          customer_name: identificacao.nomeCompleto.trim(),
          customer_email: identificacao.email.trim(),
          customer_cpf: identificacao.cpf.trim(),
          customer_phone: identificacao.telefone.trim(),
          subtotal: Number(subtotal.toFixed(2)),
          shipping_cost: Number(freteValor.toFixed(2)),
          discount_amount: Number(effectiveDiscount.toFixed(2)),
          total_amount: Number(finalAmount.toFixed(2)),
          payment_status: isPix ? 'aguardando' : 'pago',
          shipping_status: 'pendente',
          shipping_method: shippingName,
          shipping_cep: endereco.cep.trim(),
          shipping_street: endereco.rua.trim(),
          shipping_number: endereco.numero.trim(),
          shipping_complement: endereco.complemento?.trim() || null,
          shipping_neighborhood: endereco.bairro.trim(),
          shipping_city: endereco.cidade.trim(),
          shipping_state: endereco.uf.trim().toUpperCase(),
          payment_method: pagamento.metodo,
          notes: isPix
            ? 'Aguardando compensação do pagamento via Pix.'
            : 'Pagamento efetuado via Cartão de Crédito.',
        })
        .select()
        .single()

      if (orderErr || !orderData) {
        throw new Error(orderErr?.message || 'Erro ao registrar o pedido no banco de dados.')
      }

      // 2. Inserir itens do pedido
      const isValidUUID = (id: any) =>
        typeof id === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

      const itemsPayload = items.map((it) => ({
        order_id: orderData.id,
        product_id: isValidUUID(it.id) ? it.id : null,
        product_sku: it.tag || `SKU-${String(it.id).slice(0, 8)}`,
        product_name: it.name,
        variant_info: it.variant || null,
        quantity: it.quantity,
        unit_price: Number(it.price.toFixed(2)),
        total_price: Number((it.price * it.quantity).toFixed(2)),
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload)
      if (itemsErr) {
        console.warn('Erro ao inserir itens do pedido:', itemsErr)
      }

      // 3. Inserir pagamento
      const paymentPayload: any = isPix
        ? {
            order_id: orderData.id,
            method: 'pix',
            amount: orderData.total_amount,
            status: 'pendente',
            gateway: 'mercadopago',
            gateway_payment_id: `PIX-${randomSuffix}`,
            pix_code: pixCode,
            installments: 1,
          }
        : {
            order_id: orderData.id,
            method: 'cartao',
            amount: orderData.total_amount,
            status: 'aprovado',
            gateway: 'mercadopago',
            gateway_payment_id: `CARD-${randomSuffix}`,
            card_brand: 'Mastercard / Visa',
            card_last_four: pagamento.cartaoNumero.replace(/\D/g, '').slice(-4) || '9999',
            installments: pagamento.cartaoParcelas || 1,
          }

      const { error: payErr } = await supabase.from('payments').insert(paymentPayload)
      if (payErr) {
        console.warn('Erro ao registrar pagamento:', payErr)
      }

      // 4. Inserir evento de rastreio inicial
      const { error: trackErr } = await supabase.from('order_tracking_events').insert({
        order_id: orderData.id,
        status_title: isPix ? 'Pedido Realizado - Aguardando Pix' : 'Pagamento Aprovado',
        description: isPix
          ? 'Pedido criado no sistema. Aguardando compensação instantânea via Pix para despacho.'
          : 'Transação aprovada com sucesso via Cartão de Crédito. Pedido enviado para preparação e embalagem.',
        location: `${endereco.cidade}/${endereco.uf}`,
      })
      if (trackErr) {
        console.warn('Erro ao registrar evento de rastreio:', trackErr)
      }

      // 5. Registrar utilização do cupom se aplicável
      if (appliedCoupon?.id) {
        try {
          await supabase.rpc('record_coupon_usage', {
            p_coupon_id: appliedCoupon.id,
            p_order_id: orderData.id,
            p_customer_cpf: identificacao.cpf.trim(),
            p_discount_amount: Number(effectiveDiscount.toFixed(2)),
          })
        } catch (couponRpcErr) {
          console.warn('Erro ao registrar uso de cupom via RPC:', couponRpcErr)
        }
      }

      // Notificar a aplicação em tempo real
      window.dispatchEvent(
        new CustomEvent('orders-updated', {
          detail: { orderNumber: randomOrder, orderId: orderData.id },
        })
      )

      setGeneratedOrderNumber(randomOrder)
      setGeneratedPixCode(pixCode)
      setIsOrderFinished(true)
      clearCart()
    } catch (err: any) {
      console.error('Falha ao processar pedido:', err)
      setValidationError(err.message || 'Erro ao processar o pedido. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
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
              Modalidade: <strong>{shippingName}</strong>
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
                {generatedPixCode || '00020126580014br.gov.bcb.pix0136leverglasses-checkout-demo-20265204000053039865405802BR5913LEVER_GLASSES6009SAO_PAULO62070503***6304'}
              </div>
              <button
                type="button"
                className="pix-copy-action-btn"
                onClick={() => {
                  if (generatedPixCode) {
                    navigator.clipboard?.writeText(generatedPixCode)
                  }
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
                    {matchingCustomRates.length > 0 ? (
                      matchingCustomRates.map((rate) => {
                        const isFreeByMin =
                          rate.minOrderValue !== undefined && subtotal >= rate.minOrderValue
                        const isFree = hasFreeShipping || rate.isFree || isFreeByMin
                        const isSelected = endereco.freteTipo === rate.id

                        return (
                          <label
                            key={rate.id}
                            className={`shipping-method-card ${isSelected ? 'selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="frete_opcao"
                              checked={isSelected}
                              onChange={() =>
                                setEndereco((prev) => ({ ...prev, freteTipo: rate.id }))
                              }
                            />
                            <div className="shipping-method-info">
                              <strong>{rate.name}</strong>
                              <small>
                                Previsão: {rate.deliveryTime}
                                {rate.minOrderValue && !isFree && (
                                  <span style={{ display: 'block', color: '#16a34a', marginTop: '2px' }}>
                                    Grátis acima de R$ {rate.minOrderValue.toFixed(2).replace('.', ',')}
                                  </span>
                                )}
                              </small>
                            </div>
                            <span className="shipping-method-tag">
                              {isFree ? 'GRÁTIS' : `R$ ${rate.price.toFixed(2).replace('.', ',')}`}
                            </span>
                          </label>
                        )
                      })
                    ) : (
                      <div
                        style={{
                          padding: '1.25rem 1rem',
                          textAlign: 'center',
                          color: '#6b7280',
                          fontSize: '0.85rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px dashed #d1d5db',
                        }}
                      >
                        {!isCepCompleted ? (
                          'Digite seu CEP acima para carregar as opções de frete.'
                        ) : endereco.uf ? (
                          `Nenhuma modalidade de frete cadastrada para o estado de ${endereco.uf}.`
                        ) : (
                          'Aguardando preenchimento do CEP para calcular o frete.'
                        )}
                      </div>
                    )}
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

                  <button
                    type="submit"
                    className="checkout-primary-action-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ animation: 'spin 1s linear infinite' }}
                        >
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                        </svg>
                        <span>PROCESSANDO PEDIDO...</span>
                      </span>
                    ) : (
                      <>
                        <span>FINALIZAR PEDIDO</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </>
                    )}
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
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '3px',
                          display: 'block',
                        }}
                      />
                    ) : (
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
                    )}
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

            {/* Cupom de Desconto */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderBottom: '1px solid #f3f4f6',
                backgroundColor: '#fafafa',
              }}
            >
              {appliedCoupon ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    backgroundColor: '#f0fdf4',
                    border: '1px dashed #86efac',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2"
                    >
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
                        {appliedCoupon.code}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#15803d' }}>
                        {appliedCoupon.description}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0.2rem 0.4rem',
                    }}
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      placeholder="CUPOM DE DESCONTO"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleApplyCoupon()
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.65rem',
                        fontSize: '0.8rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    />
                    <button
                      type="button"
                      disabled={couponLoading || !couponCodeInput.trim()}
                      onClick={handleApplyCoupon}
                      style={{
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#111111',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: couponLoading || !couponCodeInput.trim() ? 'not-allowed' : 'pointer',
                        opacity: couponLoading || !couponCodeInput.trim() ? 0.6 : 1,
                      }}
                    >
                      {couponLoading ? '...' : 'APLICAR'}
                    </button>
                  </div>
                  {couponFeedback && (
                    <div
                      style={{
                        fontSize: '0.74rem',
                        marginTop: '0.35rem',
                        color: couponFeedback.isError ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {couponFeedback.message}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="summary-math-breakdown">
              <div className="math-row">
                <span>Subtotal</span>
                <strong>{formatBRL(subtotal)}</strong>
              </div>

              {effectiveDiscount > 0 && (
                <div className="math-row" style={{ color: '#16a34a' }}>
                  <span>Desconto ({appliedCoupon?.code})</span>
                  <strong>- {formatBRL(effectiveDiscount)}</strong>
                </div>
              )}

              <div className="math-row">
                <span>Frete {isShippingCalculated ? `(${shippingName})` : ''}</span>
                <span>
                  {isShippingCalculated ? (
                    freteValor === 0 ? (
                      <strong className="green-text">GRÁTIS</strong>
                    ) : (
                      formatBRL(freteValor)
                    )
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      A calcular
                    </span>
                  )}
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
