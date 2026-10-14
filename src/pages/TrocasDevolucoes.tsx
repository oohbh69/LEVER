export function TrocasDevolucoesPage() {
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <span className="page-category">Garantia & Satisfação</span>
        <h1 className="page-title">Trocas e Devoluções</h1>
        <p className="page-subtitle">
          Processo simplificado, ágil e transparente para você comprar com tranquilidade total.
        </p>
      </div>

      <div className="page-content-box">
        <section className="policy-block highlight-block">
          <div className="highlight-tag">TRANQUILIDADE TOTAL</div>
          <h2>Primeira Troca Grátis & 7 Dias para Devolução</h2>
          <p>
            Você tem <strong>7 dias corridos</strong> a partir da data de entrega do pedido para solicitar a troca ou a devolução por arrependimento, sem custos adicionais de frete na primeira troca.
          </p>
        </section>

        <section className="policy-block">
          <h2>1. Condições Gerais para Troca ou Devolução</h2>
          <ul className="policy-list">
            <li>O produto não deve apresentar sinais de uso indevido, riscos nas lentes ou manchas na armação.</li>
            <li>Deve ser devolvido na embalagem original, acompanhado do estojo protetor, flanela de microfibra e brindes (se houver).</li>
            <li>A solicitação deve ser feita dentro do prazo de até 7 dias corridos após o recebimento indicado pelo rastreamento.</li>
          </ul>
        </section>

        <section className="policy-block">
          <h2>2. Passo a Passo para Solicitar</h2>
          <div className="steps-container">
            <div className="step-card">
              <span className="step-number">01</span>
              <h4>Envie um E-mail</h4>
              <p>Envie sua mensagem para <strong>leverglasses@gmail.com</strong> com o assunto "Troca/Devolução - Pedido #SEUNÚMERO".</p>
            </div>

            <div className="step-card">
              <span className="step-number">02</span>
              <h4>Receba a Etiqueta de Envio</h4>
              <p>Nossa equipe responderá com o código de logística reversa dos Correios pré-pago por nós.</p>
            </div>

            <div className="step-card">
              <span className="step-number">03</span>
              <h4>Postagem da Encomenda</h4>
              <p>Basta levar o produto embalado até a agência dos Correios mais próxima e apresentar o código.</p>
            </div>

            <div className="step-card">
              <span className="step-number">04</span>
              <h4>Troca ou Reembolso</h4>
              <p>Assim que o produto for recebido e conferido, enviamos o novo modelo escolhido ou estornamos 100% do valor.</p>
            </div>
          </div>
        </section>

        <section className="policy-block">
          <h2>3. Prazos de Estorno / Reembolso</h2>
          <p>
            - <strong>Pix</strong>: o estorno é realizado em até 2 dias úteis diretamente na mesma conta bancária pagadora.<br />
            - <strong>Cartão de Crédito</strong>: a solicitação de estorno é processada junto ao Mercado Pago em até 3 dias úteis, e o crédito é lançado na fatura do seu cartão conforme as normas da sua administradora.
          </p>
        </section>
      </div>
    </div>
  )
}
