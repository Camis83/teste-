begin;
create table public.importacao_conflitos(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),batch_id text not null,hash text not null,motivo text not null,criado_em timestamptz not null default now());
alter table public.importacao_conflitos enable row level security;
create policy dono_leitura on public.importacao_conflitos for select to authenticated using ((select auth.uid())=owner_id);
revoke all on public.importacao_conflitos from anon,authenticated;
grant select on public.importacao_conflitos to authenticated;
-- Importação inicial somente, via serviço administrativo. Não atualiza cadastro existente.
create function public.importar_inicial(dono uuid,lote text,digest text,entrada jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; total integer:=0;
begin
 if dono is null or lote is null or length(lote)=0 or digest !~ '^[a-f0-9]{64}$' then raise exception 'Lote ou hash inválido'; end if;
 perform pg_advisory_xact_lock(hashtextextended(dono::text,0));
 if exists(select 1 from public.importacoes where owner_id=dono and hash=digest) then return jsonb_build_object('estado','ja_importado'); end if;
 if exists(select 1 from public.importacoes where owner_id=dono and batch_id=lote) or exists(select 1 from public.propostas where owner_id=dono) or exists(select 1 from public.clientes where owner_id=dono) or exists(select 1 from public.vendedores where owner_id=dono) or exists(select 1 from public.produtos where owner_id=dono) or exists(select 1 from public.metas where owner_id=dono) then
 insert into public.importacao_conflitos(owner_id,batch_id,hash,motivo) values(dono,lote,digest,'Proprietário já possui dados. Revisão necessária; nenhum cadastro ou negócio foi sobrescrito.');
 return jsonb_build_object('estado','conflito','motivo','Dados existentes; revise importacao_conflitos'); end if;
 if jsonb_array_length(entrada->'propostas')=0 then raise exception 'Carga de propostas vazia'; end if;
 insert into public.importacoes(owner_id,batch_id,hash) values(dono,lote,digest);
 insert into public.clientes select dono,x.cliente_id,x.empresa,x.contato,x.email_aceite,x.segmento,x.regiao from jsonb_to_recordset(entrada->'clientes') as x(cliente_id text,empresa text,contato text,email_aceite text,segmento text,regiao text);
 insert into public.vendedores select dono,x.vendedor_id,x.nome,x.regiao from jsonb_to_recordset(entrada->'vendedores') as x(vendedor_id text,nome text,regiao text);
 insert into public.produtos select dono,x.produto_id,x.nome,x.preco_unitario,x.custo_unitario,x.escopo from jsonb_to_recordset(entrada->'produtos') as x(produto_id text,nome text,preco_unitario numeric,custo_unitario numeric,escopo text);
 insert into public.metas select dono,x.mes,x.meta_vendas_ganhas from jsonb_to_recordset(entrada->'metas') as x(mes date,meta_vendas_ganhas numeric);
 for p in select value from jsonb_array_elements(entrada->'propostas') loop
 if coalesce((p->>'versao')::int,1)<>1 then raise exception 'Carga inicial exige v1'; end if;
 insert into public.propostas(owner_id,proposta_id,versao,cliente_id,vendedor_id,produto_id,regiao,canal,data_criacao,data_fechamento,validade,etapa,quantidade,preco_unitario,desconto_pct,custo_total,aprovacao_desconto,condicao_pagamento,motivo_perda,proxima_acao,batch_id)
 values(dono,p->>'proposta_id',1,p->>'cliente_id',p->>'vendedor_id',p->>'produto_id',p->>'regiao',p->>'canal',(p->>'data_criacao')::date,(p->>'data_fechamento')::date,(p->>'validade')::date,p->>'etapa',(p->>'quantidade')::int,(p->>'preco_unitario')::numeric,(p->>'desconto_pct')::numeric,(p->>'custo_total')::numeric,p->>'aprovacao_desconto',p->>'condicao_pagamento',p->>'motivo_perda',coalesce(p->>'proxima_acao',''),lote);
 insert into public.historico_propostas(owner_id,proposta_id,versao,para,origem) values(dono,p->>'proposta_id',1,p->>'etapa','carga_inicial:'||lote);
 total:=total+1;
 end loop;
 return jsonb_build_object('estado','importado','propostas',total);
end $$;
revoke all on function public.importar_inicial(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.importar_inicial(uuid,text,text,jsonb) to service_role;
commit;
