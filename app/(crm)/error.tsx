"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="panel padded" role="alert">
      <h1>Não foi possível carregar os dados.</h1>
      <p>Confira a conexão e a configuração do banco e tente novamente.</p>
      <button onClick={reset}>Tentar novamente</button>
    </section>
  );
}
