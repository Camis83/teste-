# Atlas CRM

CRM de laboratório em Next.js + TypeScript, autenticação e dados Supabase, pronto para configurar um projeto Vercel. Interface em português com os parâmetros Atlas recebidos. Cada aluno consulta apenas seus registros.

Implementado: login/logout; lista com busca e filtros; cadastro/edição e reemissão com validação no servidor; detalhe com histórico; dashboard; fila de confirmações sem envio. O CSV tratado é apenas carga inicial. Não há persistência comercial em localStorage, planilha ou memória no aplicativo.

## Executar

Node `24.22.1` (`.nvmrc`) e npm. Use o checkout existente, sem criar worktrees; cada tarefa na nuvem já é isolada.

```sh
cd /workspace/teste-
npm ci
cp .env.example .env.local
# Preencha somente as variáveis públicas do Supabase para a aplicação.
npm run dev
```

O servidor escuta na porta 3000. Sem configuração, o login mostra a pendência e fica desabilitado; não existe bypass de autenticação nem modo demonstração no aplicativo publicado. As páginas comerciais exigem sessão verificada e renderização dinâmica.

## Supabase

1. Projeto Supabase autorizado pelo usuário: `ymvjsvkcymthnlpklkko`, URL `https://ymvjsvkcymthnlpklkko.supabase.co`. O acesso administrativo e a chave pública ainda precisam estar disponíveis no ambiente seguro.
2. Aplique em ordem, no SQL Editor administrativo ou via Supabase CLI ligada ao projeto autorizado: `supabase/migrations/202611030001_atlas.sql` e `202611030002_importacao.sql`. Migrações são versionadas e de execução única, em transações.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local` e nas variáveis Vercel. Chave privilegiada nunca usa prefixo `NEXT_PUBLIC_`.
4. Crie contas de laboratório pelo administrador do Supabase. Não há inscrição pública neste laboratório. Cada `owner_id` é o UUID de sua conta. Ative política de senhas e limitação de tentativas no Auth do projeto; o login usa a proteção do Supabase.
5. Carregue os cadastros/base por aluno. O responsável configura `politica_comercial` e `aprovacoes` por meio administrativo: margem mínima e alçadas precisam da política original. O frontend não grava essas tabelas. Para o lote aprovado GER-2026-01, `lote` deve corresponder exatamente ao `batch_id` importado e limite a 0.15; GER-2026-118 deve ter `proposta_id=ATL-2026-0118`, `versao=1` e limite 0.10, após confirmação da autoridade.
6. Apenas administrador atribui `app_metadata.papel` (`gerente` ou `admin`) na conta apropriada. Alunos comuns não ganham essa permissão; `user_metadata` não autoriza operações.

Todas as tabelas públicas desta aplicação usam RLS. Leituras exigem `auth.uid() = owner_id`; não há escrita direta por `authenticated`. As FKs incluem proprietário. As funções privilegiadas têm `search_path` fixo, execução restrita e derivam o proprietário da identidade autenticada.

`salvar_proposta` valida versão de concorrência, calcula valores e histórico, impede status Ganho e alterações em encerradas. Reemissão serializa por proprietário/código, preserva anterior, aumenta versão e contador. Só uma versão vigente é permitida pelo banco. Condições reemitidas não herdam a alçada anterior.

`registrar_ganho` é a única transição operacional para Ganho: exige gerente/admin, confirmação explícita, proprietário, versão/contador, etapa, validade no fuso São Paulo, política de margem e aprovação do desconto. Sob bloqueio de linha, grava ganho + histórico + processamento + outbox na mesma transação. Repetição na mesma versão é no-op; falha de outbox reverte a transação. Ganhos são imutáveis. O importador administrativo pode carregar Ganho histórico na carga inicial, sem simular novo aceite ou criar confirmação retroativa.

## Carga inicial

O pacote original não foi recebido; não foram inventadas as contagens oficiais. Confira [entradas e hashes](docs/ENTRADAS.md).

Somente em terminal administrativo seguro, injete `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `ATLAS_IMPORT_OWNER_ID`. Esta chave é opcional para o aplicativo e necessária apenas à importação administrativa. Não a coloque em comandos versionados, logs, navegador ou chat.

```sh
npm run importar -- /caminho/controlado/do/pacote lote-didatico-2026
```

