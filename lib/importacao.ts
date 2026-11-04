import { parse } from "csv-parse/sync";
const requeridos: Record<string, string[]> = {
  clientes: [
    "cliente_id",
    "empresa",
    "contato",
    "email_aceite",
    "segmento",
    "regiao",
  ],
  vendedores: ["vendedor_id", "nome", "regiao"],
  produtos: [
    "produto_id",
    "nome",
    "preco_unitario",
    "custo_unitario",
    "escopo",
  ],
  metas: ["mes", "meta_vendas_ganhas"],
  propostas: [
    "proposta_id",
    "cliente_id",
    "vendedor_id",
    "produto_id",
    "regiao",
    "canal",
    "data_criacao",
    "data_fechamento",
    "validade",
    "etapa",
    "quantidade",
    "preco_unitario",
    "desconto_pct",
    "custo_total",
    "aprovacao_desconto",
    "condicao_pagamento",
    "motivo_perda",
    "proxima_acao",
  ],
};
export function lerCSV(
  texto: string,
  tipo: string,
): Record<string, string | null>[] {
  const rows = parse(texto, {
    bom: true,
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
    relax_column_count: false,
    trim: true,
  }) as Record<string, string>[];
  if (!rows.length) throw new Error(`${tipo}: arquivo vazio`);
  for (const campo of requeridos[tipo])
    if (!(campo in rows[0]))
      throw new Error(`${tipo}: coluna ausente: ${campo}`);
  const chave =
      tipo === "propostas"
        ? "proposta_id"
        : tipo === "metas"
          ? "mes"
          : (
              {
                clientes: "cliente_id",
                vendedores: "vendedor_id",
                produtos: "produto_id",
              } as Record<string, string>
            )[tipo],
    vistos = new Set<string>();
  return rows.map((r) => {
    if (!r[chave] || vistos.has(r[chave]))
      throw new Error(`${tipo}: chave ausente ou duplicada: ${r[chave]}`);
    vistos.add(r[chave]);
    return Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, v === "" ? null : v]),
    );
  });
}
// A carga confere centavos com inteiros para reproduzir round(numeric, 2) do PostgreSQL.
export function calcularCentavos(
  quantidade: string,
  preco: string,
  desconto: string,
  probabilidade: string,
) {
  const decimal = (v: string) => {
    if (!/^\d+(\.\d+)?$/.test(v)) throw new Error("Decimal inválido");
    const [inteiro, frac = ""] = v.split(".");
    return { n: BigInt(inteiro + frac), d: 10n ** BigInt(frac.length) };
  };
  const arredondar = (n: bigint, d: bigint) => (2n * n + d) / (2n * d);
  const p = decimal(preco),
    d = decimal(desconto),
    pr = decimal(probabilidade);
  if (!/^\d+$/.test(quantidade) || d.n > d.d)
    throw new Error("Quantidade ou desconto inválido");
  if ((preco.split(".")[1]?.length ?? 0) > 2)
    throw new Error("Preço deve ter até duas casas decimais");
  const bruto = arredondar(BigInt(quantidade) * p.n * 100n, p.d),
    liquido = arredondar(bruto * (d.d - d.n), d.d),
    ponderado = arredondar(liquido * pr.n, pr.d);
  return {
    bruto: Number(bruto) / 100,
    liquido: Number(liquido) / 100,
    ponderado: Number(ponderado) / 100,
  };
}
export function validarCarga(
  entrada: Record<string, Record<string, string | null>[]>,
) {
  const propostas = entrada.propostas;
  for (const p of propostas) {
    for (const tipo of ["clientes", "vendedores", "produtos"]) {
      const campo = (
        {
          clientes: "cliente_id",
          vendedores: "vendedor_id",
          produtos: "produto_id",
        } as Record<string, string>
      )[tipo];
      if (!entrada[tipo].some((c) => c[campo] === p[campo]))
        throw new Error(`${p.proposta_id}: referência ausente em ${tipo}`);
    }
    const vendedor = entrada.vendedores.find(
      (v) => v.vendedor_id === p.vendedor_id,
    )!;
    if (p.regiao !== vendedor.regiao)
      throw new Error(`${p.proposta_id}: região diverge do vendedor`);
    const numero = (campo: string) => {
      const s = p[campo];
      if (!s || !/^\d+(\.\d+)?$/.test(s))
        throw new Error(`${p.proposta_id}: número inválido em ${campo}`);
      return Number(s);
    };
    const q = numero("quantidade"),
      preco = numero("preco_unitario"),
      desconto = numero("desconto_pct"),
      custo = numero("custo_total");
    if (
      !Number.isInteger(q) ||
      q <= 0 ||
      preco <= 0 ||
      desconto > 1 ||
      custo < 0
    )
      throw new Error(`${p.proposta_id}: valores fora do domínio`);
    const prob: Record<string, number> = {
      Qualificacao: 0.2,
      Proposta: 0.5,
      Negociacao: 0.75,
      Ganho: 1,
      Perdido: 0,
    };
    if (!(p.etapa! in prob))
      throw new Error(`${p.proposta_id}: etapa inválida`);
    const { bruto, liquido, ponderado } = calcularCentavos(
      p.quantidade!,
      p.preco_unitario!,
      p.desconto_pct!,
      ["Ganho", "Perdido"].includes(p.etapa!) ? "0" : String(prob[p.etapa!]),
    );
    for (const [campo, esperado] of Object.entries({
      valor_bruto: bruto,
      valor_liquido: liquido,
      valor_ponderado: ponderado,
    }))
      if (p[campo] != null && Math.abs(numero(campo) - esperado) > 0.005)
        throw new Error(`${p.proposta_id}: divergência em ${campo}`);
    if (
      p.margem_pct != null &&
      liquido > 0 &&
      Math.abs(Number(p.margem_pct) - (liquido - custo) / liquido) > 0.0001
    )
      throw new Error(`${p.proposta_id}: divergência em margem_pct`);
    if (p.versao != null && p.versao !== "1")
      throw new Error(`${p.proposta_id}: carga inicial exige v1`);
  }
}
