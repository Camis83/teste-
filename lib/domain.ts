import { z } from "zod";
z.config(z.locales.pt());
export function rotulo(valor: string) {
  return (
    (
      {
        Qualificacao: "Qualificação",
        Negociacao: "Negociação",
        Indicacao: "Indicação",
        Preco: "Preço",
      } as Record<string, string>
    )[valor] ?? valor
  );
}
export const etapas = [
  "Qualificacao",
  "Proposta",
  "Negociacao",
  "Ganho",
  "Perdido",
] as const;
export const propostaSchema = z
  .object({
    proposta_id: z.string().regex(/^ATL-2026-\d{4}$/, "Use ATL-2026-NNNN"),
    cliente_id: z.string().min(1),
    vendedor_id: z.string().min(1),
    produto_id: z.string().min(1),
    canal: z.enum(["Indicacao", "Inbound", "Outbound"]),
    validade: z.iso.date(),
    etapa: z.enum(["Qualificacao", "Proposta", "Negociacao", "Perdido"]),
    quantidade: z.coerce.number().int().positive(),
    preco_unitario: z.coerce.number().positive().max(999999999999.99),
    desconto_pct: z.coerce.number().min(0).max(1),
    custo_total: z.coerce.number().min(0).max(999999999999.99),
    condicao_pagamento: z.string().trim().min(1).max(1000),
    proxima_acao: z.string().trim().min(1).max(1000),
    motivo_perda: z.string().nullable().optional(),
  })
  .refine(
    (x) =>
      x.etapa !== "Perdido" ||
      ["Preco", "Prazo", "Concorrente"].includes(x.motivo_perda ?? ""),
    { message: "Informe o motivo da perda", path: ["motivo_perda"] },
  );
export type Proposta = {
  proposta_id: string;
  versao: number;
  vigente: boolean;
  cliente_id: string;
  vendedor_id: string;
  produto_id: string;
  regiao: string;
  canal: string;
  data_criacao: string;
  data_fechamento: string | null;
  validade: string;
  etapa: (typeof etapas)[number];
  quantidade: number;
  preco_unitario: number;
  desconto_pct: number;
  custo_total: number;
  aprovacao_desconto: string | null;
  probabilidade: number;
  condicao_pagamento: string;
  motivo_perda: string | null;
  proxima_acao: string;
  valor_bruto: number;
  valor_liquido: number;
  margem_pct: number;
  valor_ponderado: number;
  row_version: number;
  batch_id: string | null;
};
export type Cadastro = {
  cliente_id?: string;
  vendedor_id?: string;
  produto_id?: string;
  empresa?: string;
  nome?: string;
  regiao?: string;
};
export type Aprovacao = {
  aprovacao_id: string;
  proposta_id: string | null;
  versao: number | null;
  lote: string | null;
  limite_desconto: number;
};
export function alertas(
  p: Proposta,
  aprovacoes: Aprovacao[],
  margem: number | null,
  hoje = diaLocal(),
) {
  const erros: string[] = [];
  if (p.validade < hoje) erros.push("Validade expirada");
  if (margem === null) erros.push("Política de margem não configurada");
  else if (Number(p.margem_pct) < margem || Number(p.valor_liquido) <= 0)
    erros.push("Margem fora da política");
  if (
    Number(p.desconto_pct) > 0 &&
    !aprovacoes.some(
      (a) =>
        a.aprovacao_id === p.aprovacao_desconto &&
        Number(a.limite_desconto) >= Number(p.desconto_pct) &&
        ((a.proposta_id === p.proposta_id && a.versao === p.versao) ||
          (a.lote !== null && a.lote === p.batch_id)),
    )
  )
    erros.push("Desconto sem alçada válida");
  return erros;
}
export function diaLocal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function moeda(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}
export function percentual(n: number | null) {
  return n === null
    ? "Não disponível"
    : new Intl.NumberFormat("pt-BR", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(n);
}
export function dataBR(s: string | null) {
  return s ? s.slice(0, 10).split("-").reverse().join("/") : "—";
}
export type Filtros = {
  q?: string;
  vendedor?: string;
  regiao?: string;
  canal?: string;
  produto?: string;
  etapa?: string;
  inicio?: string;
  fim?: string;
};
export function filtrar(ps: Proposta[], f: Filtros) {
  return ps.filter(
    (p) =>
      p.vigente &&
      (!f.q || p.proposta_id.toLowerCase().includes(f.q.toLowerCase())) &&
      (!f.vendedor || p.vendedor_id === f.vendedor) &&
      (!f.regiao || p.regiao === f.regiao) &&
      (!f.canal || p.canal === f.canal) &&
      (!f.produto || p.produto_id === f.produto) &&
      (!f.etapa || p.etapa === f.etapa),
  );
}
export function indicadores(ps: Proposta[], f: Filtros) {
  const atuais = filtrar(ps, f),
    encerradas = atuais.filter(
      (p) =>
        p.data_fechamento &&
        (!f.inicio || p.data_fechamento >= f.inicio) &&
        (!f.fim || p.data_fechamento <= f.fim),
    );
  const ganhas = encerradas.filter((p) => p.etapa === "Ganho"),
    perdidas = encerradas.filter((p) => p.etapa === "Perdido"),
    abertas = atuais.filter((p) => !["Ganho", "Perdido"].includes(p.etapa));
  const vendas = ganhas.reduce((a, p) => a + Number(p.valor_liquido), 0),
    lucro = ganhas.reduce(
      (a, p) => a + Number(p.valor_liquido) - Number(p.custo_total),
      0,
    );
  return {
    vendas,
    ganhas: ganhas.length,
    taxa:
      ganhas.length + perdidas.length
        ? ganhas.length / (ganhas.length + perdidas.length)
        : null,
    ticket: ganhas.length ? vendas / ganhas.length : null,
    margem: vendas ? lucro / vendas : null,
    pipeline: abertas.reduce((a, p) => a + Number(p.valor_liquido), 0),
    ponderado: abertas.reduce((a, p) => a + Number(p.valor_ponderado), 0),
  };
}
export function metaPeriodo(
  metas: { mes: string; meta_vendas_ganhas: number }[],
  inicio?: string,
  fim?: string,
) {
  if (!inicio || !fim || inicio > fim || !inicio.endsWith("-01")) return null;
  const end = new Date(`${fim}T12:00:00Z`),
    ultimo = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);
  if (fim !== ultimo) return null;
  const meses: string[] = [];
  const d = new Date(`${inicio}T12:00:00Z`);
  while (d.toISOString().slice(0, 10) <= fim) {
    meses.push(d.toISOString().slice(0, 7) + "-01");
    d.setUTCMonth(d.getUTCMonth() + 1);
    if (meses.length > 120) return null;
  }
  if (meses.some((m) => !metas.some((x) => x.mes === m))) return null;
  return meses.reduce(
    (a, m) => a + Number(metas.find((x) => x.mes === m)!.meta_vendas_ganhas),
    0,
  );
}
