import { it, expect } from "vitest";
import { lerCSV, calcularCentavos, validarCarga } from "../lib/importacao";
it("lê BOM, ponto e vírgula, aspas, ausência e preserva códigos", () => {
  const r = lerCSV(
    '\uFEFFcliente_id;empresa;contato;email_aceite;segmento;regiao\nCLI-001;"Empresa; LTDA";Maria;maria@example.com;;Sudeste\n',
    "clientes",
  );
  expect(r[0]).toMatchObject({
    cliente_id: "CLI-001",
    empresa: "Empresa; LTDA",
    segmento: null,
  });
});
it("rejeita chaves duplicadas, colunas faltantes e delimitador incorreto", () => {
  expect(() =>
    lerCSV(
      "vendedor_id;nome;regiao\nVEN-01;Ana;Sul\nVEN-01;Ana;Sul",
      "vendedores",
    ),
  ).toThrow(/duplicada/);
  expect(() =>
    lerCSV("cliente_id,empresa\nCLI-01,Empresa", "clientes"),
  ).toThrow(/ausente/);
});

it("confere arredondamento de meio centavo com aritmética inteira", () => {
  expect(calcularCentavos("1", "43200.05", "0.10", "0.75")).toEqual({
    bruto: 43200.05,
    liquido: 38880.05,
    ponderado: 29160.04,
  });
  expect(() => calcularCentavos("1", "1.005", "0", "1")).toThrow(/duas casas/);
});
it("rejeita vínculo e derivado divergente sem alterar a entrada", () => {
  const carga = {
    clientes: [{ cliente_id: "C" }],
    vendedores: [{ vendedor_id: "V", regiao: "Sul" }],
    produtos: [{ produto_id: "P" }],
    propostas: [
      {
        proposta_id: "ATL-2026-0001",
        cliente_id: "C",
        vendedor_id: "V",
        produto_id: "P",
        regiao: "Sul",
        quantidade: "1",
        preco_unitario: "100.00",
        desconto_pct: "0.10",
        custo_total: "50.00",
        etapa: "Proposta",
        valor_liquido: "91.00",
      },
    ],
  };
  expect(() => validarCarga(carga)).toThrow(/valor_liquido/);
  expect(carga.propostas[0].valor_liquido).toBe("91.00");
});
