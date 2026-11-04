import { carregar } from "@/lib/data";
import { PageTitle, Formulario } from "@/app/components";
export default async function Nova({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  return (
    <>
      <PageTitle
        eyebrow="NOVA OPORTUNIDADE"
        title="Vamos dar o próximo passo."
        subtitle="Registre as condições e mantenha o relacionamento em movimento."
      />
      <Formulario dados={await carregar()} erro={(await searchParams).erro} />
    </>
  );
}
