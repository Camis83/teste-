# Estado da publicação

O usuário solicitou criar uma PR e publicar a aplicação com o banco no Supabase `ymvjsvkcymthnlpklkko`. Também autorizou criar o projeto Vercel; o nome preparado é `atlas-crm`.

## GitHub

- Repositório: [Camis83/teste-](https://github.com/Camis83/teste-).
- Confirmado remoto vazio antes dos envios. Criada `main` com um commit sem arquivos para permitir a PR da primeira implementação.
- Enviadas `main` e `feat/atlas-crm-laboratorio`, verificadas por `git ls-remote`. A implementação original e seus commits foram preservados. A aplicação não foi mesclada na main.
- Autenticação HTTPS Git existente permitiu o push; não foi solicitado token Git adicional.
- API `api.github.com` negada pelo proxy de rede. PR ainda não criada. Corpo preparado em `/tmp/atlas-pr-body.md`; após liberar a API, usar `gh pr create` com base `main` e head `feat/atlas-crm-laboratorio`.
- [Comparar e abrir PR](https://github.com/Camis83/teste-/compare/main...feat/atlas-crm-laboratorio?expand=1). Este link não representa uma PR já criada.

## Supabase e Vercel

- URL autorizada: `https://ymvjsvkcymthnlpklkko.supabase.co`.
- Apenas a URL foi configurada localmente em arquivo ignorado. O login continua desabilitado sem a chave pública; não foi aplicado bypass.
- Ausentes no runtime: `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN` e chave pública Supabase. Também não há autenticações CLI, conexões de provedor ou projeto Vercel local previamente configurados.
- Nenhuma migração remota executada. Nenhum projeto Vercel ou deploy criado. Nenhuma conta, dado ou política do projeto remoto foi alterado.

## Requisitos salvos no rascunho do ambiente

Domínios: `api.github.com`, `ymvjsvkcymthnlpklkko.supabase.co`, `api.supabase.com`, `api.vercel.com`, `vercel.com`. Preservado o preset de gerenciadores de pacotes.

Requisitos de segredo, sem valores: `SUPABASE_ACCESS_TOKEN` limitado a `api.supabase.com`, `VERCEL_TOKEN` limitado a `api.vercel.com`. URL sugerida para `NEXT_PUBLIC_SUPABASE_URL`; requisito já existente de `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` preservado. A chave pública pode ser obtida da administração do Supabase após autenticação autorizada.

O rascunho foi salvo; isso não aplica a rede ou injeta credenciais no runtime. Nas configurações do ambiente, preencher os segredos com segurança, revisar/salvar os domínios e publicar a configuração quando indicado pela interface. Não enviar tokens no chat. Não reutilizar a chave Supabase como credencial Vercel.

Após acesso disponível: inspecionar esquema e histórico de migrações do Supabase sem sobrescrever dados; aplicar as migrações pendentes, validar RLS com usuários reais; criar o projeto Vercel na conta autorizada, configurar as duas variáveis públicas e publicar. Verificar login, persistência e isolamento na URL publicada antes de declarar conclusão. Dados oficiais e política comercial continuam pendentes, portanto ganho permanece bloqueado sem política validada. Envio de e-mail continua fora desta etapa.
