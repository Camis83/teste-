import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty">
      <h1>Proposta não encontrada.</h1>
      <p>O registro não existe ou não pertence à sua conta.</p>
      <Link href="/propostas">Voltar para propostas</Link>
    </main>
  );
}
