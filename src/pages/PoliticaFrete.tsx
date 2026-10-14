export function PoliticaFretePage() {
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <span className="page-category">Informações de Envio</span>
        <h1 className="page-title">Política de Frete</h1>
        <p className="page-subtitle">
          Entregamos para todo o território nacional com rapidez, seguro de carga e rastreamento passo a passo.
        </p>
      </div>

      <div className="page-content-box">
        <section className="policy-block highlight-block">
          <div className="highlight-tag">BENEFÍCIO EXCLUSIVO</div>
          <h2>Frete Grátis a Partir de R$ 199,90</h2>
          <p>
            Em compras acima de <strong>R$ 199,90</strong>, o frete é 100% por nossa conta para qualquer estado do Brasil, sem taxas adicionais.
          </p>
        </section>

        <section className="policy-block">
          <h2>1. Prazo de Postagem e Separação</h2>
          <p>
            Após a confirmação do pagamento pelo sistema, seu pedido passa por uma rigorosa conferência de qualidade, embalagem segura e é despachado em até <strong>1 a 2 dias úteis</strong>.
          </p>
        </section>

        <section className="policy-block">
          <h2>2. Modalidades de Envio</h2>
          <p>
            Trabalhamos em parceria com os <strong>Correios (PAC e SEDEX)</strong> e as principais transportadoras privadas do país. O prazo estimado de entrega é informado no momento da compra, de acordo com o seu CEP.
          </p>
        </section>

        <section className="policy-block">
          <h2>3. Código de Rastreamento</h2>
          <p>
            Assim que a encomenda for postada, você receberá automaticamente por e-mail o código de rastreamento e o link para acompanhar a movimentação até o seu endereço.
          </p>
        </section>

        <section className="policy-block">
          <h2>4. Tentativas de Entrega</h2>
          <p>
            As transportadoras realizam até <strong>3 tentativas de entrega</strong> no endereço cadastrado. Certifique-se de que haverá alguém disponível para receber o pacote. Caso o pedido retorne por erro no endereço informado, um novo frete poderá ser cobrado.
          </p>
        </section>
      </div>
    </div>
  )
}
