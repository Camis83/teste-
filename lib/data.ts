import "server-only";
import { redirect } from "next/navigation";
import { supabase, configurado } from "./supabase";
import type { Proposta, Aprovacao } from "./domain";
export async function sessao() {
  if (!configurado()) redirect("/login");
  const db = await supabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect("/login");
  return { db, user };
}
export async function carregar() {
  const { db, user } = await sessao();
  const resultados = await Promise.all(
    [
      "propostas",
      "clientes",
      "vendedores",
      "produtos",
      "aprovacoes",
      "politica_comercial",
      "metas",
    ].map((t) => db.from(t).select("*")),
  );
  const erro = resultados.find((r) => r.error);
  if (erro)
    throw new Error(
      "Não foi possível consultar o banco. Confira as migrações e tente novamente.",
    );
  return {
    user,
    propostas: resultados[0].data as Proposta[],
    clientes: resultados[1].data as { cliente_id: string; empresa: string }[],
    vendedores: resultados[2].data as {
      vendedor_id: string;
      nome: string;
      regiao: string;
    }[],
    produtos: resultados[3].data as { produto_id: string; nome: string }[],
    aprovacoes: resultados[4].data as Aprovacao[],
    margem: resultados[5].data?.[0]?.margem_minima ?? null,
    metas: resultados[6].data as { mes: string; meta_vendas_ganhas: number }[],
  };
}
