import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

interface FoundOrder {
  id: string
  order_number: string
  customer_name: string
  shipping_city: string
  shipping_state: string
  shipping_method: string
  tracking_code: string | null
  payment_status: string
  shipping_status: string
  created_at: string
  order_items?: Array<{
    id: string
    product_name: string
    quantity: number
  }>
  order_tracking_events?: Array<{
    id: string
    status_title: string
    description: string
    event_time: string
    location?: string
  }>
}

export function RastreioPage() {
  const [code, setCode] = useState('')
  const [searched, setSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [foundOrder, setFoundOrder] = useState<FoundOrder | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    const clean = code.trim().replace(/^#/, '')
    if (!clean) return

    setIsLoading(true)
    setSearched(true)
    setSearchError(null)
    setFoundOrder(null)

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          shipping_city,
          shipping_state,
          shipping_method,
          tracking_code,
          payment_status,
          shipping_status,
          created_at,
          order_items (id, product_name, quantity),
          order_tracking_events (id, status_title, description, event_time, location)
        `)
        .or(`order_number.ilike.%${clean}%,tracking_code.ilike.%${clean}%`)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        // Ordenar os eventos de rastreio cronologicamente
        const order = data[0]
        if (order.order_tracking_events) {
          order.order_tracking_events.sort(
            (a: any, b: any) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
          )
        }
        setFoundOrder(order as unknown as FoundOrder)
      } else {
        setSearchError(`Nenhum pedido localizado para a busca "${code}". Verifique se o código ou número do pedido está correto (Ex: #LVR-2026-1042).`)
      }
    } catch (err: any) {
      console.error('Erro na consulta de rastreamento:', err)
      setSearchError('Falha temporária ao consultar o rastreamento. Tente novamente em instantes.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <span className="page-category">Localização em Tempo Real</span>
        <h1 className="page-title">Rastrear Pedido</h1>
        <p className="page-subtitle">
          Acompanhe o trajeto da sua encomenda até a porta da sua casa com atualizações integradas.
        </p>
      </div>

      <div className="tracking-container">
        <form onSubmit={handleSearch} className="tracking-search-form">
          <label htmlFor="trackingCode" className="tracking-label">
            Digite o Código de Rastreio ou Número do Pedido:
          </label>
          <div className="tracking-input-wrapper">
            <input
              type="text"
              id="trackingCode"
              required
              placeholder="Ex: BR123456789BR ou #LVR-2026-1042"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setSearched(false)
                setSearchError(null)
              }}
              className="tracking-input"
            />
            <button type="submit" className="tracking-submit-btn" disabled={isLoading}>
              {isLoading ? 'BUSCANDO...' : 'RASTREAR'}
            </button>
          </div>
        </form>

        {searchError && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              fontSize: '0.88rem',
              lineHeight: 1.5,
            }}
          >
            {searchError}
          </div>
        )}

        {searched && foundOrder && (
          <div className="tracking-result-box">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '1rem',
              }}
            >
              <div className="tracking-status-badge">
                <span className="status-dot"></span>
                Pedido: <strong>{foundOrder.order_number}</strong>
              </div>

              {foundOrder.tracking_code && (
                <div style={{ fontSize: '0.82rem', color: '#4b5563' }}>
                  Código dos Correios: <strong style={{ fontFamily: 'monospace' }}>{foundOrder.tracking_code}</strong>
                </div>
              )}
            </div>

            {/* Resumo do Destino e Cliente */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                fontSize: '0.84rem',
                backgroundColor: '#f9fafb',
                padding: '1rem',
              }}
            >
              <div>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem' }}>Destinatário</span>
                <strong>{foundOrder.customer_name}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem' }}>Destino</span>
                <strong>{foundOrder.shipping_city} / {foundOrder.shipping_state}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem' }}>Modalidade</span>
                <span>{foundOrder.shipping_method}</span>
              </div>
              <div>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem' }}>Data do Pedido</span>
                <span>{new Date(foundOrder.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Linha do Tempo de Rastreamento Oficial */}
            <div className="tracking-timeline">
              {/* Eventos Históricos do Banco de Dados */}
              {foundOrder.order_tracking_events && foundOrder.order_tracking_events.length > 0 ? (
                foundOrder.order_tracking_events.map((ev, idx) => (
                  <div key={ev.id || idx} className="timeline-step completed">
                    <div className="step-marker">✓</div>
                    <div className="step-info">
                      <h4>{ev.status_title}</h4>
                      <p>{ev.description}</p>
                      <small style={{ color: '#9ca3af', fontSize: '0.72rem', marginTop: '3px', display: 'block' }}>
                        {new Date(ev.event_time).toLocaleString('pt-BR')} {ev.location ? `• ${ev.location}` : ''}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="timeline-step completed">
                  <div className="step-marker">✓</div>
                  <div className="step-info">
                    <h4>Pedido Registrado</h4>
                    <p>Pedido registrado no sistema LEVER Glasses.</p>
                  </div>
                </div>
              )}

              {/* Status Dinâmico de Envio */}
              {foundOrder.shipping_status === 'enviado' ? (
                <div className="timeline-step active">
                  <div className="step-marker">●</div>
                  <div className="step-info">
                    <h4>Objeto em Rota de Entrega</h4>
                    <p>A encomenda está sob cuidados do operador logístico para entrega ao destinatário.</p>
                  </div>
                </div>
              ) : foundOrder.shipping_status === 'embalado' ? (
                <div className="timeline-step active">
                  <div className="step-marker">●</div>
                  <div className="step-info">
                    <h4>Embalado & Pronto para Despacho</h4>
                    <p>Produto verificado, higienizado e acondicionado na embalagem protetora LEVER.</p>
                  </div>
                </div>
              ) : (
                <div className="timeline-step">
                  <div className="step-marker">○</div>
                  <div className="step-info">
                    <h4>Em Preparação no Estoque</h4>
                    <p>Aguardando finalização do processo de separação e expedição.</p>
                  </div>
                </div>
              )}

              <div className="timeline-step">
                <div className="step-marker">○</div>
                <div className="step-info">
                  <h4>Entregue ao Destinatário</h4>
                  <p>A encomenda será finalizada no endereço fornecido.</p>
                </div>
              </div>
            </div>

            {/* Itens do Pedido */}
            {foundOrder.order_items && foundOrder.order_items.length > 0 && (
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>
                  Itens nesta remessa:
                </span>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#111111' }}>
                  {foundOrder.order_items.map((it) => (
                    <li key={it.id}>
                      {it.quantity}x {it.product_name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="tracking-faq">
          <h3>Dúvidas Frequentes sobre Rastreamento</h3>
          <div className="faq-item">
            <h4>Onde encontro o código de rastreio?</h4>
            <p>
              O código é enviado automaticamente para o e-mail cadastrado na compra no prazo de 1 a 2 dias úteis após a aprovação do pagamento. Verifique também a pasta de Spam/Lixo Eletrônico.
            </p>
          </div>

          <div className="faq-item">
            <h4>O código não atualiza imediatamente?</h4>
            <p>
              É normal que os Correios ou a transportadora levem até 24 a 48 horas úteis após a postagem para registrar o primeiro evento no sistema de rastreamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
