import { notFound } from "next/navigation";
import { carregar } from "@/lib/data";
import { PageTitle, Formulario } from "@/app/components";
export default async function Editar({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { codigo } = await params,
    dados = await carregar(),
    p = dados.propostas.find((p) => p.proposta_id === codigo && p.vigente);
  if (!p) notFound();
  return (
    <>
      <PageTitle
        eyebrow="CONDIÇÕES COMERCIAIS"
        title={`Editar ${codigo}`}
        subtitle={`Versão ${p.versao} · Controle de concorrência ativo`}
      />
      {["Ganho", "Perdido"].includes(p.etapa) ? (
        <p className="notice">Proposta encerrada e imutável.</p>
      ) : (
        <Formulario dados={dados} p={p} erro={(await searchParams).erro} />
      )}
    </>
  );
}
