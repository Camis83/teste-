import { alertas, type Proposta, type Aprovacao } from "./domain";
export type Extracao = {
  codigo: string | null;
  versao: number | null;
  valor_centavos: number | null;
  moeda: string | null;
  condicao_pagamento: string | null;
  intencao:
    "aceite_inequivoco" | "condicional" | "recusa" | "duvida" | "desconhecida";
  trecho_evidencia: string | null;
  sinais_de_instrucao: boolean;
};
// Envelope deve ser obtido do provedor por uma ponte autenticada. Não há rota pública
// para o navegador declarar origem_verificada=true. Esta função é apenas dry-run.
export type Envelope = {
  assunto: string;
  remetente: string;
  contato_permitido: string;
  origem_verificada: boolean;
  autoreply: boolean;
  propria_conta: boolean;
  reply_to_divergente: boolean;
};
export function validarAceite(
  e: Envelope,
  x: Extracao,
  p: Proposta | null,
  aprovacoes: Aprovacao[],
  margem: number | null,
  hoje: string,
) {
  const revisao = (motivo: string) => ({ decisao: "revisao" as const, motivo });
  if (
    !e.origem_verificada ||
    e.autoreply ||
    e.propria_conta ||
    e.reply_to_divergente
  )
    return revisao("Origem ou identidade requer revisão");
  const assunto = e.assunto.match(/^\[ACEITE PROPOSTA\] (ATL-2026-\d{4})$/);
  if (!assunto) return revisao("Assunto inválido");
  if (!p || p.proposta_id !== assunto[1] || x.codigo !== p.proposta_id)
    return revisao("Código desconhecido ou divergente");
  if (e.remetente !== e.contato_permitido)
    return revisao("Remetente não autorizado");
  if (!p.vigente || x.versao !== p.versao)
    return revisao("Versão não vigente ou ausente");
  if (
    x.sinais_de_instrucao ||
    x.intencao !== "aceite_inequivoco" ||
    !x.trecho_evidencia?.trim()
  )
    return revisao("Aceite ausente, condicional ou com instruções");
  if (
    x.moeda !== "BRL" ||
    x.valor_centavos !== Math.round(Number(p.valor_liquido) * 100) ||
    x.condicao_pagamento !== p.condicao_pagamento
  )
    return revisao("Condições divergentes ou incompletas");
  if (p.etapa === "Ganho")
    return { decisao: "sem_efeitos" as const, motivo: "Versão já ganha" };
  if (!["Proposta", "Negociacao"].includes(p.etapa))
    return revisao("Etapa inelegível");
  const bloqueios = alertas(p, aprovacoes, margem, hoje);
  if (bloqueios.length) return revisao(bloqueios.join("; "));
  return {
    decisao: "elegivel_dry_run" as const,
    motivo:
      "Revalidação transacional obrigatória antes de registrar; nenhum efeito aplicado",
  };
}
