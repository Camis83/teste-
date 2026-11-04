import { describe, it, expect } from "vitest";
import {
  indicadores,
  metaPeriodo,
  filtrar,
  alertas,
  propostaSchema,
  type Proposta,
} from "../lib/domain";
const p = {
  proposta_id: "ATL-2026-0118",
  versao: 1,
  vigente: true,
  cliente_id: "CLI-022",
  vendedor_id: "VEN-01",
  produto_id: "PRD-03",
  regiao: "Sudeste",
  canal: "Inbound",
  data_criacao: "2026-10-01",
  validade: "2026-11-30",
  data_fechamento: null,
  etapa: "Negociacao",
  quantidade: 1,
  preco_unitario: 48000,
  desconto_pct: 0.1,
  custo_total: 25200,
  aprovacao_desconto: null,
  motivo_perda: null,
  probabilidade: 0.75,
  condicao_pagamento: "50% no aceite e 50% na entrega",
  proxima_acao: "Confirmar aceite",
  valor_bruto: 48000,
  valor_liquido: 43200,
  margem_pct: 18000 / 43200,
  valor_ponderado: 32400,
  row_version: 1,
  batch_id: null,
} satisfies Proposta;
describe("Indicadores e validação", () => {
  it("não mistura fechamento de novembro com histórico maio-outubro", () => {
    const ganha = {
      ...p,
      etapa: "Ganho",
      data_fechamento: "2026-11-03",
      valor_ponderado: 0,
    } as Proposta;
    expect(
      indicadores([ganha], { inicio: "2026-05-01", fim: "2026-10-31" }).vendas,
    ).toBe(0);
    expect(indicadores([ganha], {}).vendas).toBe(43200);
  });
  it("preserva alertas no pipeline e retira apenas a ganha", () => {
    expect(indicadores([p], {}).pipeline).toBe(43200);
    expect(indicadores([p], {}).ponderado).toBe(32400);
    expect(alertas(p, [], null, "2026-11-03")).toContain(
      "Desconto sem alçada válida",
    );
  });
  it("aplica filtros aos denominadores e ignora versões antigas", () => {
    const ganha = {
      ...p,
      etapa: "Ganho",
      data_fechamento: "2026-10-10",
    } as Proposta;
    const perdida = {
      ...p,
      proposta_id: "ATL-2026-0002",
      vendedor_id: "VEN-02",
      etapa: "Perdido",
      data_fechamento: "2026-10-10",
    } as Proposta;
    expect(indicadores([ganha, perdida], {}).taxa).toBe(0.5);
    expect(indicadores([ganha, perdida], { vendedor: "VEN-01" }).taxa).toBe(1);
    expect(filtrar([{ ...p, vigente: false }], {})).toHaveLength(0);
  });
  it("mostra ausência de denominador e de meta sem inventar zero", () => {
    expect(indicadores([], {})).toMatchObject({
      taxa: null,
      ticket: null,
      margem: null,
    });
    expect(
      metaPeriodo(
        [{ mes: "2026-10-01", meta_vendas_ganhas: 400000 }],
        "2026-11-01",
        "2026-11-30",
      ),
    ).toBeNull();
    expect(
      metaPeriodo(
        [{ mes: "2026-10-01", meta_vendas_ganhas: 400000 }],
        "2026-10-01",
        "2026-10-31",
      ),
    ).toBe(400000);
    expect(metaPeriodo([], "2026-10-02", "2026-10-31")).toBeNull();
  });
  it("não permite ganho no formulário ou dados inválidos", () => {
    expect(propostaSchema.safeParse(p).success).toBe(true);
    expect(propostaSchema.safeParse({ ...p, etapa: "Ganho" }).success).toBe(
      false,
    );
    expect(propostaSchema.safeParse({ ...p, quantidade: 0 }).success).toBe(
      false,
    );
  });
});
