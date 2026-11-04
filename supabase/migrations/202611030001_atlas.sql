begin;
create table public.clientes(owner_id uuid not null references auth.users(id),cliente_id text not null,empresa text not null,contato text not null,email_aceite text not null,segmento text,regiao text,primary key(owner_id,cliente_id));
create table public.vendedores(owner_id uuid not null references auth.users(id),vendedor_id text not null,nome text not null,regiao text not null,primary key(owner_id,vendedor_id));
create table public.produtos(owner_id uuid not null references auth.users(id),produto_id text not null,nome text not null,preco_unitario numeric(14,2) not null check(preco_unitario>0),custo_unitario numeric(14,2) not null check(custo_unitario>=0),escopo text,primary key(owner_id,produto_id));
create table public.metas(owner_id uuid not null references auth.users(id),mes date not null,meta_vendas_ganhas numeric(14,2) not null check(meta_vendas_ganhas>0),primary key(owner_id,mes));
create table public.politica_comercial(owner_id uuid primary key references auth.users(id),margem_minima numeric not null check(margem_minima between 0 and 1),referencia text not null);
create table public.importacoes(owner_id uuid not null references auth.users(id),batch_id text not null,hash text not null,criado_em timestamptz not null default now(),primary key(owner_id,batch_id),unique(owner_id,hash));
create table public.propostas(
 owner_id uuid not null references auth.users(id),proposta_id text not null check(proposta_id ~ '^ATL-2026-[0-9]{4}$'),versao integer not null default 1 check(versao>0),vigente boolean not null default true,
 cliente_id text not null,vendedor_id text not null,produto_id text not null,regiao text not null,canal text not null check(canal in ('Indicacao','Inbound','Outbound')),
 data_criacao date not null, data_fechamento date, validade date not null,etapa text not null check(etapa in ('Qualificacao','Proposta','Negociacao','Ganho','Perdido')),
 quantidade integer not null check(quantidade>0),preco_unitario numeric(14,2) not null check(preco_unitario>0),desconto_pct numeric not null check(desconto_pct between 0 and 1),custo_total numeric(14,2) not null check(custo_total>=0),aprovacao_desconto text,
 probabilidade numeric not null default 0,condicao_pagamento text not null check(length(trim(condicao_pagamento))>0),motivo_perda text,proxima_acao text not null,
 valor_bruto numeric(14,2) not null default 0,valor_liquido numeric(14,2) not null default 0,margem_pct numeric not null default 0,valor_ponderado numeric(14,2) not null default 0,
 row_version integer not null default 1,updated_at timestamptz not null default now(),batch_id text,
 primary key(owner_id,proposta_id,versao),
 foreign key(owner_id,cliente_id) references public.clientes(owner_id,cliente_id),foreign key(owner_id,vendedor_id) references public.vendedores(owner_id,vendedor_id),foreign key(owner_id,produto_id) references public.produtos(owner_id,produto_id),foreign key(owner_id,batch_id) references public.importacoes(owner_id,batch_id),
 check(data_fechamento is null or data_fechamento>=data_criacao),check(validade>=data_criacao),
 check((etapa in ('Ganho','Perdido'))=(data_fechamento is not null)),check(etapa<>'Perdido' or motivo_perda in ('Preco','Prazo','Concorrente'))
);
create unique index uma_versao_vigente on public.propostas(owner_id,proposta_id) where vigente;
create table public.aprovacoes(owner_id uuid not null references auth.users(id),aprovacao_id text not null,proposta_id text,lote text,versao integer,limite_desconto numeric not null check(limite_desconto between 0 and 1),aprovador text not null,aprovado_em timestamptz not null,primary key(owner_id,aprovacao_id),check((proposta_id is not null and versao is not null) or lote is not null));
create table public.historico_propostas(id uuid primary key default gen_random_uuid(),owner_id uuid not null,proposta_id text not null,versao integer not null,de text,para text not null,ocorrido_em timestamptz not null default now(),origem text not null,provider_message_id text,ator uuid,foreign key(owner_id,proposta_id,versao) references public.propostas(owner_id,proposta_id,versao));
create table public.email_processamentos(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),mailbox_id text not null,provider_message_id text not null,provider_thread_id text,recebido_em timestamptz not null default now(),codigo_extraido text,versao_extraida integer,decisao text,motivo text,estado text not null,correlation_id uuid not null default gen_random_uuid(),unique(mailbox_id,provider_message_id),unique(owner_id,id));
create table public.email_outbox(id uuid primary key default gen_random_uuid(),owner_id uuid not null,proposta_id text not null,versao integer not null,processamento_id uuid not null,destinatario_validado text not null,assunto text not null,corpo text not null,tipo_confirmacao text not null default 'aceite',estado text not null default 'pendente' check(estado in ('pendente','enviando','enviado','falhou','envio_incerto')),provider_sent_message_id text,tentativas integer not null default 0,erro text,updated_at timestamptz not null default now(),foreign key(owner_id,proposta_id,versao) references public.propostas(owner_id,proposta_id,versao),foreign key(owner_id,processamento_id) references public.email_processamentos(owner_id,id),unique(owner_id,proposta_id,versao,tipo_confirmacao));

