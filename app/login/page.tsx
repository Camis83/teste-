import { login } from "@/app/actions";
import { configurado } from "@/lib/supabase";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <main className="login">
      <section className="manifesto">
        <a className="brand" href="/">
          ATLAS<span>SOLUÇÕES COMERCIAIS</span>
        </a>
        <div>
          <p className="eyebrow">RELACIONAMENTOS QUE AVANÇAM</p>
          <h1>
            Cada oportunidade
            <br />
            com um
            <br />
            <em>próximo passo.</em>
          </h1>
          <p>
            Propostas, pessoas e decisões.
            <br />
            Tudo conectado para você vender melhor.
          </p>
        </div>
        <small>ATLAS CRM · LABORATÓRIO 2026</small>
      </section>
      <section className="loginform">
        <div className="loginbox">
          <p className="eyebrow">SEU ESPAÇO DE NEGÓCIOS</p>
          <h2>Bom ter você aqui.</h2>
          <p className="muted">Entre para acompanhar suas oportunidades.</p>
          {!configurado() && (
            <div className="notice">
              Ambiente aguardando configuração do Supabase. O login será
              habilitado após conectar o projeto e aplicar as migrações.
            </div>
          )}
          {erro && (
            <p role="alert" className="error">
              {erro === "configuracao"
                ? "Configure o Supabase para continuar."
                : "Não foi possível entrar. Confira e-mail e senha."}
            </p>
          )}
          <form action={login}>
            <label>
              E-mail
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@empresa.com.br"
                required
              />
            </label>
            <label>
              Senha
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={6}
                required
              />
            </label>
            <button disabled={!configurado()}>
              Entrar no Atlas <span aria-hidden>↗</span>
            </button>
          </form>
          <p className="muted small">
            Acesso individual. Cada aluno vê apenas seus próprios registros.
            Solicite sua conta ao responsável pelo laboratório.
          </p>
          <footer>Treinamento por InsightOne</footer>
        </div>
      </section>
    </main>
  );
}