Espera UTF-8 com BOM opcional, separador `;`, decimais com ponto; usa só `dados/vendas_atlas_tratada.csv` e os quatro CSVs em `cadastros/`. O log de tratamento é auditoria, não carga. Preserva códigos, valida cabeçalhos, chaves, vínculos, região e derivados presentes, recalculando novamente no banco. Registra hash SHA-256 conjunto com os nomes dos cinco arquivos e `batch_id`. A carga é transacional.

Mesmo hash é no-op, mesmo depois de edições. Outro lote para proprietário com dados registra conflito em `importacao_conflitos` e não altera registros. Este importador é deliberadamente de carga inicial; mesclagens posteriores exigem revisão administrativa, sem upsert destrutivo. Conflitos aparecem na fila da aplicação. Metas devem cobrir os meses reais recebidos; nenhuma meta de novembro é criada.

## Indicadores

Somente versões vigentes. Filtros de vendedor, região, canal e produto afetam numeradores e denominadores. Vendas usam data de fechamento; carteira permanece atual, com data da consulta. Alertas permanecem na carteira. Metas são globais sem rateio: períodos sem todos os meses completos cadastrados mostram “Meta não cadastrada”. Sem encerradas/ganhas, razões mostram “Não disponível”. Valores do gabarito não alimentam a interface.

## Aceite e e-mail nesta etapa

Ação de aceite **manual de laboratório** disponível apenas a gerente/admin; não afirma validar origem de e-mail. Nenhum envio ou worker existe. A fila mostra pendências, revisões, motivo e correlação. Não foi ativada integração Gmail, gatilho ou rotina.

`lib/aceite.ts` contém validador determinístico dry-run e testes próprios; não é endpoint de confiança para dados do navegador. Futuramente uma ponte autorizada deverá buscar a mensagem original, verificar identidade/autenticidade/allowlist e revalidar tudo na transação antes do ganho. A extração por IA não autoriza escrita. A função manual não pode ser usada pelo classificador como substituto dessa ponte.

Reivindicação de saída, reconciliação de envio incerto e envio Gmail ficam para outra etapa. Não há botão de reenvio cego. Falhas de entrega futuras não devem reverter a venda.

## Verificações

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

E2E exige build prévio e Chromium. Usa `/usr/bin/chromium` se presente, ou `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; em outra máquina execute `npx playwright install --with-deps chromium`. Inicia e encerra seus próprios servidores. Não execute `build` e `dev` simultaneamente sobre `.next`.

Os testes SQL executam as migrações em PostgreSQL embarcado PGlite com funções de identidade de teste. O E2E usa o mesmo esquema, um adaptador **Supabase/Auth simulado** apenas em loopback e contas fictícias. Exercita as páginas reais, formulário, ações de servidor e persistência SQL após recarregar; não certifica a infraestrutura Supabase hospedada. O adaptador não participa do build/deploy. As credenciais nos testes são fixtures sem validade externa.

Veja [evidências e limites](docs/VALIDACAO.md). A homologação real exige repetir com dois usuários no Supabase, base original, matriz do responsável e projeto Vercel autorizado. Concorrência entre conexões reais e persistência após reinício do serviço devem ser confirmadas nesse ambiente.

## Publicação e revisão

Branch enviada ao GitHub: `feat/atlas-crm-laboratorio`. Configuração Vercel em `vercel.json`, CI em `.github/workflows/validacao.yml`. Antes da publicação, configure o time/projeto autorizado e as variáveis públicas do Supabase no Vercel; selecione Node 24. Build: `npm run build`; instalação: `npm ci`.

As branches `main` (base vazia) e `feat/atlas-crm-laboratorio` foram enviadas ao GitHub por solicitação do usuário. A criação da PR está bloqueada pelo acesso de rede à API do GitHub. O usuário autorizou criar um projeto Vercel; o nome preparado é `atlas-crm`, mas a criação e o deploy aguardam autenticação. Não há URL publicada. Consulte [o estado da publicação](docs/PUBLICACAO.md). Não publique os arquivos brutos, logs comerciais ou contatos sem confirmar privacidade/autorização. `.env`, CSVs e origens brutas estão ignorados; nunca versionar dumps ou credenciais. Referências e pacote integral continuam fora do Git.

Pendências exatas em [entradas](docs/ENTRADAS.md): configuração da turma, pacote de dados/cadastros, política comercial e ativos oficiais da marca. [Versões e documentação consultada](docs/VERSOES.md).