create function public.calcular_proposta() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' and old.etapa='Ganho' then raise exception 'Proposta ganha é imutável'; end if;
 new.valor_bruto:=new.quantidade*new.preco_unitario;
 new.valor_liquido:=round(new.valor_bruto*(1-new.desconto_pct),2);
 new.margem_pct:=case when new.valor_liquido>0 then (new.valor_liquido-new.custo_total)/new.valor_liquido else 0 end;
 new.probabilidade:=case new.etapa when 'Qualificacao' then .20 when 'Proposta' then .50 when 'Negociacao' then .75 when 'Ganho' then 1 else 0 end;
 new.valor_ponderado:=case when new.etapa in ('Qualificacao','Proposta','Negociacao') then round(new.valor_liquido*new.probabilidade,2) else 0 end;
 new.updated_at:=now();
 if TG_OP='UPDATE' then new.row_version:=old.row_version+1; end if;
 return new;
end $$;
create trigger calcular before insert or update on public.propostas for each row execute function public.calcular_proposta();

-- Apenas leitura direta. Escritas passam por funções que revalidam identidade e alçada.
do $$ declare t text; begin
 foreach t in array array['clientes','vendedores','produtos','metas','politica_comercial','importacoes','propostas','aprovacoes','historico_propostas','email_processamentos','email_outbox'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy dono_leitura on public.%I for select to authenticated using ((select auth.uid())=owner_id)',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;

create function public.salvar_proposta(dados jsonb,esperada integer default null,reemitir boolean default false) returns integer language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.propostas; v integer:=1; anterior text; r text;
begin
 if u is null then raise exception 'Autenticação necessária'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text || (dados->>'proposta_id'),0));
 select * into p from public.propostas where owner_id=u and proposta_id=dados->>'proposta_id' and vigente for update;
 if found then
  if p.etapa in ('Ganho','Perdido') then raise exception 'Proposta encerrada é imutável'; end if;
  if esperada is null or esperada<>p.row_version then raise exception 'Conflito: recarregue a proposta'; end if;
  v:=p.versao; anterior:=p.etapa;
  if reemitir then update public.propostas set vigente=false where owner_id=u and proposta_id=p.proposta_id and versao=p.versao; v:=v+1; end if;
 elsif esperada is not null or reemitir then raise exception 'Proposta não encontrada';
 end if;
 if dados->>'etapa' not in ('Qualificacao','Proposta','Negociacao','Perdido') then raise exception 'Transição não permitida'; end if;
 select regiao into strict r from public.vendedores where owner_id=u and vendedor_id=dados->>'vendedor_id';
 if p.proposta_id is not null and not reemitir then
 update public.propostas set cliente_id=dados->>'cliente_id',vendedor_id=dados->>'vendedor_id',produto_id=dados->>'produto_id',regiao=r,canal=dados->>'canal',validade=(dados->>'validade')::date,etapa=dados->>'etapa',quantidade=(dados->>'quantidade')::int,preco_unitario=(dados->>'preco_unitario')::numeric,desconto_pct=(dados->>'desconto_pct')::numeric,custo_total=(dados->>'custo_total')::numeric,condicao_pagamento=trim(dados->>'condicao_pagamento'),proxima_acao=trim(dados->>'proxima_acao'),data_fechamento=case when dados->>'etapa'='Perdido' then (now() at time zone 'America/Sao_Paulo')::date end,motivo_perda=dados->>'motivo_perda'
 where owner_id=u and proposta_id=p.proposta_id and versao=v;
 else
 insert into public.propostas(owner_id,proposta_id,versao,cliente_id,vendedor_id,produto_id,regiao,canal,data_criacao,validade,etapa,quantidade,preco_unitario,desconto_pct,custo_total,condicao_pagamento,proxima_acao,data_fechamento,motivo_perda,row_version)
 values(u,dados->>'proposta_id',v,dados->>'cliente_id',dados->>'vendedor_id',dados->>'produto_id',r,dados->>'canal',coalesce(p.data_criacao,(now() at time zone 'America/Sao_Paulo')::date),(dados->>'validade')::date,dados->>'etapa',(dados->>'quantidade')::int,(dados->>'preco_unitario')::numeric,(dados->>'desconto_pct')::numeric,(dados->>'custo_total')::numeric,trim(dados->>'condicao_pagamento'),trim(dados->>'proxima_acao'),case when dados->>'etapa'='Perdido' then (now() at time zone 'America/Sao_Paulo')::date end,dados->>'motivo_perda',coalesce(p.row_version+1,1));
 end if;
 insert into public.historico_propostas(owner_id,proposta_id,versao,de,para,origem,ator) values(u,dados->>'proposta_id',v,anterior,dados->>'etapa',case when reemitir then 'reemissao' else 'formulario' end,u);
 return v;
