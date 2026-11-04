import { carregar } from "@/lib/data";
import { alertas, filtrar, type Filtros } from "@/lib/domain";
import { PageTitle, Filtro, Lista } from "@/app/components";
export default async function Propostas({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const dados = await carregar(),
    f = await searchParams,
    ps = filtrar(dados.propostas, f);
  return (
    <>
      <PageTitle
        eyebrow="CARTEIRA COMERCIAL"
        title="Propostas"
        subtitle="Uma visão clara de cada oportunidade. E do que vem a seguir."
        action
      />
      <Filtro dados={dados} f={f} />
      <section className="panel">
        <div className="sectiontitle">
          <h2>
            Suas oportunidades <span className="count">{ps.length}</span>
          </h2>
          <span className="muted small">Somente versões vigentes</span>
        </div>
        <Lista
          propostas={ps}
          dados={dados}
          avisos={(p) =>
            ["Ganho", "Perdido"].includes(p.etapa)
              ? []
              : alertas(p, dados.aprovacoes, dados.margem)
          }
        />
      </section>
    </>
  );
}
