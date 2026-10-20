import { useState, useEffect } from 'react'
import { useCart, formatBRL } from '../context/CartContext'

interface CartDrawerProps {
  onNavigateToCatalog?: () => void
  onNavigateToCheckout?: () => void
}

export function CartDrawer({ onNavigateToCatalog, onNavigateToCheckout }: CartDrawerProps) {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    totalItems,
    subtotal,
    freeShippingRemaining,
    freeShippingProgress,
    hasFreeShipping,
    justAddedItemId,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    discountAmount,
  } = useCart()

  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null)
  const [showCouponInput, setShowCouponInput] = useState(false)

  const handleDrawerApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponMsg(null)
    try {
      const res = await applyCoupon(couponInput)
      if (res.success) {
        setCouponMsg({ text: res.message, isError: false })
        setCouponInput('')
      } else {
        setCouponMsg({ text: res.message, isError: true })
      }
    } catch {
      setCouponMsg({ text: 'Erro ao validar cupom.', isError: true })
    } finally {
      setCouponLoading(false)
    }
  }

  // Bloqueio de scroll do body e atalho ESC
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCart()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, closeCart])

  const handleStartCheckout = () => {
    closeCart()
    if (onNavigateToCheckout) {
      onNavigateToCheckout()
    } else {
      window.location.hash = 'checkout'
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="cart-drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeCart()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Carrinho de Compras"
    >
      <div className="cart-drawer-panel">
        {/* Cabeçalho do Carrinho */}
        <div className="cart-header">
          <div className="cart-title-wrapper">
            <span className="cart-title">SEU CARRINHO</span>
            <span className="cart-count-badge">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </span>
          </div>

          <button
            type="button"
            className="cart-close-btn"
            onClick={closeCart}
            aria-label="Fechar carrinho"
            id="close-cart-btn"
          >
            <svg
              width="20"
              height="20"
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
        </div>

        {/* Barra de Progresso de Frete Grátis */}
        <div className="cart-shipping-meter-bar">
          <div className="shipping-meter-header">
            <div className="shipping-meter-icon">
              {hasFreeShipping ? (
                <svg
                  width="18"
                  height="18"
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
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              )}
            </div>

            <p className="shipping-meter-text">
              {hasFreeShipping ? (
                <span>
                  PARABÉNS! VOCÊ GANHOU <strong>FRETE GRÁTIS</strong>!
                </span>
              ) : (
                <span>
                  Faltam <strong>{formatBRL(freeShippingRemaining)}</strong> para você garantir{' '}
                  <strong>FRETE GRÁTIS</strong>
                </span>
              )}
            </p>
          </div>

          <div className="shipping-progress-track">
            <div
              className={`shipping-progress-fill ${hasFreeShipping ? 'is-complete' : ''}`}
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Corpo do Carrinho */}
        <div className="cart-body">
          {items.length === 0 ? (
            /* Estado Vazio */
            <div className="cart-empty-state">
              <div className="cart-empty-icon-wrap">
                <svg
                  width="54"
                  height="54"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>

              <h2 className="cart-empty-title">SEU CARRINHO ESTÁ VAZIO</h2>
              <p className="cart-empty-desc">
                Você ainda não adicionou nenhum produto ao seu carrinho.
              </p>

              {/* Botão de Ação */}
              <button
                type="button"
                className="cart-explore-btn"
                onClick={() => {
                  closeCart()
                  if (onNavigateToCatalog) onNavigateToCatalog()
                }}
              >
                EXPLORAR COLEÇÃO
              </button>
            </div>
          ) : (
            /* Lista de Itens do Carrinho */
            <div className="cart-items-wrapper">
              <div className="cart-items-list">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className={`cart-item-card ${justAddedItemId === item.id ? 'just-added' : ''}`}
                  >
                    {/* Imagem do Produto */}
                    <div className="cart-item-image">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="cart-item-placeholder">
                          <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="6.5" cy="14.5" r="3.5" />
                            <circle cx="17.5" cy="14.5" r="3.5" />
                            <path d="M3 11h3l2 4h8l2-4h3" />
                            <path d="M10 14.5a2.5 2.5 0 0 1 4 0" />
                          </svg>
                        </div>
                      )}
                      {item.tag && <span className="cart-item-tag">{item.tag}</span>}
                    </div>

                    {/* Dados do Produto */}
                    <div className="cart-item-details">
                      <div className="cart-item-top-row">
                        <div className="cart-item-heading">
                          <h3 className="cart-item-name">{item.name}</h3>
                          {item.variant && (
                            <span className="cart-item-variant">{item.variant}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="cart-item-remove-btn"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remover ${item.name} do carrinho`}
                          title="Remover produto"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>

                      {/* Preço Unitário */}
                      <div className="cart-item-unit-price">
                        <span className="unit-label">Preço:</span>
                        <span className="unit-val">{formatBRL(item.price)}</span>
                      </div>

                      {/* Rodapé do Item: Stepper de Quantidade e Subtotal */}
                      <div className="cart-item-actions-row">
                        <div className="cart-stepper">
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label="Diminuir quantidade"
                          >
                            −
                          </button>
                          <span className="stepper-value">{item.quantity}</span>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Aumentar quantidade"
                          >
                            +
                          </button>
                        </div>

                        <div className="cart-item-subtotal">
                          <span className="subtotal-label">Total:</span>
                          <span className="subtotal-amount">
                            {formatBRL(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo do Carrinho (Resumo e Botão de Checkout) */}
        {items.length > 0 && (
          <div className="cart-footer">
            {/* Seletor de cupom no Drawer */}
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
              }}
            >
              {appliedCoupon ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#166534',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    <strong>{appliedCoupon.code}</strong>
                    <span>({appliedCoupon.description})</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Remover
                  </button>
                </div>
              ) : !showCouponInput ? (
                <button
                  type="button"
                  onClick={() => setShowCouponInput(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#4b5563',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    textDecoration: 'underline',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  Possui cupom de desconto?
                </button>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <input
                      type="text"
                      placeholder="Código do cupom"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleDrawerApplyCoupon()
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.78rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                      }}
                    />
                    <button
                      type="button"
                      disabled={couponLoading || !couponInput.trim()}
                      onClick={handleDrawerApplyCoupon}
                      style={{
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        backgroundColor: '#111111',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: couponLoading || !couponInput.trim() ? 'not-allowed' : 'pointer',
                        opacity: couponLoading || !couponInput.trim() ? 0.6 : 1,
                      }}
                    >
                      {couponLoading ? '...' : 'Aplicar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCouponInput(false)
                        setCouponMsg(null)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {couponMsg && (
                    <div
                      style={{
                        fontSize: '0.72rem',
                        marginTop: '0.25rem',
                        color: couponMsg.isError ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {couponMsg.text}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="cart-summary-breakdown">
              <div className="summary-row">
                <span className="summary-label">Subtotal</span>
                <span className="summary-val">{formatBRL(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="summary-row" style={{ color: '#16a34a' }}>
                  <span className="summary-label" style={{ color: '#16a34a' }}>
                    Desconto ({appliedCoupon?.code})
                  </span>
                  <span className="summary-val">- {formatBRL(discountAmount)}</span>
                </div>
              )}

              <div className="summary-row">
                <span className="summary-label">Frete</span>
                <span className="summary-val">
                  {hasFreeShipping ? (
                    <strong className="free-tag">GRÁTIS</strong>
                  ) : (
                    <span className="calculate-prompt">Calculado no checkout</span>
                  )}
                </span>
              </div>

              <div className="summary-divider" />

              <div className="summary-row total-row">
                <div className="total-label-wrap">
                  <span className="total-label">TOTAL</span>
                  <span className="total-tax-note">Taxas e impostos inclusos</span>
                </div>
                <div className="total-amount-wrap">
                  <span className="total-amount">{formatBRL(Math.max(0, subtotal - discountAmount))}</span>
                  <span className="total-installments">
                    ou até 6x de {formatBRL(Math.max(0, subtotal - discountAmount) / 6)} sem juros
                  </span>
                </div>
              </div>
            </div>

            {/* Botão de Finalizar Compra */}
            <button
              type="button"
              className="cart-checkout-btn"
              onClick={handleStartCheckout}
              id="checkout-cta-btn"
            >
              <span>FINALIZAR COMPRA</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            {/* Informações de Confiança e Segurança */}
            <div className="cart-trust-badges">
              <div className="trust-item">
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
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Pagamento 100% Criptografado & Seguro</span>
              </div>

              <div className="payment-icons-strip" aria-label="Formas de pagamento">
                <span className="pay-badge">PIX (Aprovação Imediata)</span>
                <span className="pay-badge">CARTÃO EM ATÉ 6X</span>
                <span className="pay-badge">BOLETO</span>
              </div>
            </div>

            <button
              type="button"
              className="cart-continue-shopping-btn"
              onClick={closeCart}
            >
              Continuar comprando
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