end $$;

-- Aceite manual de laboratório por gerente/admin. Não representa verificação de Gmail.
-- Identidade/role vêm do JWT verificado, nunca de user_metadata nem do formulário.
create function public.registrar_ganho(codigo text,versao_esperada integer,row_esperada integer,confirmar boolean default false) returns text language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.propostas; limite numeric; contato text; pid uuid;
begin
 if u is null or coalesce(auth.jwt()->'app_metadata'->>'papel','') not in ('gerente','admin') then raise exception 'Alçada gerencial necessária'; end if;
 if confirmar is not true then raise exception 'Confirmação explícita necessária'; end if;
 select * into p from public.propostas where owner_id=u and proposta_id=codigo and vigente for update;
 if not found then raise exception 'Proposta não encontrada'; end if;
 if p.versao is distinct from versao_esperada then raise exception 'Versão não vigente'; end if;
 if p.etapa='Ganho' then return 'sem_efeitos'; end if;
 if p.row_version is distinct from row_esperada then raise exception 'Conflito: recarregue a proposta'; end if;
 if p.etapa not in ('Proposta','Negociacao') or p.validade<(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Etapa ou validade não elegível'; end if;
 select margem_minima into limite from public.politica_comercial where owner_id=u;
 if limite is null or p.valor_liquido<=0 or p.margem_pct<limite then raise exception 'Política de margem ausente ou não atendida'; end if;
 if p.desconto_pct>0 and not exists(select 1 from public.aprovacoes a where a.owner_id=u and a.aprovacao_id=p.aprovacao_desconto and a.limite_desconto>=p.desconto_pct and ((a.proposta_id=p.proposta_id and a.versao=p.versao) or (a.lote is not null and a.lote=p.batch_id))) then raise exception 'Desconto sem aprovação válida'; end if;
 select email_aceite into contato from public.clientes where owner_id=u and cliente_id=p.cliente_id;
 if contato is null or contato !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Contato inválido'; end if;
 insert into public.email_processamentos(owner_id,mailbox_id,provider_message_id,codigo_extraido,versao_extraida,decisao,motivo,estado) values(u,'manual:'||u::text,codigo||'/v'||p.versao,codigo,p.versao,'ganho_manual','Aceite manual confirmado por gerente; Gmail não integrado','concluido') returning id into pid;
 update public.propostas set etapa='Ganho',data_fechamento=(now() at time zone 'America/Sao_Paulo')::date where owner_id=u and proposta_id=codigo and versao=p.versao;
 insert into public.historico_propostas(owner_id,proposta_id,versao,de,para,origem,ator) values(u,codigo,p.versao,p.etapa,'Ganho','aceite_manual_laboratorio',u);
 insert into public.email_outbox(owner_id,proposta_id,versao,processamento_id,destinatario_validado,assunto,corpo) values(u,codigo,p.versao,pid,contato,'Confirmação de aceite — '||codigo,'Aceite registrado. Informe nome e e-mail do contato de implantação e duas opções de horário, sujeitas à validação de agenda.');
 return 'ganho_registrado';
end $$;
revoke all on function public.salvar_proposta(jsonb,integer,boolean) from public,anon;
grant execute on function public.salvar_proposta(jsonb,integer,boolean) to authenticated;
revoke all on function public.registrar_ganho(text,integer,integer,boolean) from public,anon;
grant execute on function public.registrar_ganho(text,integer,integer,boolean) to authenticated;
revoke all on function public.calcular_proposta() from public,anon,authenticated;
commit;
