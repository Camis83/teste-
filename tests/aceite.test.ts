import { it, expect } from "vitest";
import { validarAceite, type Envelope, type Extracao } from "../lib/aceite";
import type { Proposta } from "../lib/domain";
const p = {
  proposta_id: "ATL-2026-0118",
  versao: 1,
  vigente: true,
  etapa: "Negociacao",
  validade: "2026-11-30",
  valor_liquido: 43200,
  desconto_pct: 0.1,
  margem_pct: 18000 / 43200,
  condicao_pagamento: "50% no aceite e 50% na entrega",
  aprovacao_desconto: "GER-2026-118",
  batch_id: null,
} as Proposta;
const e: Envelope = {
  assunto: "[ACEITE PROPOSTA] ATL-2026-0118",
  remetente: "contato@example.com",
  contato_permitido: "contato@example.com",
  origem_verificada: true,
  autoreply: false,
  propria_conta: false,
  reply_to_divergente: false,
};
const x: Extracao = {
  codigo: p.proposta_id,
  versao: 1,
  valor_centavos: 4320000,
  moeda: "BRL",
  condicao_pagamento: p.condicao_pagamento,
  intencao: "aceite_inequivoco",
  trecho_evidencia: "Aceito integralmente",
  sinais_de_instrucao: false,
};
const aprovacoes = [
  {
    aprovacao_id: "GER-2026-118",
    proposta_id: p.proposta_id,
    versao: 1,
    lote: null,
    limite_desconto: 0.1,
  },
];
const validar = (
  env: Envelope = e,
  extra: Extracao = x,
  proposta: Proposta | null = p,
  hoje = "2026-11-30",
) => validarAceite(env, extra, proposta, aprovacoes, 0.3, hoje);
it("aceite 118/v1 elegível até a data inclusiva, somente dry-run", () => {
  expect(validar().decisao).toBe("elegivel_dry_run");
  expect(validar(e, x, p, "2026-12-01").decisao).toBe("revisao");
});
it.each([
  "Re: [ACEITE PROPOSTA] ATL-2026-0118",
  "Fwd: [ACEITE PROPOSTA] ATL-2026-0118",
  "[ACEITE PROPOSTA] ATL-2026-0118 ATL-2026-0119",
  "[ACEITE PROPOSTA] ATL-2026-9999",
])("revisa assunto %s", (assunto) =>
  expect(validar({ ...e, assunto }).decisao).toBe("revisao"),
);
it.each([
  { origem_verificada: false },
  { remetente: "outro@example.com" },
  { autoreply: true },
  { propria_conta: true },
  { reply_to_divergente: true },
])("revisa envelope não autorizado %j", (patch) =>
  expect(validar({ ...e, ...patch }).decisao).toBe("revisao"),
);
it.each([
  { versao: null },
  { versao: 2 },
  { valor_centavos: 4320001 },
  { moeda: "USD" },
  { condicao_pagamento: null },
  { intencao: "condicional" as const },
  { sinais_de_instrucao: true },
  { trecho_evidencia: null },
])("revisa extração divergente %j", (patch) =>
  expect(validar(e, { ...x, ...patch }).decisao).toBe("revisao"),
);
it.each([
  { vigente: false },
  { etapa: "Qualificacao" as const },
  { etapa: "Perdido" as const },
  { aprovacao_desconto: null },
  { margem_pct: 0.1 },
])("revisa proposta inelegível %j", (patch) =>
  expect(validar(e, x, { ...p, ...patch }).decisao).toBe("revisao"),
);
it("retorna no-op para mesma versão ganha e revisão para código ausente", () => {
  expect(validar(e, x, { ...p, etapa: "Ganho" }).decisao).toBe("sem_efeitos");
  expect(validar(e, x, null).decisao).toBe("revisao");
});
