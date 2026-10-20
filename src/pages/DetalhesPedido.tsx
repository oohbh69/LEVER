import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface OrderItemProduct {
  id: string
  product_id?: string | null
  product_name: string
  product_sku: string
  variant_info?: string | null
  quantity: number
  unit_price: number
  total_price: number
}

interface OrderPayment {
  id: string
  method: string
  amount: number
  status: string
  gateway?: string | null
  gateway_payment_id?: string | null
  pix_code?: string | null
  card_brand?: string | null
  card_last_four?: string | null
  installments?: number
  created_at?: string
}

interface OrderTrackingEvent {
  id: string
  status_title: string
  description: string
  location?: string | null
  event_time: string
  created_at: string
}

interface FullOrderData {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_cpf?: string | null
  customer_phone?: string | null
  subtotal: number
  shipping_cost: number
  discount_amount: number
  total_amount: number
  payment_status: 'aguardando' | 'pago' | 'cancelado'
  shipping_status: 'pendente' | 'embalado' | 'enviado' | 'cancelado'
  payment_method?: string | null
  shipping_method?: string | null
  shipping_cep: string
  shipping_street: string
  shipping_number: string
  shipping_complement?: string | null
  shipping_neighborhood: string
  shipping_city: string
  shipping_state: string
  tracking_code?: string | null
  notes?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  created_at: string
  updated_at: string
  order_items: OrderItemProduct[]
  payments: OrderPayment[]
  order_tracking_events: OrderTrackingEvent[]
}

interface DetalhesPedidoPageProps {
  orderId: string
  onBack: () => void
  onNavigateToTracking?: (trackingCodeOrOrder: string) => void
}

