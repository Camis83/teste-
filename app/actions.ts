"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase, configurado } from "@/lib/supabase";
import { sessao } from "@/lib/data";
import { propostaSchema } from "@/lib/domain";
export async function login(form: FormData) {
  if (!configurado()) redirect("/login?erro=configuracao");
  const db = await supabase();
  const email = String(form.get("email") ?? ""),
    password = String(form.get("password") ?? "");
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?erro=credenciais");
  redirect("/dashboard");
}
export async function sair() {
  const { db } = await sessao();
  await db.auth.signOut();
  redirect("/login");
}
export async function salvar(form: FormData) {
  const { db } = await sessao();
  const parsed = propostaSchema.safeParse(Object.fromEntries(form));
  const codigo = String(form.get("proposta_id") ?? "");
  const destino = form.get("row_version")
    ? `/propostas/${encodeURIComponent(codigo)}/editar`
    : "/propostas/nova";
  if (!parsed.success)
    redirect(
      `${destino}?erro=${encodeURIComponent(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "))}`,
    );
  const { error } = await db.rpc("salvar_proposta", {
    dados: parsed.data,
    esperada: form.get("row_version") ? Number(form.get("row_version")) : null,
    reemitir: form.get("reemitir") === "on",
  });
  if (error) redirect(`${destino}?erro=${encodeURIComponent(error.message)}`);
  revalidatePath("/propostas");
  revalidatePath("/dashboard");
  redirect(`/propostas/${codigo}?sucesso=1`);
}
export async function ganhar(form: FormData) {
  const { db } = await sessao();
  const codigo = String(form.get("codigo"));
  if (!/^ATL-2026-\d{4}$/.test(codigo)) throw new Error("Código inválido");
  const { error } = await db.rpc("registrar_ganho", {
    codigo,
    versao_esperada: Number(form.get("versao")),
    row_esperada: Number(form.get("row_version")),
    confirmar: form.get("confirmar") === "on",
  });
  if (error)
    redirect(`/propostas/${codigo}?erro=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`/propostas/${codigo}?sucesso=1`);
}
