import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface CartItem {
  id: number | string
  name: string
  price: number
  priceFormatted: string
  installments?: string
  image?: string
  tag?: string
  variant?: string
  quantity: number
}

export interface AppliedCoupon {
  code: string
  discountPercent?: number
  discountFixed?: number
  description: string
}

export interface ShippingOption {
  id: string
  name: string
  price: number
  deadline: string
}

interface CartContextType {
  items: CartItem[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeItem: (id: number | string) => void
  updateQuantity: (id: number | string, qty: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
  freeShippingThreshold: number
  freeShippingRemaining: number
  freeShippingProgress: number
  hasFreeShipping: boolean
  appliedCoupon: AppliedCoupon | null
  applyCoupon: (code: string) => { success: boolean; message: string }
  removeCoupon: () => void
  shippingCep: string
  setShippingCep: (cep: string) => void
  selectedShipping: ShippingOption | null
  setSelectedShipping: (option: ShippingOption | null) => void
  discountAmount: number
  shippingCost: number
  finalTotal: number
  justAddedItemId: number | string | null
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const STORAGE_KEY = 'lever_cart_items'
const FREE_SHIPPING_THRESHOLD = 199.90

export const AVAILABLE_COUPONS: Record<string, { percent?: number; fixed?: number; desc: string }> = {
  LEVER10: { percent: 10, desc: '10% de desconto na sua compra' },
  LEVER20: { percent: 20, desc: '20% de desconto exclusivo' },
  PRIMEIRACOMPRA: { fixed: 25, desc: 'R$ 25,00 OFF de boas-vindas' },
  FRETEGRATIS: { percent: 0, desc: 'Frete Grátis LEVER' },
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 101,
        name: 'Óculos de Sol LEVER Blackout Acetato UV400',
        price: 149.90,
        priceFormatted: 'R$ 149,90',
        installments: '6x de R$ 24,98 sem juros',
        tag: 'Destaque',
        variant: 'Acetato Preto Fosco • Lente UV400',
        quantity: 1,
      },
    ]
  })

  const [isOpen, setIsOpen] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [shippingCep, setShippingCep] = useState('')
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null)
  const [justAddedItemId, setJustAddedItemId] = useState<number | string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore
    }
  }, [items])

  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)
  const toggleCart = () => setIsOpen((prev) => !prev)

  const addItem = (newItem: Omit<CartItem, 'quantity'>, qty = 1) => {
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((it) => it.id === newItem.id)
      if (existingIndex > -1) {
        const copy = [...prevItems]
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: copy[existingIndex].quantity + qty,
        }
        return copy
      }
      return [
        ...prevItems,
        {
          ...newItem,
          quantity: qty,
        },
      ]
    })

    setJustAddedItemId(newItem.id)
    setTimeout(() => {
      setJustAddedItemId(null)
    }, 1800)

    setIsOpen(true)
  }

  const removeItem = (id: number | string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const updateQuantity = (id: number | string, qty: number) => {
    if (qty <= 0) {
      removeItem(id)
      return
    }
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: qty } : it))
    )
  }

  const clearCart = () => {
    setItems([])
    setAppliedCoupon(null)
    setSelectedShipping(null)
  }

  const totalItems = items.reduce((acc, it) => acc + it.quantity, 0)
  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0)

  const hasFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD || appliedCoupon?.code === 'FRETEGRATIS'
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)

  const applyCoupon = (code: string) => {
    const normalized = code.trim().toUpperCase()
    const found = AVAILABLE_COUPONS[normalized]

    if (found) {
      setAppliedCoupon({
        code: normalized,
        discountPercent: found.percent,
        discountFixed: found.fixed,
        description: found.desc,
      })
      return { success: true, message: `Cupom ${normalized} aplicado!` }
    }

    return {
      success: false,
      message: 'Cupom inválido. Tente LEVER10 ou PRIMEIRACOMPRA.',
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
  }

  let discountAmount = 0
  if (appliedCoupon) {
    if (appliedCoupon.discountPercent) {
      discountAmount = (subtotal * appliedCoupon.discountPercent) / 100
    } else if (appliedCoupon.discountFixed) {
      discountAmount = Math.min(subtotal, appliedCoupon.discountFixed)
    }
  }

  let shippingCost = 0
  if (selectedShipping) {
    shippingCost = hasFreeShipping && selectedShipping.id === 'standard' ? 0 : selectedShipping.price
  }

  const finalTotal = Math.max(0, subtotal - discountAmount + shippingCost)

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        freeShippingRemaining,
        freeShippingProgress,
        hasFreeShipping,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        shippingCep,
        setShippingCep,
        selectedShipping,
        setSelectedShipping,
        discountAmount,
        shippingCost,
        finalTotal,
        justAddedItemId,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export function formatBRL(amount: number): string {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function parsePriceToNumber(priceStr: string): number {
  if (!priceStr) return 0
  const clean = priceStr.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(clean) || 0
}
