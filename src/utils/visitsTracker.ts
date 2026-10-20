import { supabase } from '../lib/supabase'

export interface VisitEvent {
  id: string
  created_at: string
  page_path: string
  visitor_id?: string
  session_id?: string
}

// Identificadores únicos persistentes para o visitante e sessão
function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let visitorId = localStorage.getItem('lever_visitor_id')
    if (!visitorId) {
      visitorId = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem('lever_visitor_id', visitorId)
    }
    return visitorId
  } catch (_) {
    return `vis_${Date.now()}`
  }
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let sessionId = sessionStorage.getItem('lever_session_id')
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      sessionStorage.setItem('lever_session_id', sessionId)
    }
    return sessionId
  } catch (_) {
    return `sess_${Date.now()}`
  }
}

// Previne duplicações em re-renderizações consecutivas dentro de 3 segundos
let lastRecordedPath = ''
let lastRecordedTime = 0

/**
 * Registra uma visita real no banco de dados Supabase na tabela public.site_visits
 */
export async function recordStoreVisit(path: string = '/') {
  if (typeof window === 'undefined') return

  const now = Date.now()
  if (lastRecordedPath === path && now - lastRecordedTime < 3000) {
    return
  }

  lastRecordedPath = path
  lastRecordedTime = now

  try {
    const visitor_id = getOrCreateVisitorId()
    const session_id = getOrCreateSessionId()
    const referrer = typeof document !== 'undefined' ? document.referrer || 'Direto' : 'Direto'
    const user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

    await supabase.from('site_visits').insert({
      page_path: path,
      visitor_id,
      session_id,
      referrer,
      user_agent,
    })
  } catch (err) {
    console.error('Erro ao registrar visita real no Supabase:', err)
  }
}

/**
 * Carrega a contagem de visitas reais registradas no banco de dados Supabase
 */
export async function fetchStoreVisitsFromSupabase(): Promise<VisitEvent[]> {
  try {
    const { data, error } = await supabase
      .from('site_visits')
      .select('id, created_at, page_path, visitor_id, session_id')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar visitas no Supabase:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      page_path: row.page_path,
      visitor_id: row.visitor_id,
      session_id: row.session_id,
    }))
  } catch (err) {
    console.error('Falha ao consultar visitas do banco de dados:', err)
    return []
  }
}

export interface CartEvent {
  id: string
  created_at: string
  session_id?: string
  visitor_id?: string
  product_id?: string
  product_name?: string
  product_price?: number
  action?: string
}

/**
 * Registra a adição de um produto ao carrinho no Supabase
 */
export async function recordCartAddEvent(
  productId: string | number,
  productName: string,
  price: number
) {
  if (typeof window === 'undefined') return
  try {
    const visitor_id = getOrCreateVisitorId()
    const session_id = getOrCreateSessionId()

    await supabase.from('cart_events').insert({
      session_id,
      visitor_id,
      product_id: String(productId),
      product_name: productName,
      product_price: price,
      action: 'add',
    })
  } catch (err) {
    console.error('Erro ao registrar evento de carrinho no Supabase:', err)
  }
}

/**
 * Carrega eventos de carrinho do banco de dados Supabase
 */
export async function fetchCartEventsFromSupabase(): Promise<CartEvent[]> {
  try {
    const { data, error } = await supabase
      .from('cart_events')
      .select('id, created_at, session_id, visitor_id, product_id, product_name, product_price, action')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar eventos de carrinho no Supabase:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Falha ao consultar eventos de carrinho:', err)
    return []
  }
}

