import { carregar } from "@/lib/data";
import {
  indicadores,
  moeda,
  percentual,
  diaLocal,
  dataBR,
  metaPeriodo,
  alertas,
  filtrar,
  type Filtros,
} from "@/lib/domain";
import { PageTitle, Filtro, Lista } from "@/app/components";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const dados = await carregar(),
    f = { inicio: "2026-05-01", fim: "2026-10-31", ...(await searchParams) },
    i = indicadores(dados.propostas, f),
    meta = metaPeriodo(dados.metas, f.inicio, f.fim),
    abertas = filtrar(dados.propostas, f).filter(
      (p) => !["Ganho", "Perdido"].includes(p.etapa),
    ),
    comAlertas = abertas.filter(
      (p) => alertas(p, dados.aprovacoes, dados.margem).length,
    );
  return (
    <>
      <PageTitle
        eyebrow="VISÃO GERAL"
        title="Seu próximo passo começa aqui."
        subtitle="Acompanhe resultados, enxergue oportunidades e avance com clareza."
        action
      />
      <Filtro dados={dados} f={f} periodo />
      <div className="sectiontitle">
        <h2>Resultados de vendas</h2>
        <span className="muted small">
          Por data de fechamento · {dataBR(f.inicio)} a {dataBR(f.fim)}
        </span>
      </div>
      <div className="metrics">
        <article className="metric featured">
          <p>Vendas ganhas</p>
          <strong>{moeda(i.vendas)}</strong>
          <small>{i.ganhas} proposta(s) ganha(s)</small>
        </article>
        <article className="metric">
          <p>Taxa de ganho</p>
          <strong>{percentual(i.taxa)}</strong>
          <small>Ganhas / negócios encerrados</small>
        </article>
        <article className="metric">
          <p>Ticket médio ganho</p>
          <strong>
            {i.ticket === null ? "Não disponível" : moeda(i.ticket)}
          </strong>
          <small>Valor por proposta ganha</small>
        </article>
        <article className="metric">
          <p>Margem ponderada</p>
          <strong>{percentual(i.margem)}</strong>
          <small>Somente negócios ganhos</small>
        </article>
      </div>
      <div className="dashboardgrid">
        <section className="panel padded">
          <div className="sectiontitle">
            <h2>Direção para o período</h2>
            <span className="pill">Meta global</span>
          </div>
          <div className="goalvalue">
            {meta === null ? "Meta não cadastrada" : moeda(meta)}
          </div>
          <p className="muted small">
            Meta global, sem rateio por vendedor, região, canal ou produto.
            Disponível apenas para meses completos cadastrados.
          </p>
          {meta !== null && (
            <>
              <progress
                aria-label="Atingimento da meta"
                value={Math.min(i.vendas / meta, 1)}
                max="1"
              />
              <div className="sectiontitle">
                <span>
                  Atingimento: <strong>{percentual(i.vendas / meta)}</strong>
                </span>
                <span>
                  Desvio: <strong>{moeda(i.vendas - meta)}</strong>
                </span>
              </div>
            </>
          )}
        </section>
        <section className="panel padded pipeline">
          <p className="eyebrow">OPORTUNIDADES EM MOVIMENTO</p>
          <h2>Carteira atual</h2>
          <p className="muted small">
            Consulta em {dataBR(diaLocal())} · Inclui negócios com alertas
          </p>
          <div className="pipenumbers">
            <div>
              <small>Pipeline aberto</small>
              <strong>{moeda(i.pipeline)}</strong>
            </div>
            <div>
              <small>Pipeline ponderado</small>
              <strong>{moeda(i.ponderado)}</strong>
            </div>
          </div>
          <p className="small">
            {abertas.length} aberta(s) · {comAlertas.length} com alerta
            comercial
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="sectiontitle">
          <h2>Oportunidades para acompanhar</h2>
          <span className="muted small">Próximas ações da sua carteira</span>
        </div>
        <Lista
          propostas={abertas.slice(0, 8)}
          dados={dados}
          avisos={(p) => alertas(p, dados.aprovacoes, dados.margem)}
        />
      </section>
    </>
  );
}