export function DetalhesPedidoPage({
  orderId,
  onBack,
  onNavigateToTracking,
}: DetalhesPedidoPageProps) {
  const [order, setOrder] = useState<FullOrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Estados de edição inline
  const [trackingCodeInput, setTrackingCodeInput] = useState('')
  const [isSavingTracking, setIsSavingTracking] = useState(false)

  const [notesInput, setNotesInput] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Estado para adicionar novo evento na linha do tempo
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDesc, setNewEventDesc] = useState('')
  const [isAddingEvent, setIsAddingEvent] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur))
    }, 3200)
  }

  // Buscar dados completos do pedido
  const fetchOrderDetails = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*),
          payments(*),
          order_tracking_events(*)
        `)
        .eq('id', orderId)
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Pedido não localizado no banco de dados.')
      }

      // Ordenar eventos cronologicamente
      if (Array.isArray(data.order_tracking_events)) {
        data.order_tracking_events.sort(
          (a: any, b: any) =>
            new Date(b.event_time || b.created_at).getTime() -
            new Date(a.event_time || a.created_at).getTime()
        )
      }

      setOrder(data as FullOrderData)
      setTrackingCodeInput(data.tracking_code || '')
      setNotesInput(data.notes || '')
    } catch (err: any) {
      console.error('Erro ao buscar detalhes do pedido:', err)
      setLoadError(err.message || 'Falha ao carregar informações do pedido.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails()
    }
  }, [orderId])

  // Ações de alteração de status
  const handleUpdatePaymentStatus = async (newStatus: 'pago' | 'aguardando' | 'cancelado') => {
    if (!order) return
    try {
      const { error: ordErr } = await supabase
        .from('orders')
        .update({ payment_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id)

      if (ordErr) throw ordErr

      if (newStatus === 'pago') {
        await supabase
          .from('payments')
          .update({ status: 'aprovado', updated_at: new Date().toISOString() })
          .eq('order_id', order.id)

        await supabase.from('order_tracking_events').insert({
          order_id: order.id,
          status_title: 'Pagamento Confirmado',
          description: 'Pagamento aprovado. O pedido foi enviado para a fila de separação no estoque.',
          location: `${order.shipping_city}/${order.shipping_state}`,
        })
      }

      setOrder((prev) => (prev ? { ...prev, payment_status: newStatus } : null))
      showToast(`Status de pagamento atualizado para "${newStatus.toUpperCase()}".`)
      fetchOrderDetails()
      window.dispatchEvent(new CustomEvent('orders-updated'))
    } catch (err: any) {
      console.error('Erro ao atualizar pagamento:', err)
      showToast('Erro ao atualizar status de pagamento.')
    }
  }

  const handleUpdateShippingStatus = async (newStatus: 'pendente' | 'embalado' | 'enviado' | 'cancelado') => {
    if (!order) return
    try {
      const updatePayload: any = {
        shipping_status: newStatus,
        updated_at: new Date().toISOString(),
      }
      if (newStatus === 'enviado' && !order.shipped_at) {
        updatePayload.shipped_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', order.id)

      if (error) throw error

      let eventTitle = ''
      let eventDesc = ''
      if (newStatus === 'embalado') {
        eventTitle = 'Pedido Embalado'
        eventDesc = 'Todos os itens foram cuidadosamente conferidos, limpos e acondicionados na embalagem protetora LEVER.'
      } else if (newStatus === 'enviado') {
        eventTitle = 'Objeto Despachado / Em Trânsito'
        eventDesc = `Encomenda postada via transportadora.${order.tracking_code ? ` Código: ${order.tracking_code}` : ''}`
      } else if (newStatus === 'cancelado') {
        eventTitle = 'Envio Cancelado'
        eventDesc = 'A remessa deste pedido foi cancelada.'
      }

      if (eventTitle) {
        await supabase.from('order_tracking_events').insert({
          order_id: order.id,
          status_title: eventTitle,
          description: eventDesc,
          location: `${order.shipping_city}/${order.shipping_state}`,
        })
      }

      setOrder((prev) => (prev ? { ...prev, shipping_status: newStatus } : null))
      showToast(`Status de envio alterado para "${newStatus.toUpperCase()}".`)
      fetchOrderDetails()
      window.dispatchEvent(new CustomEvent('orders-updated'))
    } catch (err: any) {
      console.error('Erro ao atualizar status de envio:', err)
      showToast('Erro ao atualizar status de envio.')
    }
  }

  // Salvar código de rastreamento
  const handleSaveTrackingCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    const code = trackingCodeInput.trim().toUpperCase()
    if (!code) {
      showToast('Digite um código de rastreio válido.')
      return
    }

    setIsSavingTracking(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          tracking_code: code,
          shipping_status: 'enviado',
          shipped_at: order.shipped_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (error) throw error

      await supabase.from('order_tracking_events').insert({
        order_id: order.id,
        status_title: 'Objeto Despachado / Em Trânsito',
        description: `Código de rastreamento atualizado para ${code}. Encomenda encaminhada para unidade de distribuição.`,
        location: `${order.shipping_city}/${order.shipping_state}`,
      })

      showToast(`Código de rastreio ${code} salvo com sucesso!`)
      fetchOrderDetails()
      window.dispatchEvent(new CustomEvent('orders-updated'))
    } catch (err: any) {
      console.error('Erro ao salvar rastreio:', err)
      showToast('Erro ao registrar código de rastreamento.')
    } finally {
      setIsSavingTracking(false)
    }
  }

  // Salvar anotações internas
  const handleSaveNotes = async () => {
    if (!order) return
    setIsSavingNotes(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          notes: notesInput.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (error) throw error
      showToast('Anotações do pedido salvas com sucesso!')
      setOrder((prev) => (prev ? { ...prev, notes: notesInput.trim() } : null))
    } catch (err) {
      console.error('Erro ao salvar anotações:', err)
      showToast('Erro ao salvar anotações.')
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Adicionar novo evento manual na linha do tempo
  const handleAddNewTrackingEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order || !newEventTitle.trim()) return

    setIsAddingEvent(true)
    try {
      const { error } = await supabase.from('order_tracking_events').insert({
        order_id: order.id,
        status_title: newEventTitle.trim(),
        description: newEventDesc.trim() || 'Atualização de status registrada pelo administrador.',
        location: `${order.shipping_city}/${order.shipping_state}`,
        event_time: new Date().toISOString(),
      })

      if (error) throw error

      showToast('Evento registrado na linha do tempo!')
      setNewEventTitle('')
      setNewEventDesc('')
      setShowAddEvent(false)
      fetchOrderDetails()
    } catch (err) {
      console.error('Erro ao adicionar evento:', err)
      showToast('Erro ao adicionar evento.')
    } finally {
      setIsAddingEvent(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
          <span style={{ fontSize: '0.95rem' }}>Carregando detalhes do pedido...</span>
        </div>
      </div>
    )
  }

  if (loadError || !order) {
    return (
      <div style={{ padding: '2.5rem' }}>
        <button
          type="button"
          className="product-create-back-btn"
          onClick={onBack}
          style={{ marginBottom: '1.5rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Voltar para Pedidos</span>
        </button>

        <div style={{ padding: '2rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Não foi possível abrir o pedido</h3>
          <p style={{ margin: 0 }}>{loadError || 'O pedido selecionado não foi encontrado no sistema.'}</p>
        </div>
      </div>
    )
  }

  const rawPhoneDigits = (order.customer_phone || '').replace(/\D/g, '')
  const whatsappUrl = rawPhoneDigits
    ? `https://wa.me/55${rawPhoneDigits}?text=${encodeURIComponent(
        `Olá ${order.customer_name.split(' ')[0]}, tudo bem? Estamos entrando em contato da LEVER Eyewear sobre seu pedido ${order.order_number}.`
      )}`
    : null

  const formattedDate = new Date(order.created_at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', backgroundColor: '#f9fafb' }}>
      {/* Barra Superior de Navegação / Breadcrumbs */}
      <header className="product-create-topbar">
        <div className="product-create-topbar-left">
          <button
            type="button"
            className="product-create-back-btn"
            onClick={onBack}
            title="Voltar para lista de pedidos"
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
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Voltar para Pedidos</span>
          </button>

          <div className="product-create-breadcrumbs">
            <span className="crumb-segment">Vendas</span>
            <span className="crumb-separator">/</span>
            <span className="crumb-segment" onClick={onBack} style={{ cursor: 'pointer' }}>
              Pedidos
            </span>
            <span className="crumb-separator">/</span>
            <span className="crumb-current">{order.order_number}</span>
          </div>
        </div>

        <div className="product-create-topbar-right" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          {order.tracking_code && (
            <a
              href="#rastreio"
              onClick={(e) => {
                e.preventDefault()
                if (onNavigateToTracking) {
                  onNavigateToTracking(order.tracking_code || order.order_number)
                } else {
                  window.location.hash = 'rastreio'
                }
              }}
              className="order-action-btn"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Ver no Rastreio</span>
            </a>
          )}

          <button
            type="button"
            className="order-action-btn"
            onClick={() => window.print()}
            title="Imprimir comprovante do pedido"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Imprimir</span>
          </button>
        </div>
      </header>

      {/* Conteúdo da Página de Detalhes */}
      <div className="product-create-container" style={{ maxWidth: '1240px', margin: '0 auto', width: '100%', padding: '1.5rem' }}>
        {/* Banner do Título e Status Principal */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.65rem',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: '#000000',
                }}
              >
                Pedido {order.order_number}
              </h1>

              {/* Badges de Status */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {order.payment_status === 'pago' ? (
                  <span className="order-badge paid">Pago</span>
                ) : order.payment_status === 'cancelado' ? (
                  <span className="order-badge cancelled">Pagamento Cancelado</span>
                ) : (
                  <span className="order-badge awaiting">Aguardando Pagamento</span>
                )}

                {order.shipping_status === 'enviado' ? (
                  <span className="order-badge shipped">Enviado</span>
                ) : order.shipping_status === 'embalado' ? (
                  <span className="order-badge packed">Embalado</span>
                ) : order.shipping_status === 'cancelado' ? (
                  <span className="order-badge cancelled">Envio Cancelado</span>
                ) : (
                  <span className="order-badge pending">Envio Pendente</span>
                )}
              </div>
            </div>

            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.84rem', color: '#6b7280' }}>
              Realizado em <strong>{formattedDate}</strong> • Canal: <strong>Loja Online LEVER</strong> • Total:{' '}
              <strong style={{ color: '#000000' }}>
                R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
              </strong>
            </p>
          </div>

          {/* Botões Rápidos de Mudança de Status */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {order.payment_status !== 'pago' && (
              <button
                type="button"
                onClick={() => handleUpdatePaymentStatus('pago')}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 0,
                }}
              >
                ✓ Confirmar Pagamento
              </button>
            )}

            {order.shipping_status !== 'embalado' && order.shipping_status !== 'enviado' && (
              <button
                type="button"
                onClick={() => handleUpdateShippingStatus('embalado')}
                style={{
                  backgroundColor: '#111111',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 0,
                }}
              >
                Marcar como Embalado
              </button>
            )}

            {order.shipping_status !== 'enviado' && (
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('tracking-input-field')
                  el?.focus()
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 0,
                }}
              >
                Despachar Encomenda
              </button>
            )}

            {order.payment_status !== 'cancelado' && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja realmente cancelar este pedido?')) {
                    handleUpdatePaymentStatus('cancelado')
                    handleUpdateShippingStatus('cancelado')
                  }
                }}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  borderRadius: 0,
                }}
              >
                Cancelar Pedido
              </button>
            )}
          </div>
        </div>

        {/* Grid de 2 Colunas do Pedido */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.85fr) minmax(0, 1.15fr)', gap: '1.5rem' }}>
          {/* ==========================================
              COLUNA ESQUERDA: PRODUTOS, FINANCEIRO, HISTÓRICO
              ========================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Card 1: Itens Comprados */}
            <section className="product-form-card">
              <div className="product-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="product-card-title">Itens do Pedido</h2>
                  <span className="product-card-desc">
                    {order.order_items?.length || 0} {(order.order_items?.length || 0) === 1 ? 'item incluso' : 'itens inclusos'}
                  </span>
                </div>
              </div>

              <div style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem 1.25rem', color: '#6b7280', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase' }}>Produto</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Qtd</th>
                      <th style={{ padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Preço Unitário</th>
                      <th style={{ padding: '0.75rem 1.25rem', color: '#6b7280', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  backgroundColor: '#f3f4f6',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#4b5563',
                                  flexShrink: 0,
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <circle cx="6.5" cy="14.5" r="3.5" />
                                  <circle cx="17.5" cy="14.5" r="3.5" />
                                  <path d="M10 14.5h4" />
                                </svg>
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#111111' }}>{item.product_name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                                  SKU: <strong>{item.product_sku}</strong>
                                  {item.variant_info ? ` • ${item.variant_info}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 500 }}>
                            {item.quantity}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: '#4b5563' }}>
                            R$ {Number(item.unit_price).toFixed(2).replace('.', ',')}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 600 }}>
                            R$ {Number(item.total_price).toFixed(2).replace('.', ',')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                          Nenhum item discriminado para este pedido.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Card 2: Resumo Financeiro & Forma de Pagamento */}
            <section className="product-form-card">
              <div className="product-card-header">
                <h2 className="product-card-title">Resumo Financeiro & Pagamento</h2>
                <span className="product-card-desc">Valores cobrados e detalhes da liquidação</span>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                    <span>Subtotal dos produtos</span>
                    <span>R$ {Number(order.subtotal || 0).toFixed(2).replace('.', ',')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                    <span>
                      Frete ({order.shipping_method || 'Envio Standard'})
                    </span>
                    <span>
                      {Number(order.shipping_cost || 0) === 0
                        ? 'GRÁTIS'
                        : `R$ ${Number(order.shipping_cost).toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>

                  {Number(order.discount_amount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 500 }}>
                      <span>Desconto Aplicado</span>
                      <span>- R$ {Number(order.discount_amount).toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: '0.85rem',
                      marginTop: '0.25rem',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: '#000000',
                    }}
                  >
                    <span>Total Liquidado</span>
                    <span>R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                {/* Box com Dados do Pagamento */}
                <div
                  style={{
                    marginTop: '1.25rem',
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <strong>Forma de Pagamento:</strong>
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      {order.payment_method === 'pix' ? 'Pix (Instantâneo)' : 'Cartão de Crédito'}
                    </span>
                  </div>

                  {order.payments && order.payments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#4b5563' }}>
                      {order.payments[0].gateway && (
                        <div>Gateway: <strong>{order.payments[0].gateway}</strong></div>
                      )}
                      {order.payments[0].gateway_payment_id && (
                        <div>ID Transação: <strong>{order.payments[0].gateway_payment_id}</strong></div>
                      )}
                      {order.payments[0].installments && order.payments[0].installments > 1 && (
                        <div>Parcelamento: <strong>{order.payments[0].installments}x sem juros</strong></div>
                      )}
                      {order.payments[0].card_last_four && (
                        <div>Cartão: <strong>**** **** **** {order.payments[0].card_last_four}</strong></div>
                      )}
                      {order.payments[0].pix_code && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.74rem', color: '#6b7280', display: 'block' }}>Chave Pix Copia e Cola:</span>
                          <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.74rem', backgroundColor: '#ffffff', padding: '0.4rem', border: '1px solid #e5e7eb', marginTop: '3px' }}>
                            {order.payments[0].pix_code}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Card 3: Linha do Tempo e Histórico do Pedido */}
            <section className="product-form-card">
              <div className="product-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="product-card-title">Linha do Tempo de Rastreio</h2>
                  <span className="product-card-desc">Eventos e atualizações registradas para este pedido</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddEvent(!showAddEvent)}
                  className="order-action-btn"
                  style={{ fontSize: '0.75rem' }}
                >
                  {showAddEvent ? 'Cancelar' : '+ Novo Evento'}
                </button>
              </div>

              <div style={{ padding: '1.25rem' }}>
                {/* Formulário para Adicionar Evento */}
                {showAddEvent && (
                  <form
                    onSubmit={handleAddNewTrackingEvent}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #111111',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem' }}>
                      Registrar Nova Movimentação
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '3px' }}>
                          Título do Evento *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Saiu para Entrega, Em Trânsito..."
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          className="checkout-text-input"
                          style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '3px' }}>
                          Descrição detalhada
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: O carteiro saiu com o pacote para entrega ao endereço."
                          value={newEventDesc}
                          onChange={(e) => setNewEventDesc(e.target.value)}
                          className="checkout-text-input"
                          style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddEvent(false)}
                          style={{ background: 'none', border: '1px solid #d1d5db', padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isAddingEvent}
                          style={{ backgroundColor: '#000000', color: '#ffffff', border: 'none', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {isAddingEvent ? 'Salvando...' : 'Salvar Evento'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Lista dos Eventos da Linha do Tempo */}
                <div className="tracking-timeline" style={{ marginLeft: '1rem' }}>
                  {order.order_tracking_events && order.order_tracking_events.length > 0 ? (
                    order.order_tracking_events.map((ev, idx) => (
                      <div key={ev.id || idx} className="timeline-step completed">
                        <div className="step-marker" style={{ width: '22px', height: '22px', fontSize: '0.65rem' }}>
                          ✓
                        </div>
                        <div className="step-info">
                          <h4 style={{ fontSize: '0.9rem' }}>{ev.status_title}</h4>
                          <p style={{ fontSize: '0.82rem', margin: '0.2rem 0' }}>{ev.description}</p>
                          <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>
                            {new Date(ev.event_time || ev.created_at).toLocaleString('pt-BR')}
                            {ev.location ? ` • ${ev.location}` : ''}
                          </small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="timeline-step completed">
                      <div className="step-marker">✓</div>
                      <div className="step-info">
                        <h4>Pedido Realizado</h4>
                        <p>Pedido registrado no sistema LEVER Glasses.</p>
                        <small style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{formattedDate}</small>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* ==========================================
              COLUNA DIREITA: CLIENTE, ENDEREÇO, RASTREIO, NOTAS
              ========================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Card 1: Dados do Cliente */}
            <section className="product-form-card">
              <div className="product-card-header">
                <h2 className="product-card-title">Dados do Cliente</h2>
                <span className="product-card-desc">Informações cadastrais e contato</span>
              </div>

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', display: 'block' }}>Nome Completo</span>
                  <strong style={{ fontSize: '0.95rem', color: '#111111' }}>{order.customer_name}</strong>
                </div>

                {order.customer_cpf && (
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', display: 'block' }}>CPF</span>
                    <span>{order.customer_cpf}</span>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', display: 'block' }}>E-mail</span>
                  <a href={`mailto:${order.customer_email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                    {order.customer_email}
                  </a>
                </div>

                {order.customer_phone && (
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', display: 'block' }}>Telefone / WhatsApp</span>
                    <span>{order.customer_phone}</span>

                    {whatsappUrl && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#22c55e',
                            color: '#ffffff',
                            textDecoration: 'none',
                            padding: '0.45rem 0.8rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            borderRadius: '2px',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                          </svg>
                          Conversar no WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Card 2: Endereço de Entrega */}
            <section className="product-form-card">
              <div className="product-card-header">
                <h2 className="product-card-title">Endereço de Entrega</h2>
                <span className="product-card-desc">Destino do envio e modalidade</span>
              </div>

              <div style={{ padding: '1.25rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: 1.5 }}>
                <div>
                  <strong>{order.shipping_street}, {order.shipping_number}</strong>
                  {order.shipping_complement ? ` - ${order.shipping_complement}` : ''}
                </div>
                <div>
                  {order.shipping_neighborhood} — {order.shipping_city}/{order.shipping_state}
                </div>
                <div>
                  CEP: <strong>{order.shipping_cep}</strong>
                </div>
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb', color: '#4b5563' }}>
                  Modalidade: <strong>{order.shipping_method || 'Envio Standard'}</strong>
                </div>
              </div>
            </section>

            {/* Card 3: Gestão do Código de Rastreamento */}
            <section className="product-form-card">
              <div className="product-card-header">
                <h2 className="product-card-title">Código de Rastreamento</h2>
                <span className="product-card-desc">Correios ou transportadora parceira</span>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <form onSubmit={handleSaveTrackingCode}>
                  <label
                    htmlFor="tracking-input-field"
                    style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}
                  >
                    Código de Rastreio:
                  </label>
                  <input
                    id="tracking-input-field"
                    type="text"
                    required
                    placeholder="Ex: BR123456789BR"
                    value={trackingCodeInput}
                    onChange={(e) => setTrackingCodeInput(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      border: '1px solid #111111',
                      borderRadius: 0,
                      boxSizing: 'border-box',
                      marginBottom: '0.75rem',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSavingTracking}
                    style={{
                      width: '100%',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.65rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSavingTracking ? 'Salvando...' : 'Salvar Código & Atualizar Envio'}
                  </button>
                </form>

                {order.tracking_code && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Código Atual:</span>
                      <strong style={{ fontFamily: 'monospace' }}>{order.tracking_code}</strong>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Card 4: Anotações Internas da Loja */}
            <section className="product-form-card">
              <div className="product-card-header">
                <h2 className="product-card-title">Notas Internas</h2>
                <span className="product-card-desc">Visível apenas para administradores</span>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <textarea
                  rows={4}
                  placeholder="Insira notas internas sobre este pedido (ex: cliente solicitou entrega prioritária, embalagem de presente especial)..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    fontSize: '0.84rem',
                    border: '1px solid #d1d5db',
                    borderRadius: 0,
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    marginBottom: '0.75rem',
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #111111',
                    color: '#111111',
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSavingNotes ? 'Salvando...' : 'Salvar Anotações'}
                </button>
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
