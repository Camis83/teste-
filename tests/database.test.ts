import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
const A = "11111111-1111-4111-8111-111111111111",
  B = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
async function identity(id = A, papel = "aluno") {
  await db.exec(
    `reset role; select set_config('request.jwt.claims','${JSON.stringify({ sub: id, app_metadata: { papel } })}',false); set role authenticated;`,
  );
}
async function sql(q: string) {
  return db.query(q);
}
const input = {
  proposta_id: "ATL-2026-0118",
  cliente_id: "CLI-022",
  vendedor_id: "VEN-01",
  produto_id: "PRD-03",
  canal: "Inbound",
  validade: "2099-11-30",
  etapa: "Negociacao",
  quantidade: 1,
  preco_unitario: 48000,
  desconto_pct: 0.1,
  custo_total: 25200,
  condicao_pagamento: "50% no aceite e 50% na entrega",
  proxima_acao: "Confirmar aceite",
};
async function salvar(
  data: Record<string, unknown> = input,
  esperada: number | null = null,
  reemitir = false,
) {
  return db.query("select public.salvar_proposta($1::jsonb,$2,$3) v", [
    JSON.stringify(data),
    esperada,
    reemitir,
  ]);
}
async function criar() {
  await identity();
  await salvar();
}
async function prepararGanho() {
  await criar();
  await db.exec(
    `reset role;insert into public.politica_comercial values('${A}',.30,'fixture de teste, não política oficial');insert into public.aprovacoes values('${A}','GER-2026-118','ATL-2026-0118',null,1,.10,'Gerente fixture',now());update public.propostas set aprovacao_desconto='GER-2026-118' where owner_id='${A}';`,
  );
  await identity(A, "gerente");
}
async function ganho(row = 2, v = 1) {
  return db.query("select public.registrar_ganho($1,$2,$3,true) resultado", [
    "ATL-2026-0118",
    v,
    row,
  ]);
}
beforeEach(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;insert into auth.users values('${A}'),('${B}');`,
  );
  await db.exec(
    readFileSync("supabase/migrations/202611030001_atlas.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202611030002_importacao.sql", "utf8"),
  );
  for (const u of [A, B])
    await db.exec(
      `insert into public.clientes values('${u}','CLI-022','Cliente fixture','Contato','contato@example.com','B2B','Sudeste');insert into public.vendedores values('${u}','VEN-01','Vendedor fixture','Sudeste');insert into public.produtos values('${u}','PRD-03','Pacote fixture',48000,25200,'Laboratório');`,
    );
});
afterEach(async () => {
  await db.close();
});
describe("Persistência e proteção no PostgreSQL", () => {
  it("cadastra, recalcula no servidor, edita e mantém histórico", async () => {
    await criar();
    const r = await sql("select * from public.propostas");
    expect(r.rows[0]).toMatchObject({
      valor_liquido: "43200.00",
      valor_ponderado: "32400.00",
      row_version: 1,
    });
    await salvar({ ...input, proxima_acao: "Telefonar" }, 1);
    expect(
      (await sql("select proxima_acao,row_version from public.propostas"))
        .rows[0],
    ).toEqual({ proxima_acao: "Telefonar", row_version: 2 });
    expect(
      (await sql("select * from public.historico_propostas")).rows,
    ).toHaveLength(2);
  });
  it("isola leitura e escrita por proprietário; bloqueia anônimo", async () => {
    await criar();
    await identity(B);
    expect((await sql("select * from public.propostas")).rows).toHaveLength(0);
    await expect(
      sql("update public.propostas set etapa='Ganho'"),
    ).rejects.toThrow(/permission denied/);
    await db.exec("reset role;set role anon;");
    await expect(sql("select * from public.propostas")).rejects.toThrow(
      /permission denied/,
    );
    await expect(salvar()).rejects.toThrow(/permission denied/);
  });
  it("rejeita referências de outro proprietário", async () => {
    await db.exec(`delete from public.produtos where owner_id='${A}';`);
    await identity();
    await expect(salvar()).rejects.toThrow(/foreign key/);
    expect((await sql("select * from public.propostas")).rows).toHaveLength(0);
  });
  it("impede ganho via formulário, edição direta e falsificação de papel", async () => {
    await identity();
    await expect(salvar({ ...input, etapa: "Ganho" })).rejects.toThrow(
      /não permitida/,
    );
    await criar();
    await expect(ganho(1)).rejects.toThrow(/gerencial/);
    await db.exec(
      `select set_config('request.jwt.claims','${JSON.stringify({ sub: A, user_metadata: { papel: "admin" } })}',false);`,
    );
    await expect(ganho(1)).rejects.toThrow(/gerencial/);
    await expect(
      sql(
        `insert into public.aprovacoes values('${A}','fake',null,'x',null,1,'eu',now())`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("rejeita margem não configurada e desconto sem alçada", async () => {
    await criar();
    await identity(A, "gerente");
    await expect(ganho(1)).rejects.toThrow(/margem/);
    await db.exec(
      `reset role;insert into public.politica_comercial values('${A}',.30,'fixture');`,
    );
    await identity(A, "gerente");
    await expect(ganho(1)).rejects.toThrow(/Desconto/);
  });
  it("registra ganho + histórico + outbox atomicamente e repetição é no-op", async () => {
    await prepararGanho();
    expect((await ganho()).rows[0]).toMatchObject({
      resultado: "ganho_registrado",
    });
    expect((await ganho()).rows[0]).toMatchObject({ resultado: "sem_efeitos" });
    expect((await sql("select * from public.email_outbox")).rows).toHaveLength(
      1,
    );
    expect(
      (await sql("select * from public.historico_propostas where para='Ganho'"))
        .rows,
    ).toHaveLength(1);
    expect(
      (await sql("select estado from public.email_outbox")).rows[0],
    ).toMatchObject({ estado: "pendente" });
    await db.exec("reset role;");
    await expect(
      sql("update public.propostas set proxima_acao='alterado'"),
    ).rejects.toThrow(/imutável/);
  });
  it("não deixa efeitos parciais quando outbox falha", async () => {
    await prepararGanho();
    await db.exec(
      `reset role;create function public.falhar_saida() returns trigger language plpgsql as $$begin raise exception 'falha simulada';end$$;create trigger falha before insert on public.email_outbox for each row execute function public.falhar_saida();`,
    );
    await identity(A, "gerente");
    await expect(ganho()).rejects.toThrow(/falha simulada/);
    expect(
      (await sql("select etapa from public.propostas")).rows[0],
    ).toMatchObject({ etapa: "Negociacao" });
    expect(
      (await sql("select * from public.email_processamentos")).rows,
    ).toHaveLength(0);
    expect(
      (await sql("select * from public.historico_propostas where para='Ganho'"))
        .rows,
    ).toHaveLength(0);
  });
  it("controla edição obsoleta e reemissão, mantendo uma vigente", async () => {
    await criar();
    await salvar({ ...input, preco_unitario: 50000 }, 1, true);
    await expect(salvar(input, 1, true)).rejects.toThrow(/Conflito/);
    const r = await sql(
      "select versao,vigente from public.propostas order by versao",
    );
    expect(r.rows).toEqual([
      { versao: 1, vigente: false },
      { versao: 2, vigente: true },
    ]);
    await identity(A, "gerente");
    await expect(ganho(1, 1)).rejects.toThrow(/Versão/);
  });
  it("rejeita custo negativo, quantidade nula e validade anterior", async () => {
    await identity();
    for (const patch of [
      { custo_total: -1 },
      { quantidade: 0 },
      { validade: "2000-01-01" },
    ])
      await expect(salvar({ ...input, ...patch })).rejects.toThrow(
        /check constraint/,
      );
  });
  it("rejeita vencida, qualificação e margem baixa sem criar saída", async () => {
    await prepararGanho();
    await identity();
    await salvar({ ...input, etapa: "Qualificacao" }, 2);
    await identity(A, "gerente");
    await expect(ganho(3)).rejects.toThrow(/Etapa/);
    await identity();
    await salvar({ ...input, custo_total: 43000 }, 3);
    await identity(A, "gerente");
    await expect(ganho(4)).rejects.toThrow(/margem/);
    expect((await sql("select * from public.email_outbox")).rows).toHaveLength(
      0,
    );
  });
});

describe("Carga inicial administrativa", () => {
  it("repete lote sem duplicar ou reverter edição; registra conflitos de outro lote", async () => {
    await db.exec(
      `delete from public.clientes where owner_id='${A}';delete from public.vendedores where owner_id='${A}';delete from public.produtos where owner_id='${A}';`,
    );
    const entrada = {
      clientes: [
        {
          cliente_id: "CLI-022",
          empresa: "Fixture",
          contato: "Contato",
          email_aceite: "contato@example.com",
          regiao: "Sudeste",
        },
      ],
      vendedores: [
        { vendedor_id: "VEN-01", nome: "Fixture", regiao: "Sudeste" },
      ],
      produtos: [
        {
          produto_id: "PRD-03",
          nome: "Pacote",
          preco_unitario: 48000,
          custo_unitario: 25200,
        },
      ],
      metas: [{ mes: "2026-05-01", meta_vendas_ganhas: 400000 }],
      propostas: [{ ...input, data_criacao: "2026-10-01", regiao: "Sudeste" }],
    };
    const importar = (hash = "a".repeat(64)) =>
      db.query("select public.importar_inicial($1,$2,$3,$4::jsonb) r", [
        A,
        "lote-didatico",
        hash,
        JSON.stringify(entrada),
      ]);
    expect((await importar()).rows[0]).toMatchObject({
      r: { estado: "importado", propostas: 1 },
    });
    await identity();
    await salvar({ ...input, proxima_acao: "Editada após carga" }, 1);
    await db.exec("reset role;");
    expect((await importar()).rows[0]).toMatchObject({
      r: { estado: "ja_importado" },
    });
    expect(
      (await sql("select proxima_acao from public.propostas")).rows[0],
    ).toMatchObject({ proxima_acao: "Editada após carga" });
    expect((await importar("b".repeat(64))).rows[0]).toMatchObject({
      r: { estado: "conflito" },
    });
    await identity();
    expect(
      (await sql("select * from public.importacao_conflitos")).rows,
    ).toHaveLength(1);
    await expect(importar()).rejects.toThrow(/permission denied/);
    await identity(B);
    expect(
      (await sql("select * from public.importacao_conflitos")).rows,
    ).toHaveLength(0);
  });
});

it("bloqueia proposta expirada no banco sem gerar confirmação", async () => {
  await prepararGanho();
  await db.exec(
    "reset role;update public.propostas set data_criacao=(now() at time zone 'America/Sao_Paulo')::date-2,validade=(now() at time zone 'America/Sao_Paulo')::date-1",
  );
  await identity(A, "gerente");
  await expect(ganho(3)).rejects.toThrow(/validade/);
  expect((await sql("select * from public.email_outbox")).rows).toHaveLength(0);
});

it("não aceita omitir versão/contador na função de ganho", async () => {
  await prepararGanho();
  await expect(
    db.query("select public.registrar_ganho('ATL-2026-0118',null,2,true)"),
  ).rejects.toThrow(/Versão/);
  await expect(
    db.query("select public.registrar_ganho('ATL-2026-0118',1,null,true)"),
  ).rejects.toThrow(/Conflito/);
  expect((await sql("select * from public.email_outbox")).rows).toHaveLength(0);
});
