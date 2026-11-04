import Link from "next/link";
import type { Filtros, Proposta } from "@/lib/domain";
import { dataBR, moeda, rotulo } from "@/lib/domain";
import { salvar } from "./actions";
export function PageTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: boolean;
}) {
  return (
    <div className="pagetitle">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      {action && (
        <Link className="button" href="/propostas/nova">
          + Nova proposta
        </Link>
      )}
    </div>
  );
}
export function Badge({ etapa }: { etapa: string }) {
  return (
    <span className={`badge ${etapa}`}>
      {etapa === "Qualificacao"
        ? "Qualificação"
        : etapa === "Negociacao"
          ? "Negociação"
          : etapa}
    </span>
  );
}
type Dados = {
  clientes: { cliente_id: string; empresa: string }[];
  vendedores: { vendedor_id: string; nome: string; regiao: string }[];
  produtos: { produto_id: string; nome: string }[];
};
export function Filtro({
  dados,
  f,
  periodo = false,
}: {
  dados: Dados;
  f: Filtros;
  periodo?: boolean;
}) {
  return (
    <form className="filters">
      <label>
        Buscar código
        <input
          aria-label="Buscar código"
          name="q"
          defaultValue={f.q}
          placeholder="ATL-2026-…"
        />
      </label>
      <label>
        Vendedor
        <select aria-label="Vendedor" name="vendedor" defaultValue={f.vendedor}>
          <option value="">Todos</option>
          {dados.vendedores.map((x) => (
            <option key={x.vendedor_id} value={x.vendedor_id}>
              {x.nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        Região
        <select aria-label="Região" name="regiao" defaultValue={f.regiao}>
          <option value="">Todas</option>
          {[...new Set(dados.vendedores.map((x) => x.regiao))].map((x) => (
            <option key={x} value={x}>
              {rotulo(x)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Canal
        <select aria-label="Canal" name="canal" defaultValue={f.canal}>
          <option value="">Todos</option>
          {["Indicacao", "Inbound", "Outbound"].map((x) => (
            <option key={x} value={x}>
              {rotulo(x)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Produto
        <select aria-label="Produto" name="produto" defaultValue={f.produto}>
          <option value="">Todos</option>
          {dados.produtos.map((x) => (
            <option key={x.produto_id} value={x.produto_id}>
              {x.nome}
            </option>
          ))}
        </select>
      </label>
      {!periodo && (
        <label>
          Etapa
          <select aria-label="Etapa" name="etapa" defaultValue={f.etapa}>
            <option value="">Todas</option>
            {["Qualificacao", "Proposta", "Negociacao", "Ganho", "Perdido"].map(
              (x) => (
                <option key={x} value={x}>
                  {rotulo(x)}
                </option>
              ),
            )}
          </select>
        </label>
      )}
      {periodo && (
        <>
          <label>
            Fechamento de
            <input
              aria-label="Fechamento de"
              type="date"
              name="inicio"
              defaultValue={f.inicio}
            />
          </label>
          <label>
            Até
            <input
              aria-label="Até"
              type="date"
              name="fim"
              defaultValue={f.fim}
            />
          </label>
        </>
      )}
      <button>Aplicar</button>
      <Link className="textbutton" href={periodo ? "/dashboard" : "/propostas"}>
        Limpar
      </Link>
    </form>
  );
}
export function Lista({
  propostas,
  dados,
  avisos,
}: {
  propostas: Proposta[];
  dados: Dados;
  avisos: (p: Proposta) => string[];
}) {
  return propostas.length ? (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Proposta / cliente</th>
            <th>Valor líquido</th>
            <th>Responsável</th>
            <th>Etapa</th>
            <th>Próxima ação</th>
            <th>Alertas</th>
          </tr>
        </thead>
        <tbody>
          {propostas.map((p) => (
            <tr key={p.proposta_id}>
              <td>
                <Link className="code" href={`/propostas/${p.proposta_id}`}>
                  {p.proposta_id} ↗
                </Link>
                <small>
                  {dados.clientes.find((c) => c.cliente_id === p.cliente_id)
                    ?.empresa ?? p.cliente_id}
                </small>
              </td>
              <td className="number">{moeda(Number(p.valor_liquido))}</td>
              <td>
                {
                  dados.vendedores.find((v) => v.vendedor_id === p.vendedor_id)
                    ?.nome
                }
              </td>
              <td>
                <Badge etapa={p.etapa} />
              </td>
              <td>{p.proxima_acao}</td>
              <td>
                {avisos(p).length ? (
                  <span className="warning">
                    ⚠ {avisos(p).length} alerta(s)
                  </span>
                ) : (
                  <span className="muted">Sem alertas</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">
      <h2>Nenhuma proposta por aqui.</h2>
      <p>Cadastre uma oportunidade ou ajuste os filtros.</p>
      <Link className="button" href="/propostas/nova">
        Criar proposta
      </Link>
    </div>
  );
}
export function Formulario({
  dados,
  p,
  erro,
}: {
  dados: Dados;
  p?: Proposta;
  erro?: string;
}) {
  return (
    <form action={salvar} className="panel proposalform">
      {erro && (
        <p className="error" role="alert">
          {erro}
        </p>
      )}
      <h2>Dados da oportunidade</h2>
      <p className="muted">
        Campos obrigatórios. Valores são recalculados no servidor.
      </p>
      <div className="formgrid">
        <label>
          Código
          <input
            aria-label="Código"
            name="proposta_id"
            defaultValue={p?.proposta_id}
            readOnly={!!p}
            pattern="ATL-2026-[0-9]{4}"
            placeholder="ATL-2026-0001"
            required
          />
        </label>
        <label>
          Cliente
          <select
            aria-label="Cliente"
            name="cliente_id"
            defaultValue={p?.cliente_id}
            required
          >
            <option value="">Selecione</option>
            {dados.clientes.map((c) => (
              <option key={c.cliente_id} value={c.cliente_id}>
                {c.empresa}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vendedor
          <select
            aria-label="Vendedor"
            name="vendedor_id"
            defaultValue={p?.vendedor_id}
            required
          >
            <option value="">Selecione</option>
            {dados.vendedores.map((v) => (
              <option key={v.vendedor_id} value={v.vendedor_id}>
                {v.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Produto
          <select
            aria-label="Produto"
            name="produto_id"
            defaultValue={p?.produto_id}
            required
          >
            <option value="">Selecione</option>
            {dados.produtos.map((v) => (
              <option key={v.produto_id} value={v.produto_id}>
                {v.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Canal
          <select
            aria-label="Canal"
            name="canal"
            defaultValue={p?.canal ?? "Inbound"}
          >
            {["Indicacao", "Inbound", "Outbound"].map((x) => (
              <option key={x} value={x}>
                {rotulo(x)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Etapa
          <select
            aria-label="Etapa"
            name="etapa"
            defaultValue={p?.etapa ?? "Qualificacao"}
          >
            {["Qualificacao", "Proposta", "Negociacao", "Perdido"].map((x) => (
              <option key={x} value={x}>
                {rotulo(x)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Validade
          <input
            aria-label="Validade"
            type="date"
            name="validade"
            defaultValue={p?.validade}
            required
          />
        </label>
        <label>
          Quantidade
          <input
            aria-label="Quantidade"
            type="number"
            name="quantidade"
            min="1"
            step="1"
            defaultValue={p?.quantidade ?? 1}
            required
          />
        </label>
        <label>
          Preço unitário (R$)
          <input
            aria-label="Preço unitário (R$)"
            type="number"
            name="preco_unitario"
            min="0.01"
            step="0.01"
            defaultValue={p?.preco_unitario}
            required
          />
        </label>
        <label>
          Desconto (fração: 0,10 = 10%)
          <input
            aria-label="Desconto (fração: 0,10 = 10%)"
            type="number"
            name="desconto_pct"
            min="0"
            max="1"
            step="0.0001"
            defaultValue={p?.desconto_pct ?? 0}
            required
          />
        </label>
        <label>
          Custo total (R$)
          <input
            aria-label="Custo total (R$)"
            type="number"
            name="custo_total"
            min="0"
            step="0.01"
            defaultValue={p?.custo_total ?? 0}
            required
          />
        </label>
        <label>
          Motivo da perda
          <select
            aria-label="Motivo da perda"
            name="motivo_perda"
            defaultValue={p?.motivo_perda ?? ""}
          >
            <option value="">Não se aplica</option>
            {["Preco", "Prazo", "Concorrente"].map((x) => (
              <option key={x} value={x}>
                {rotulo(x)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Condição de pagamento
        <textarea
          aria-label="Condição de pagamento"
          name="condicao_pagamento"
          defaultValue={p?.condicao_pagamento}
          maxLength={1000}
          required
        />
      </label>
      <label>
        Próxima ação
        <textarea
          aria-label="Próxima ação"
          name="proxima_acao"
          defaultValue={p?.proxima_acao}
          maxLength={1000}
          required
        />
      </label>
      {p && (
        <>
          <input type="hidden" name="row_version" value={p.row_version} />
          <label className="checkbox">
            <input type="checkbox" name="reemitir" /> Reemitir como versão{" "}
            {p.versao + 1}, preservando a anterior
          </label>
          <p className="muted small">
            A aprovação da versão anterior não autoriza novas condições.
          </p>
        </>
      )}
      <div className="formactions">
        <button>Salvar proposta</button>
        <Link href={p ? `/propostas/${p.proposta_id}` : "/propostas"}>
          Cancelar
        </Link>
      </div>
      {!dados.clientes.length && (
        <p className="notice">
          Cadastros ainda não carregados. O responsável deve importar a base
          inicial ou preparar os cadastros do laboratório.
        </p>
      )}
    </form>
  );
}
export function Campo({
  nome,
  valor,
}: {
  nome: string;
  valor: React.ReactNode;
}) {
  return (
    <div>
      <dt>{nome}</dt>
      <dd>{valor ?? "—"}</dd>
    </div>
  );
}
export { dataBR };
