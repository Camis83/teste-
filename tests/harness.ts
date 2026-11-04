/** Adaptador Supabase SIMULADO, somente para Playwright em loopback. Nunca publicar. */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const uid = "11111111-1111-4111-8111-111111111111";
await db.exec(
  `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;insert into auth.users values('${uid}');`,
);
for (const file of ["202611030001_atlas.sql", "202611030002_importacao.sql"])
  await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
await db.exec(
  `insert into public.clientes values('${uid}','CLI-022','Horizonte Tecnologia · fictícia','Contato laboratório','contato@example.com','B2B','Sudeste');insert into public.vendedores values('${uid}','VEN-01','Ana · laboratório','Sudeste');insert into public.produtos values('${uid}','PRD-03','Implantação comercial',48000,25200,'Pacote fictício');`,
);
const payload = {
  sub: uid,
  role: "authenticated",
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  app_metadata: { papel: "aluno" },
};
const token = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  ),
  Buffer.from(JSON.stringify(payload)).toString("base64url"),
  "assinatura-ficticia",
].join(".");
const user = {
  id: uid,
  aud: "authenticated",
  role: "authenticated",
  email: "aluno@example.com",
  app_metadata: { papel: "aluno" },
  user_metadata: {},
  created_at: "2026-11-03T12:00:00Z",
};
let queue = Promise.resolve();
const server = createServer((req, res) => {
  queue = queue
    .then(async () => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1:54321");
      const send = (status: number, body: unknown) => {
        res.writeHead(status, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(
          JSON.stringify(body, (key, value: unknown) => {
            if (
              ["data_criacao", "data_fechamento", "validade", "mes"].includes(
                key,
              ) &&
              typeof value === "string"
            )
              return value.slice(0, 10);
            return value;
          }),
        );
      };
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks).toString();
      if (url.pathname === "/health")
        return send(200, { mode: "simulado", database: "PGlite PostgreSQL" });
      if (url.pathname === "/auth/v1/token") {
        const data = JSON.parse(body);
        if (
          data.email !== "aluno@example.com" ||
          data.password !== "Atlas-lab-2026!"
        )
          return send(400, { msg: "Credenciais inválidas" });
        return send(200, {
          access_token: token,
          refresh_token: "fixture-refresh",
          expires_in: 3600,
          expires_at: payload.exp,
          token_type: "bearer",
          user,
        });
      }
      if (req.headers.authorization !== `Bearer ${token}`)
        return send(401, { message: "Não autorizado" });
      if (url.pathname === "/auth/v1/user") return send(200, user);
      if (url.pathname === "/auth/v1/logout") return send(200, {});
      await db.exec(
        `reset role;select set_config('request.jwt.claims','${JSON.stringify(payload)}',false);set role authenticated;`,
      );
      try {
        const rpc = url.pathname.match(
          /^\/rest\/v1\/rpc\/(salvar_proposta|registrar_ganho)$/,
        );
        if (rpc) {
          const data = JSON.parse(body);
          const result =
            rpc[1] === "salvar_proposta"
              ? await db.query(
                  "select public.salvar_proposta($1::jsonb,$2,$3) result",
                  [JSON.stringify(data.dados), data.esperada, data.reemitir],
                )
              : await db.query(
                  "select public.registrar_ganho($1,$2,$3,$4) result",
                  [
                    data.codigo,
                    data.versao_esperada,
                    data.row_esperada,
                    data.confirmar,
                  ],
                );
          return send(200, (result.rows[0] as { result: unknown }).result);
        }
        const table = url.pathname.replace("/rest/v1/", "");
        const tables = [
          "propostas",
          "clientes",
          "vendedores",
          "produtos",
          "aprovacoes",
          "politica_comercial",
          "metas",
          "historico_propostas",
          "email_outbox",
          "email_processamentos",
          "importacao_conflitos",
        ];
        if (!tables.includes(table))
          return send(404, { message: "Rota desconhecida" });
        let q = `select * from public.${table}`;
        const params: string[] = [];
        const codigo = url.searchParams.get("proposta_id");
        if (codigo?.startsWith("eq.")) {
          params.push(codigo.slice(3));
          q += " where proposta_id=$1";
        }
        const order = url.searchParams.get("order");
        if (order === "ocorrido_em.desc") q += " order by ocorrido_em desc";
        return send(200, (await db.query(q, params)).rows);
      } catch (error) {
        return send(400, {
          message: error instanceof Error ? error.message : "Erro",
          code: "LAB_DB",
        });
      }
    })
    .catch((error) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(error) }));
    });
});
server.listen(54321, "127.0.0.1", () =>
  console.log("Harness SIMULADO em 127.0.0.1:54321"),
);
