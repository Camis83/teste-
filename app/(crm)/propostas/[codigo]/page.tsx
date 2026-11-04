import Link from "next/link";
import { notFound } from "next/navigation";
import { carregar, sessao } from "@/lib/data";
import { moeda, percentual, dataBR, alertas } from "@/lib/domain";
import { PageTitle, Badge, Campo } from "@/app/components";
import { ganhar } from "@/app/actions";
export default async function Detalhe({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const { codigo } = await params,
    dados = await carregar(),
    p = dados.propostas.find((p) => p.proposta_id === codigo && p.vigente);
  if (!p) notFound();
  const { db } = await sessao(),
    { data: hist, error } = await db
      .from("historico_propostas")
      .select("*")
      .eq("proposta_id", codigo)
      .order("ocorrido_em", { ascending: false });
  if (error) throw new Error("Não foi possível carregar o histórico");
  const avisos = alertas(p, dados.aprovacoes, dados.margem),
    s = await searchParams;
  return (
    <>
      <Link className="muted" href="/propostas">
        ← Voltar para propostas
      </Link>
      <PageTitle
        eyebrow={`PROPOSTA · VERSÃO ${p.versao}`}
        title={codigo}
        subtitle={
          dados.clientes.find((c) => c.cliente_id === p.cliente_id)?.empresa ??
          p.cliente_id
        }
      />
      {s.erro && (
        <p role="alert" className="error">
          {s.erro}
        </p>
      )}
      {s.sucesso && (
        <p role="status" className="success">
          Alteração salva com sucesso.
        </p>
      )}
      <div className="detailgrid">
        <section className="panel padded">
          <div className="sectiontitle">
            <Badge etapa={p.etapa} />
            {!["Ganho", "Perdido"].includes(p.etapa) && (
              <Link
                className="button secondary"
                href={`/propostas/${codigo}/editar`}
              >
                Editar proposta
              </Link>
            )}
          </div>
          <div className="bigvalue">{moeda(Number(p.valor_liquido))}</div>
          <p className="muted">Valor líquido da proposta</p>
          <dl className="datagrid">
            <Campo
              nome="Produto"
              valor={
                dados.produtos.find((x) => x.produto_id === p.produto_id)?.nome
              }
            />
            <Campo
              nome="Vendedor"
              valor={
                dados.vendedores.find((x) => x.vendedor_id === p.vendedor_id)
                  ?.nome
              }
            />
            <Campo nome="Região / canal" valor={`${p.regiao} · ${p.canal}`} />
            <Campo nome="Criação" valor={dataBR(p.data_criacao)} />
            <Campo nome="Validade (São Paulo)" valor={dataBR(p.validade)} />
            <Campo nome="Fechamento" valor={dataBR(p.data_fechamento)} />
            <Campo
              nome="Quantidade / unitário"
              valor={`${p.quantidade} × ${moeda(Number(p.preco_unitario))}`}
            />
            <Campo nome="Desconto" valor={percentual(Number(p.desconto_pct))} />
            <Campo nome="Custo total" valor={moeda(Number(p.custo_total))} />
            <Campo nome="Margem" valor={percentual(Number(p.margem_pct))} />
            <Campo
              nome="Alçada"
              valor={p.aprovacao_desconto ?? "Não registrada"}
            />
            <Campo nome="Pagamento" valor={p.condicao_pagamento} />
          </dl>
          <h3>Próxima ação</h3>
          <p>{p.proxima_acao}</p>
          {avisos.length > 0 && !["Ganho", "Perdido"].includes(p.etapa) && (
            <div className="notice">
              <strong>Ganho bloqueado para revisão</strong>
              <ul>
                {avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {["gerente", "admin"].includes(dados.user.app_metadata.papel) &&
            ["Proposta", "Negociacao"].includes(p.etapa) && (
              <form action={ganhar} className="gainform">
                <h3>Aceite manual de laboratório</h3>
                <p className="small muted">
                  Esta ação não verifica e-mail. Cria ganho, histórico e saída
                  pendente; nenhum e-mail será enviado.
                </p>
                <input type="hidden" name="codigo" value={codigo} />
                <input type="hidden" name="versao" value={p.versao} />
                <input type="hidden" name="row_version" value={p.row_version} />
                <label className="checkbox">
                  <input type="checkbox" name="confirmar" required /> Confirmo o
                  aceite integral destas condições pelo contato autorizado.
                </label>
                <button disabled={avisos.length > 0}>
                  Registrar ganho autorizado
                </button>
              </form>
            )}
        </section>
        <section className="panel padded">
          <h2>Histórico da oportunidade</h2>
          <p className="muted small">Todas as versões, sem perder o caminho.</p>
          <ol className="timeline">
            {hist?.map((h) => (
              <li key={h.id}>
                <strong>
                  {h.de ?? "Início"} → {h.para}
                </strong>
                <p>
                  Versão {h.versao} · {h.origem}
                </p>
                <small>
                  {new Date(h.ocorrido_em).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </small>
              </li>
            ))}
          </ol>
          {!hist?.length && <p className="muted">Sem eventos registrados.</p>}
        </section>
      </div>
    </>
  );
}
