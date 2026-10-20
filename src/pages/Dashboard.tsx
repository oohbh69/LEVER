import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CriarProdutoPage, type NewProductData } from './CriarProduto'
import { CriarFretePage } from './CriarFrete'
import { CriarCupomPage } from './CriarCupom'
import { CarrosselVitrinePage } from './CarrosselVitrine'
import { DetalhesPedidoPage } from './DetalhesPedido'

type TabType =
  | 'dashboard'
  | 'pedidos'
  | 'detalhes-pedido'
  | 'produtos'
  | 'criar-produto'
  | 'frete'
  | 'cupom'
  | 'carrossel-vitrine'

interface OrderItem {
  id: string
  number: string
  date: string
  clientName: string
  clientEmail: string
  clientCpf?: string
  clientPhone?: string
  total: string
  totalNumeric: number
  subtotalNumeric: number
  shippingCostNumeric: number
  discountAmountNumeric: number
  products: string
  paymentStatus: 'aguardando' | 'pago' | 'cancelado'
  shippingStatus: 'pendente' | 'embalado' | 'enviado' | 'cancelado'
  paymentMethod?: string
  shippingMethod?: string
  shippingAddress?: {
    cep: string
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
  }
  trackingCode?: string
  items?: Array<{
    id: string
    name: string
    sku: string
    variant?: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  rawCreatedAt: string
}

interface ProductItem {
  id: string
  sku: string
  name: string
  category: string
  stock: number
  price: string
  priceNumeric: number
  promoPrice: string
  promoPriceNumeric?: number
  isHidden: boolean
  createdAt: number
}

const initialOrders: OrderItem[] = []

const initialProducts: ProductItem[] = []

interface DashboardPageProps {
  initialTab?: TabType
  onLogout?: () => void
  onNavigateToStore?: () => void
}

export function DashboardPage({
  initialTab = 'dashboard',
  onLogout,
  onNavigateToStore,
}: DashboardPageProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders)
  const [products, setProducts] = useState<ProductItem[]>(initialProducts)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null)
  const [trackingModalOrder, setTrackingModalOrder] = useState<OrderItem | null>(null)
  const [trackingInput, setTrackingInput] = useState('')
  const [isSavingTracking, setIsSavingTracking] = useState(false)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

  // Métricas dinâmicas calculadas a partir dos pedidos e produtos
  const pendingOrdersCount = orders.filter((o) => o.paymentStatus === 'aguardando').length
  const paidOrders = orders.filter((o) => o.paymentStatus === 'pago')
  const paidOrdersCount = paidOrders.length
  const totalRevenue = paidOrders.reduce((acc, order) => {
    const rawNum = parseFloat(order.total.replace(/[^\d,]/g, '').replace(',', '.')) || 0
    return acc + rawNum
  }, 0)
  const formattedRevenue = `R$ ${totalRevenue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
  const ticketMedio =
    paidOrdersCount > 0
      ? `R$ ${(totalRevenue / paidOrdersCount).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : 'R$ 0,00'
  const conversionRate =
    orders.length > 0
      ? `${((paidOrdersCount / orders.length) * 100).toFixed(1)}%`
      : '0.0%'

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Carregar produtos reais do Supabase
  useEffect(() => {
    let isMounted = true

    async function loadProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, categories(name)')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Erro ao carregar produtos no dashboard:', error)
          return
        }

        if (data && isMounted) {
          const mapped: ProductItem[] = data.map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.categories?.name || 'Eyewear',
            stock: p.stock,
            price: `R$ ${Number(p.price).toFixed(2).replace('.', ',')}`,
            priceNumeric: Number(p.price),
            promoPrice: p.promo_price ? `R$ ${Number(p.promo_price).toFixed(2).replace('.', ',')}` : '',
            promoPriceNumeric: p.promo_price ? Number(p.promo_price) : undefined,
            isHidden: p.visibility === 'oculto',
            createdAt: new Date(p.created_at).getTime(),
          }))
          setProducts(mapped)
        }
      } catch (err) {
        console.error('Falha ao buscar produtos no dashboard:', err)
      }
    }

    loadProducts()

    return () => {
      isMounted = false
    }
  }, [])

  // Carregar pedidos reais do Supabase
  const loadOrders = async () => {
    setIsLoadingOrders(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*),
          payments(*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar pedidos do Supabase:', error)
        return
      }

      if (data) {
        const mapped: OrderItem[] = data.map((o: any) => {
          const d = new Date(o.created_at)
          const dateStr = d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })

          let productsSummary = ''
          if (o.order_items && o.order_items.length > 0) {
            productsSummary = o.order_items
              .map((it: any) => `${it.quantity}x ${it.product_name || it.product_sku}`)
              .join(', ')
          } else {
            productsSummary = 'Nenhum item listado'
          }

          let pStatus: OrderItem['paymentStatus'] = 'aguardando'
          if (o.payment_status === 'pago' || o.payment_status === 'aprovado') pStatus = 'pago'
          else if (o.payment_status === 'cancelado') pStatus = 'cancelado'

          let sStatus: OrderItem['shippingStatus'] = 'pendente'
          if (o.shipping_status === 'embalado') sStatus = 'embalado'
          else if (o.shipping_status === 'enviado') sStatus = 'enviado'
          else if (o.shipping_status === 'cancelado') sStatus = 'cancelado'

          return {
            id: o.id,
            number: o.order_number,
            date: dateStr,
            clientName: o.customer_name || 'Cliente',
            clientEmail: o.customer_email || '',
            clientCpf: o.customer_cpf,
            clientPhone: o.customer_phone,
            total: `R$ ${Number(o.total_amount || 0).toFixed(2).replace('.', ',')}`,
            totalNumeric: Number(o.total_amount || 0),
            subtotalNumeric: Number(o.subtotal || 0),
            shippingCostNumeric: Number(o.shipping_cost || 0),
            discountAmountNumeric: Number(o.discount_amount || 0),
            products: productsSummary,
            paymentStatus: pStatus,
            shippingStatus: sStatus,
            paymentMethod: o.payment_method || o.payments?.[0]?.method || 'pix',
            shippingMethod: o.shipping_method || 'LEVER Standard Econômico',
            shippingAddress: {
              cep: o.shipping_cep || '',
              street: o.shipping_street || '',
              number: o.shipping_number || '',
              complement: o.shipping_complement || '',
              neighborhood: o.shipping_neighborhood || '',
              city: o.shipping_city || '',
              state: o.shipping_state || '',
            },
            trackingCode: o.tracking_code || '',
            items: (o.order_items || []).map((it: any) => ({
              id: it.id,
              name: it.product_name,
              sku: it.product_sku,
              variant: it.variant_info,
              quantity: it.quantity,
              unitPrice: Number(it.unit_price),
              totalPrice: Number(it.total_price),
            })),
            rawCreatedAt: o.created_at,
          }
        })
        setOrders(mapped)
      }
    } catch (err) {
      console.error('Falha geral ao carregar pedidos:', err)
    } finally {
      setIsLoadingOrders(false)
    }
  }

  // Carregar pedidos e escutar atualizações em tempo real
  useEffect(() => {
    loadOrders()

    const onOrdersUpdated = () => {
      loadOrders()
    }
    window.addEventListener('orders-updated', onOrdersUpdated)

    const channel = supabase
      .channel('orders-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders()
      })
      .subscribe()

    return () => {
      window.removeEventListener('orders-updated', onOrdersUpdated)
      supabase.removeChannel(channel)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      onLogout?.()
    }
  }

  // Estados de Filtros e Busca de Produtos
  const [productSearch, setProductSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('todos')
  const [productSort, setProductSort] = useState<
    'mais-novo' | 'mais-antigo' | 'maior-preco' | 'menor-preco'
  >('mais-novo')

  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null)
  const [openProductMenuId, setOpenProductMenuId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.order-action-container')) {
        setOpenMenuOrderId(null)
        setOpenProductMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current))
    }, 3000)
  }

  // Ações de Pedidos com persistência no Supabase
  const handleMarkAsPacked = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, shippingStatus: 'embalado' } : o))
    )
    const order = orders.find((o) => o.id === orderId)
    showToast(`Pedido ${order?.number || ''} marcado como embalado.`)
    setOpenMenuOrderId(null)

    try {
      await supabase
        .from('orders')
        .update({ shipping_status: 'embalado', updated_at: new Date().toISOString() })
        .eq('id', orderId)

      await supabase.from('order_tracking_events').insert({
        order_id: orderId,
        status_title: 'Pedido Embalado',
        description: 'Todos os itens foram cuidadosamente conferidos e embalados para despacho.',
      })
    } catch (err) {
      console.error('Erro ao atualizar status para embalado:', err)
    }
  }

  const handleMarkAsPaid = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'pago' } : o))
    )
    const order = orders.find((o) => o.id === orderId)
    showToast(`Pedido ${order?.number || ''} marcado como pago.`)
    setOpenMenuOrderId(null)

    try {
      await supabase
        .from('orders')
        .update({ payment_status: 'pago', updated_at: new Date().toISOString() })
        .eq('id', orderId)

      await supabase
        .from('payments')
        .update({ status: 'aprovado', updated_at: new Date().toISOString() })
        .eq('order_id', orderId)

      await supabase.from('order_tracking_events').insert({
        order_id: orderId,
        status_title: 'Pagamento Confirmado',
        description: 'Pagamento aprovado. O pedido entrou no fluxo de expedição.',
      })
    } catch (err) {
      console.error('Erro ao marcar pedido como pago:', err)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, paymentStatus: 'cancelado', shippingStatus: 'cancelado' }
          : o
      )
    )
    const order = orders.find((o) => o.id === orderId)
    showToast(`Pedido ${order?.number || ''} cancelado.`)
    setOpenMenuOrderId(null)

    try {
      await supabase
        .from('orders')
        .update({
          payment_status: 'cancelado',
          shipping_status: 'cancelado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      await supabase.from('order_tracking_events').insert({
        order_id: orderId,
        status_title: 'Pedido Cancelado',
        description: 'Pedido foi cancelado pela administração da loja.',
      })
    } catch (err) {
      console.error('Erro ao cancelar pedido:', err)
    }
  }

  const handleOpenTrackingModal = (order: OrderItem) => {
    setTrackingModalOrder(order)
    setTrackingInput(
      order.trackingCode ||
        `BR${order.number.replace(/\D/g, '')}${Math.floor(1000 + Math.random() * 9000)}BR`
    )
    setOpenMenuOrderId(null)
  }

  const handleSaveTrackingAndNotify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingModalOrder) return
    const orderId = trackingModalOrder.id
    const code = trackingInput.trim().toUpperCase()

    setIsSavingTracking(true)
    try {
      await supabase
        .from('orders')
        .update({
          shipping_status: 'enviado',
          tracking_code: code,
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      await supabase.from('order_tracking_events').insert({
        order_id: orderId,
        status_title: 'Objeto Postado / Em Trânsito',
        description: `Encomenda despachada pela transportadora com código de rastreamento: ${code}`,
        location: trackingModalOrder.shippingAddress?.city
          ? `${trackingModalOrder.shippingAddress.city}/${trackingModalOrder.shippingAddress.state}`
          : 'Centro de Distribuição LEVER',
      })

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, shippingStatus: 'enviado', trackingCode: code } : o
        )
      )

      showToast(`Código ${code} salvo e envio notificado com sucesso!`)
      setTrackingModalOrder(null)
    } catch (err) {
      console.error('Erro ao salvar código de rastreamento:', err)
      showToast('Erro ao salvar código de rastreamento.')
    } finally {
      setIsSavingTracking(false)
    }
  }

  // Ações de Produtos
  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId)
    setActiveTab('criar-produto')
    setOpenProductMenuId(null)
  }

  const handleDeleteProduct = async (productId: string) => {
    const prod = products.find((p) => p.id === productId)
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    setOpenProductMenuId(null)
    showToast(`Produto ${prod?.name || ''} excluído com sucesso.`)

    try {
      await supabase.from('products').delete().eq('id', productId)
    } catch (err) {
      console.error('Erro ao excluir no Supabase:', err)
    }
  }

  const handleToggleHideProduct = async (productId: string) => {
    let nowHidden = false
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          nowHidden = !p.isHidden
          return { ...p, isHidden: !p.isHidden }
        }
        return p
      })
    )
    setOpenProductMenuId(null)
    const prod = products.find((p) => p.id === productId)
    showToast(
      nowHidden
        ? `Produto ${prod?.sku || ''} ocultado da loja.`
        : `Produto ${prod?.sku || ''} agora está visível na loja.`
    )

    try {
      await supabase
        .from('products')
        .update({ visibility: nowHidden ? 'oculto' : 'visivel' })
        .eq('id', productId)
    } catch (err) {
      console.error('Erro ao alternar visibilidade no Supabase:', err)
    }
  }

  const handleDuplicateProduct = async (productId: string) => {
    const prod = products.find((p) => p.id === productId)
    if (!prod) return
    setOpenProductMenuId(null)
    showToast(`Duplicando produto "${prod.name}"...`)

    try {
      const { data: original, error: fetchErr } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          product_images(*),
          product_tags(*)
        `)
        .eq('id', productId)
        .single()

      if (fetchErr || !original) {
        console.error('Erro ao buscar produto original para duplicar:', fetchErr)
        const newSku = `${prod.sku}-COPY-${Math.floor(100 + Math.random() * 900)}`
        const { data: fallbackInserted } = await supabase
          .from('products')
          .insert({
            name: `${prod.name} (Cópia)`,
            sku: newSku,
            price: prod.priceNumeric,
            promo_price: prod.promoPriceNumeric || null,
            stock: prod.stock,
            visibility: prod.isHidden ? 'oculto' : 'visivel',
          })
          .select('*, categories(name)')
          .single()

        if (fallbackInserted) {
          const newProductItem: ProductItem = {
            id: fallbackInserted.id,
            sku: fallbackInserted.sku,
            name: fallbackInserted.name,
            category: fallbackInserted.categories?.name || prod.category,
            stock: fallbackInserted.stock,
            price: `R$ ${Number(fallbackInserted.price).toFixed(2).replace('.', ',')}`,
            priceNumeric: Number(fallbackInserted.price),
            promoPrice: fallbackInserted.promo_price
              ? `R$ ${Number(fallbackInserted.promo_price).toFixed(2).replace('.', ',')}`
              : '',
            promoPriceNumeric: fallbackInserted.promo_price
              ? Number(fallbackInserted.promo_price)
              : undefined,
            isHidden: fallbackInserted.visibility === 'oculto',
            createdAt: new Date(fallbackInserted.created_at).getTime(),
          }
          setProducts((prev) => [newProductItem, ...prev])
          showToast(`Produto duplicado e salvo com sucesso: ${newSku}`)
        }
        return
      }

      const newSku = `${original.sku}-COPY-${Math.floor(100 + Math.random() * 900)}`
      const { data: inserted, error: insertErr } = await supabase
        .from('products')
        .insert({
          name: `${original.name} (Cópia)`,
          sku: newSku,
          description: original.description,
          category_id: original.category_id,
          price: original.price,
          promo_price: original.promo_price,
          cost_price: original.cost_price,
          stock: original.stock,
          stock_location: original.stock_location,
          low_stock_alert: original.low_stock_alert,
          track_stock: original.track_stock,
          continue_selling_out_of_stock: original.continue_selling_out_of_stock,
          weight: original.weight,
          length: original.length,
          width: original.width,
          height: original.height,
          visibility: original.visibility,
          free_shipping: original.free_shipping,
          free_shipping_scope: original.free_shipping_scope,
          show_free_shipping_badge: original.show_free_shipping_badge,
        })
        .select('*, categories(name)')
        .single()

      if (insertErr || !inserted) {
        console.error('Erro ao duplicar produto no Supabase:', insertErr)
        showToast('Não foi possível duplicar o produto no banco de dados.')
        return
      }

      // Duplicar imagens associadas
      if (Array.isArray(original.product_images) && original.product_images.length > 0) {
        const imagesPayload = original.product_images.map((img: any, idx: number) => ({
          product_id: inserted.id,
          image_url: img.image_url,
          cf_key: img.cf_key || img.image_url?.split('/').pop() || `copy-img-${idx}`,
          is_cover: img.is_cover,
          sort_order: img.sort_order ?? idx,
        }))
        await supabase.from('product_images').insert(imagesPayload)
      }

      // Duplicar tags associadas
      if (Array.isArray(original.product_tags) && original.product_tags.length > 0) {
        const tagsPayload = original.product_tags.map((t: any) => ({
          product_id: inserted.id,
          tag_name: t.tag_name,
        }))
        await supabase.from('product_tags').insert(tagsPayload)
      }

      const newProductItem: ProductItem = {
        id: inserted.id,
        sku: inserted.sku,
        name: inserted.name,
        category: inserted.categories?.name || original.categories?.name || prod.category,
        stock: inserted.stock,
        price: `R$ ${Number(inserted.price).toFixed(2).replace('.', ',')}`,
        priceNumeric: Number(inserted.price),
        promoPrice: inserted.promo_price
          ? `R$ ${Number(inserted.promo_price).toFixed(2).replace('.', ',')}`
          : '',
        promoPriceNumeric: inserted.promo_price ? Number(inserted.promo_price) : undefined,
        isHidden: inserted.visibility === 'oculto',
        createdAt: new Date(inserted.created_at).getTime(),
      }

      setProducts((prev) => [newProductItem, ...prev])
      showToast(`Produto duplicado e salvo com sucesso: ${inserted.sku}`)
    } catch (err) {
      console.error('Falha geral ao duplicar produto:', err)
      showToast('Erro ao duplicar o produto.')
    }
  }

  const renderPaymentBadge = (status: OrderItem['paymentStatus']) => {
    switch (status) {
      case 'pago':
        return <span className="order-badge paid">Pago</span>
      case 'aguardando':
        return <span className="order-badge awaiting">Aguardando pagamento</span>
      case 'cancelado':
        return <span className="order-badge cancelled">Cancelado</span>
    }
  }

  const renderShippingBadge = (status: OrderItem['shippingStatus']) => {
    switch (status) {
      case 'embalado':
        return <span className="order-badge packed">Embalado</span>
      case 'enviado':
        return <span className="order-badge shipped">Enviado</span>
      case 'cancelado':
        return <span className="order-badge cancelled">Cancelado</span>
      case 'pendente':
      default:
        return <span className="order-badge pending">Pendente</span>
    }
  }

  // Filtragem e Ordenação dos Produtos
  const filteredProducts = products
    .filter((product) => {
      const query = productSearch.trim().toLowerCase()
      const matchesSearch =
        query === '' ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)

      const matchesCategory =
        categoryFilter === 'todos' || product.category === categoryFilter

      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      const getEffectivePrice = (item: ProductItem) =>
        item.promoPriceNumeric ?? item.priceNumeric

      switch (productSort) {
        case 'mais-novo':
          return b.createdAt - a.createdAt
        case 'mais-antigo':
          return a.createdAt - b.createdAt
        case 'maior-preco':
          return getEffectivePrice(b) - getEffectivePrice(a)
        case 'menor-preco':
          return getEffectivePrice(a) - getEffectivePrice(b)
        default:
          return 0
      }
    })

  const isProductFiltered =
    productSearch !== '' || categoryFilter !== 'todos' || productSort !== 'mais-novo'

  return (
    <div className="dashboard-layout">
      {/* Menu Lateral */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          <img
            src="/lever-logo-cropped.png"
            alt="LEVER"
            className="dashboard-sidebar-logo"
          />
        </div>

        <nav className="dashboard-sidebar-nav">
          <button
            type="button"
            className={`dashboard-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <svg
              className="dashboard-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </button>

          <button
            type="button"
            className={`dashboard-nav-item ${activeTab === 'pedidos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pedidos')}
          >
            <svg
              className="dashboard-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Pedidos
          </button>

          <button
            type="button"
            className={`dashboard-nav-item ${
              activeTab === 'produtos' || activeTab === 'criar-produto' ? 'active' : ''
            }`}
            onClick={() => {
              setEditingProductId(null)
              setActiveTab('produtos')
            }}
          >
            <svg
              className="dashboard-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Produtos
          </button>

          <button
            type="button"
            className={`dashboard-nav-item ${activeTab === 'frete' ? 'active' : ''}`}
            onClick={() => setActiveTab('frete')}
          >
            <svg
              className="dashboard-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Frete
          </button>

          <button
            type="button"
            className={`dashboard-nav-item ${activeTab === 'cupom' ? 'active' : ''}`}
            onClick={() => setActiveTab('cupom')}
          >
            <svg
              className="dashboard-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
              <line x1="13" y1="5" x2="13" y2="19" strokeDasharray="2 2" />
            </svg>
            Cupom
          </button>

          <button
            type="button"
            className={`dashboard-nav-item ${activeTab === 'carrossel-vitrine' ? 'active' : ''}`}
            onClick={() => setActiveTab('carrossel-vitrine')}
            style={{ fontWeight: 400 }}
          >
            <svg
              className="dashboard-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
            Carrossel Vitrine
          </button>
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {onNavigateToStore && (
            <button
              type="button"
              className="dashboard-nav-item"
              onClick={onNavigateToStore}
              style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem', color: '#4b5563', borderRadius: '6px' }}
            >
              <svg
                className="dashboard-nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Ver Loja
            </button>
          )}

          <button
            type="button"
            className="dashboard-nav-item"
            onClick={handleLogout}
            style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem', color: '#ef4444', borderRadius: '6px' }}
          >
            <svg
              className="dashboard-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {/* Área Principal de Conteúdo */}
      <main className="dashboard-content-area">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <>
            <header className="dashboard-topbar">
              <h1 className="dashboard-page-title">Dashboard</h1>
            </header>

            <div className="dashboard-container">
              <div className="dashboard-cards-grid">
                {/* 1. Pedidos aguardando pagamento */}
                <div className="dashboard-card">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-label">Pedidos aguardando pagamento</span>
                    <svg
                      className="dashboard-card-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div className="dashboard-card-body">
                    <span className="dashboard-card-value">{pendingOrdersCount}</span>
                    <span className="dashboard-card-footer pending">
                      Aguardando confirmação Pix / Boleto
                    </span>
                  </div>
                </div>

                {/* 2. Pedidos pagos */}
                <div className="dashboard-card">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-label">Pedidos pagos</span>
                    <svg
                      className="dashboard-card-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className="dashboard-card-body">
                    <span className="dashboard-card-value">{paidOrdersCount}</span>
                    <span className="dashboard-card-footer positive">
                      Aprovados hoje
                    </span>
                  </div>
                </div>

                {/* 3. Vendas pagas R$ */}
                <div className="dashboard-card">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-label">Vendas pagas R$</span>
                    <svg
                      className="dashboard-card-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div className="dashboard-card-body">
                    <span className="dashboard-card-value">{formattedRevenue}</span>
                    <span className="dashboard-card-footer positive">
                      Total liquidado
                    </span>
                  </div>
                </div>

                {/* 4. Ticket médio */}
                <div className="dashboard-card">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-label">Ticket médio</span>
                    <svg
                      className="dashboard-card-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <div className="dashboard-card-body">
                    <span className="dashboard-card-value">{ticketMedio}</span>
                    <span className="dashboard-card-footer">
                      Média por pedido aprovado
                    </span>
                  </div>
                </div>

                {/* 5. Carrinhos */}
                <div className="dashboard-card">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-label">Carrinhos</span>
                    <svg
                      className="dashboard-card-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  </div>
                  <div className="dashboard-card-body">
                    <span className="dashboard-card-value">0</span>
                    <span className="dashboard-card-footer">
                      Iniciados nas últimas 24h
                    </span>
                  </div>
                </div>

                {/* 6. Taxa de conversão */}
                <div className="dashboard-card">
                  <div className="dashboard-card-header">
                    <span className="dashboard-card-label">Taxa de conversão</span>
                    <svg
                      className="dashboard-card-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M16 12l-4-4-4 4" />
                      <path d="M12 16V8" />
                    </svg>
                  </div>
                  <div className="dashboard-card-body">
                    <span className="dashboard-card-value">{conversionRate}</span>
                    <span className="dashboard-card-footer positive">
                      Visitas para checkout concluído
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: PEDIDOS */}
        {activeTab === 'pedidos' && (
          <>
            <header className="dashboard-topbar">
              <h1 className="dashboard-page-title">Pedidos</h1>
            </header>

            <div className="dashboard-container">
              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>N° pedido</th>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th>Total</th>
                      <th>Produtos</th>
                      <th>Pagamento</th>
                      <th>Envio</th>
                      <th style={{ textAlign: 'right' }}>Botão de ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingOrders ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: '#6b7280',
                            fontWeight: 400,
                          }}
                        >
                          Carregando pedidos do Supabase...
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: 'center',
                            padding: '3.5rem 1rem',
                            color: '#6b7280',
                            fontWeight: 400,
                          }}
                        >
                          Nenhum pedido registrado no momento.
                        </td>
                      </tr>
                    ) : (
                      orders.map((order, index) => {
                      const isMenuOpen = openMenuOrderId === order.id
                      const isNearBottom = orders.length > 3 && index >= orders.length - 2

                      return (
                        <tr key={order.id} style={{ position: 'relative', zIndex: isMenuOpen ? 50 : 1 }}>
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setViewingOrderId(order.id)
                                setActiveTab('detalhes-pedido')
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: '#000000',
                                fontWeight: 600,
                                textDecoration: 'underline',
                                textUnderlineOffset: '3px',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: '0.84rem',
                              }}
                              title="Clique para abrir a página completa do pedido"
                            >
                              {order.number}
                            </button>
                          </td>
                          <td>{order.date}</td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 500 }}>{order.clientName}</div>
                              <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                                {order.clientEmail}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{order.total}</td>
                          <td style={{ maxWidth: '280px', whiteSpace: 'normal', lineHeight: '1.4' }}>
                            {order.products}
                          </td>
                          <td>{renderPaymentBadge(order.paymentStatus)}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {renderShippingBadge(order.shippingStatus)}
                              {order.trackingCode && (
                                <span style={{ fontSize: '0.7rem', color: '#4b5563', fontFamily: 'monospace' }}>
                                  {order.trackingCode}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="order-action-container" style={{ zIndex: isMenuOpen ? 100 : 'auto' }}>
                              <button
                                type="button"
                                className="order-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMenuOrderId(isMenuOpen ? null : order.id)
                                }}
                              >
                                Ações
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>

                              {isMenuOpen && (
                                <div
                                  className={`order-action-menu ${
                                    isNearBottom ? 'dropdown-up' : ''
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="order-action-item"
                                    onClick={() => {
                                      setViewingOrderId(order.id)
                                      setActiveTab('detalhes-pedido')
                                      setOpenMenuOrderId(null)
                                    }}
                                  >
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
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                      <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    ver pedido completo
                                  </button>

                                  <button
                                    type="button"
                                    className="order-action-item"
                                    onClick={() => handleMarkAsPacked(order.id)}
                                  >
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
                                      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
                                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                      <line x1="12" y1="22.08" x2="12" y2="12" />
                                    </svg>
                                    marcar como embalado
                                  </button>

                                  <button
                                    type="button"
                                    className="order-action-item"
                                    onClick={() => handleMarkAsPaid(order.id)}
                                  >
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
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                    marcar como pago
                                  </button>

                                  <button
                                    type="button"
                                    className="order-action-item"
                                    onClick={() => handleOpenTrackingModal(order)}
                                  >
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
                                      <line x1="22" y1="2" x2="11" y2="13" />
                                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    informar rastreio
                                  </button>

                                  <button
                                    type="button"
                                    className="order-action-item danger"
                                    onClick={() => handleCancelOrder(order.id)}
                                  >
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
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="15" y1="9" x2="9" y2="15" />
                                      <line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                    cancelar
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 3: PRODUTOS */}
        {activeTab === 'produtos' && (
          <>
            <header className="dashboard-topbar">
              <h1 className="dashboard-page-title">Produtos</h1>
            </header>

            <div className="dashboard-container">
              {/* Barra de Pesquisa e Filtros */}
              <div className="dashboard-filter-bar">
                <div className="dashboard-search-container">
                  <svg
                    className="dashboard-search-icon"
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
                    className="dashboard-search-input"
                    placeholder="Buscar por nome ou SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  {productSearch && (
                    <button
                      type="button"
                      className="dashboard-search-clear"
                      onClick={() => setProductSearch('')}
                      title="Limpar pesquisa"
                    >
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
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="dashboard-filter-group">
                  {/* Filtro de Categoria */}
                  <div className="dashboard-filter-select-wrapper">
                    <select
                      className="dashboard-filter-select"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="todos">Todas as categorias</option>
                      <option value="Eyewear">Eyewear</option>
                      <option value="Roupas">Roupas</option>
                      <option value="Acessórios">Acessórios</option>
                    </select>
                    <svg
                      className="dashboard-select-arrow"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {/* Filtros de Ordenação: mais novo, mais antigo, maior preço, menor preço */}
                  <div className="dashboard-filter-select-wrapper">
                    <select
                      className="dashboard-filter-select"
                      value={productSort}
                      onChange={(e) =>
                        setProductSort(
                          e.target.value as
                            | 'mais-novo'
                            | 'mais-antigo'
                            | 'maior-preco'
                            | 'menor-preco'
                        )
                      }
                    >
                      <option value="mais-novo">Mais novo</option>
                      <option value="mais-antigo">Mais antigo</option>
                      <option value="maior-preco">Maior preço</option>
                      <option value="menor-preco">Menor preço</option>
                    </select>
                    <svg
                      className="dashboard-select-arrow"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {/* Botão para limpar filtros */}
                  {isProductFiltered && (
                    <button
                      type="button"
                      className="dashboard-filter-reset"
                      onClick={() => {
                        setProductSearch('')
                        setCategoryFilter('todos')
                        setProductSort('mais-novo')
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Limpar filtros
                    </button>
                  )}

                  <span className="dashboard-filter-count">
                    {filteredProducts.length}{' '}
                    {filteredProducts.length === 1 ? 'produto' : 'produtos'}
                  </span>

                  {/* Botão Adicionar Produto */}
                  <button
                    type="button"
                    className="dashboard-add-product-btn"
                    onClick={() => {
                      setEditingProductId(null)
                      setActiveTab('criar-produto')
                    }}
                  >
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
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Adicionar produto
                  </button>
                </div>
              </div>

              {/* Tabela de Produtos */}
              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>sku</th>
                      <th>Nome do produto</th>
                      <th>estoque</th>
                      <th>preço</th>
                      <th>preço promocional</th>
                      <th style={{ textAlign: 'right' }}>Botão de ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#6b7280' }}>
                          Nenhum produto encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product, index) => {
                        const isMenuOpen = openProductMenuId === product.id
                        const isNearBottom = filteredProducts.length > 3 && index >= filteredProducts.length - 2

                        return (
                          <tr
                            key={product.id}
                            onClick={() => handleEditProduct(product.id)}
                            style={{
                              cursor: 'pointer',
                              position: 'relative',
                              zIndex: isMenuOpen ? 50 : 1,
                            }}
                            title="Clique para editar este produto"
                          >
                            <td>
                              <span style={{ color: '#4b5563', fontSize: '0.8rem', letterSpacing: '0.04em' }}>
                                {product.sku}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ color: product.isHidden ? '#6b7280' : '#111111' }}>
                                  {product.name}
                                </span>
                                {product.isHidden && (
                                  <span className="order-badge awaiting">
                                    Oculto da loja
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span>{product.stock} un</span>
                                {product.stock === 0 && (
                                  <span className="order-badge cancelled">
                                    Esgotado
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  color: product.promoPrice ? '#9ca3af' : '#111111',
                                  textDecoration: product.promoPrice ? 'line-through' : 'none',
                                }}
                              >
                                {product.price}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: product.promoPrice ? '#111111' : '#6b7280' }}>
                                {product.promoPrice || '—'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="order-action-container" style={{ zIndex: isMenuOpen ? 100 : 'auto' }}>
                                <button
                                  type="button"
                                  className="order-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenProductMenuId(isMenuOpen ? null : product.id)
                                  }}
                                >
                                  Ações
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </button>

                                {isMenuOpen && (
                                  <div
                                    className={`order-action-menu ${
                                      isNearBottom ? 'dropdown-up' : ''
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      className="order-action-item"
                                      onClick={() => handleEditProduct(product.id)}
                                      style={{ fontWeight: 400 }}
                                    >
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
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                      editar produto
                                    </button>

                                    <button
                                      type="button"
                                      className="order-action-item"
                                      onClick={() => {
                                        try {
                                          sessionStorage.setItem('lever_selected_product_id', product.id)
                                        } catch (_) {}
                                        window.open(`#produto?id=${product.id}`, '_blank')
                                        setOpenProductMenuId(null)
                                      }}
                                      style={{ fontWeight: 400 }}
                                    >
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
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                      </svg>
                                      ver na loja
                                    </button>

                                    <button
                                      type="button"
                                      className="order-action-item"
                                      onClick={() => handleToggleHideProduct(product.id)}
                                      style={{ fontWeight: 400 }}
                                    >
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
                                        {product.isHidden ? (
                                          <>
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                          </>
                                        ) : (
                                          <>
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                          </>
                                        )}
                                      </svg>
                                      {product.isHidden ? 'exibir na loja' : 'ocultar da loja'}
                                    </button>

                                    <button
                                      type="button"
                                      className="order-action-item"
                                      onClick={() => handleDuplicateProduct(product.id)}
                                      style={{ fontWeight: 400 }}
                                    >
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
                                        <rect x="9" y="9" width="13" height="13" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                      </svg>
                                      duplicar
                                    </button>

                                    <button
                                      type="button"
                                      className="order-action-item danger"
                                      onClick={() => handleDeleteProduct(product.id)}
                                      style={{ fontWeight: 400 }}
                                    >
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
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                      </svg>
                                      excluir
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 4: CRIAR OU EDITAR PRODUTO */}
        {activeTab === 'criar-produto' && (
          <CriarProdutoPage
            editProductId={editingProductId}
            onBack={() => {
              setEditingProductId(null)
              setActiveTab('produtos')
            }}
            onSave={(newProdData: NewProductData) => {
              const newProductItem: ProductItem = {
                id: newProdData.id,
                sku: newProdData.sku,
                name: newProdData.name,
                category: newProdData.category,
                stock: newProdData.stock,
                price: newProdData.price,
                priceNumeric: newProdData.priceNumeric,
                promoPrice: newProdData.promoPrice,
                promoPriceNumeric: newProdData.promoPriceNumeric,
                isHidden: newProdData.visibility === 'oculto',
                createdAt: newProdData.createdAt,
              }
              setProducts((prev) => {
                const exists = prev.some((p) => p.id === newProductItem.id)
                if (exists) {
                  return prev.map((p) => (p.id === newProductItem.id ? newProductItem : p))
                }
                return [newProductItem, ...prev]
              })
              showToast(
                editingProductId
                  ? `Produto "${newProdData.name}" atualizado com sucesso!`
                  : `Produto "${newProdData.name}" criado com sucesso!`
              )
              setEditingProductId(null)
              setActiveTab('produtos')
            }}
          />
        )}

        {/* TAB 5: FRETE */}
        {activeTab === 'frete' && (
          <CriarFretePage onBack={() => setActiveTab('dashboard')} />
        )}

        {/* TAB 6: CUPOM */}
        {activeTab === 'cupom' && (
          <CriarCupomPage onBack={() => setActiveTab('dashboard')} />
        )}

        {/* TAB 7: CARROSSEL VITRINE */}
        {activeTab === 'carrossel-vitrine' && (
          <CarrosselVitrinePage
            onBack={() => setActiveTab('dashboard')}
            onNavigateToStore={onNavigateToStore}
          />
        )}

        {/* TAB 8: PÁGINA COMPLETA DE DETALHES DO PEDIDO */}
        {activeTab === 'detalhes-pedido' && viewingOrderId && (
          <DetalhesPedidoPage
            orderId={viewingOrderId}
            onBack={() => {
              setViewingOrderId(null)
              setActiveTab('pedidos')
              loadOrders()
            }}
            onNavigateToTracking={() => {
              window.location.hash = 'rastreio'
            }}
          />
        )}
      </main>

      {/* Modal: Atualizar Código de Rastreamento */}
      {trackingModalOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setTrackingModalOrder(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: '460px',
              padding: '1.75rem',
              border: '1px solid #111111',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 700 }}>
              Informar Código de Rastreio
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.84rem', color: '#6b7280' }}>
              Pedido <strong>{trackingModalOrder.number}</strong> ({trackingModalOrder.clientName})
            </p>

            <form onSubmit={handleSaveTrackingAndNotify}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="modalTrackingCode"
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                    marginBottom: '0.4rem',
                  }}
                >
                  Código de Rastreio (Correios / Transportadora):
                </label>
                <input
                  id="modalTrackingCode"
                  type="text"
                  required
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                  placeholder="Ex: BR123456789BR"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    border: '1px solid #111111',
                    borderRadius: 0,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: '#6b7280', display: 'block', marginTop: '0.35rem' }}>
                  Ao salvar, o status do pedido mudará para <strong>ENVIADO</strong> e o cliente poderá rastrear.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setTrackingModalOrder(null)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    padding: '0.55rem 0.9rem',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingTracking}
                  style={{
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.1rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSavingTracking ? 'Salvando...' : 'Salvar e Notificar Envio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
