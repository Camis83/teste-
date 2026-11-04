import Link from "next/link";
import { sessao } from "@/lib/data";
import { sair } from "@/app/actions";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await sessao();
  return (
    <div className="shell">
      <aside>
        <Link className="brand" href="/dashboard">
          ATLAS<span>SOLUÇÕES COMERCIAIS</span>
        </Link>
        <p className="navlabel">ESPAÇO COMERCIAL</p>
        <nav aria-label="Menu principal">
          <Link href="/dashboard">
            ◫ <span>Visão geral</span>
          </Link>
          <Link href="/propostas">
            ▤ <span>Propostas</span>
          </Link>
          <Link href="/fila">
            ↗ <span>Fila de respostas</span>
          </Link>
        </nav>
        <div className="sidebarfoot">
          <span className="avatar">A</span>
          <p>
            {user.email}
            <small>Laboratório individual</small>
          </p>
          <form action={sair}>
            <button className="textbutton">Sair</button>
          </form>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Atlas CRM <span className="muted">/ Seu espaço comercial</span>
          </span>
          <span className="pill">Laboratório</span>
        </header>
        <main className="content">{children}</main>
        <footer className="appfooter">
          Cada oportunidade com um próximo passo.{" "}
          <span>InsightOne · Treinamento</span>
        </footer>
      </div>
    </div>
  );
}
