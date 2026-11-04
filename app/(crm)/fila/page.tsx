import { sessao } from "@/lib/data";
import { PageTitle } from "@/app/components";
export default async function Fila() {
  const { db } = await sessao();
  const [{ data: saidas, error: e1 }, { data: processos, error: e2 }] =
    await Promise.all([
      db
        .from("email_outbox")
        .select("id,proposta_id,versao,estado,tentativas,erro,processamento_id")
        .order("updated_at", { ascending: false }),
      db
        .from("email_processamentos")
        .select("id,decisao,motivo,estado,correlation_id")
        .order("recebido_em", { ascending: false }),
    ]);
  if (e1 || e2) throw new Error("Falha ao consultar a fila");
  const { data: conflitos, error: e3 } = await db
    .from("importacao_conflitos")
    .select("id,batch_id,motivo")
    .order("criado_em", { ascending: false });
  if (e3) throw new Error("Falha ao consultar conflitos");
  return (
    <>
      <PageTitle
        eyebrow="RASTREABILIDADE"
        title="Fila de respostas"
        subtitle="Acompanhe decisões e confirmações com segurança."
      />
      <div className="notice">
        Envio de e-mail desativado nesta etapa. Gmail não integrado. As saídas
        permanecem pendentes para revisão.
      </div>
      <section className="panel">
        <div className="sectiontitle">
          <h2>Confirmações</h2>
        </div>
        {saidas?.length ? (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Proposta</th>
                  <th>Estado</th>
                  <th>Tentativas</th>
                  <th>Correlação / erro</th>
                </tr>
              </thead>
              <tbody>
                {saidas.map((x) => (
                  <tr key={x.id}>
                    <td>
                      {x.proposta_id} / v{x.versao}
                    </td>
                    <td>{x.estado}</td>
                    <td>{x.tentativas}</td>
                    <td>
                      {
                        processos?.find((p) => p.id === x.processamento_id)
                          ?.correlation_id
                      }
                      <small>{x.erro}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">Nenhuma saída registrada.</div>
        )}
      </section>
      <section className="panel padded">
        <h2>Decisões e revisões</h2>
        {processos?.length ? (
          processos.map((x) => (
            <article key={x.id} className="event">
              <strong>
                {x.decisao ?? "Em revisão"} · {x.estado}
              </strong>
              <p>{x.motivo}</p>
              <small>Correlação: {x.correlation_id}</small>
            </article>
          ))
        ) : (
          <p className="muted">Nenhum processamento registrado.</p>
        )}
      </section>
      <section className="panel padded">
        <h2>Conflitos de importação</h2>
        {conflitos?.length ? (
          conflitos.map((c) => (
            <article key={c.id} className="event">
              <strong>{c.batch_id}</strong>
              <p>{c.motivo}</p>
            </article>
          ))
        ) : (
          <p className="muted">Nenhum conflito registrado.</p>
        )}
      </section>
    </>
  );
}
