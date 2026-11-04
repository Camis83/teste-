# Evidências do laboratório

Validação local de 03/11/2026, America/Sao_Paulo. Branch `feat/atlas-crm-laboratorio`. O commit é o que contém este relatório (`git log -1 --oneline`), sem publicação remota. Os arquivos recebidos e suas ausências estão em [ENTRADAS.md](ENTRADAS.md).

| Verificação         | Esperado                              | Observado / evidência                                                                                           |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm ci`            | Instalação reproduzível com lockfile  | Passou; dependências fixadas e integridades verificadas pelo npm                                                |
| `npm run typecheck` | Tipos e rotas coerentes               | Passou; `next typegen` prepara também um checkout novo                                                          |
| `npm test`          | Regras, indicadores, RLS e transações | 46 testes passaram, 4 arquivos; sem testes pulados                                                              |
| `npm run build`     | Build de produção completo            | Passou; rotas comerciais dinâmicas, Proxy de sessão compilado                                                   |
| `npm run test:e2e`  | Primeiro fluxo no navegador           | Um cenário completo passou no Chromium; adaptador Auth/Supabase **simulado**, esquema PostgreSQL real em PGlite |
| Auditoria npm       | Avisos conhecidos nas dependências    | Nenhuma vulnerabilidade reportada na consulta de todas as dependências                                          |

## Cobertura e comportamento

- SQL: leitura isolada de A/B; anônimo bloqueado; escrita direta e alçada editável pelo usuário bloqueadas; FKs impedem referência cruzada; números inválidos rejeitados; valores recalculados; histórico e persistência após atualização; conflito de concorrência otimista e reemissão com somente uma vigente.
- Ganho: papel gerencial, margem configurada e aprovação de desconto exigidos; qualificação, validade expirada e margem baixa bloqueiam; uma transação produz ganho + evento + saída pendente. Repetição é no-op. Falha simulada na outbox reverte ganho/processamento/histórico. Proposta ganha fica imutável. Nenhuma mensagem é enviada.
- Importação: mesmo lote/hash não duplica nem desfaz uma edição; lote conflitante registra revisão sem sobrescrever dados; aluno não executa a importação. CSV com BOM, aspas e ponto e vírgula; rejeição de duplicatas/cabeçalhos/vínculos/derivados divergentes; aritmética inteira na conferência dos centavos.
- Indicadores: novembro não altera maio-outubro; versão antiga não entra nas contagens; filtros afetam denominadores; propostas com alerta permanecem na carteira; metas e razões ausentes não viram zero fictício.
- Dry-run de aceite: data inclusiva 30/11/2026, remetente/origem, assuntos Re/Fwd e códigos múltiplos, moeda/valor/pagamento, versão, instruções no corpo, condição, etapa, margem e alçada. Elegibilidade não grava banco. Não existe uma ponte Gmail real nesta entrega.
- E2E: rota protegida → erro de login → login válido → cadastrar 118/v1 fictícia → líquido R$ 43.200,00 → alerta mantém proposta visível → editar próxima ação → aguardar confirmação e recarregar → detalhe persistido → busca e filtro com vazio → dashboard com pipeline R$ 43.200,00 e ponderado R$ 32.400,00 → fila sem envio → logout → rota protegida novamente. Login móvel sem transbordamento horizontal.

## Capturas do primeiro fluxo

As capturas contêm apenas uma fixture, não a base oficial. A validade 2099 foi escolhida **apenas para esse teste isolado**, sem alterar condições operacionais. A ausência de política oficial gera alertas deliberadamente.

- [Login](fluxo-login.png)
- [Detalhe após editar e recarregar](fluxo-detalhe.png)
- [Dashboard](fluxo-dashboard.png)
- [Login no celular](fluxo-login-mobile.png)

## Limites e pendências reais

Sem `CONFIGURACAO-DA-TURMA.txt`, o Supabase hospedado, as contas operacionais e o destino Vercel não foram configurados. Não houve push, PR remoto, merge ou deploy. Nenhuma URL publicada foi verificada.

RLS foi exercitada no PostgreSQL embarcado com funções de identidade de teste; falta repetir com JWTs de dois usuários reais no Supabase. O E2E usa adaptador local de Auth/PostgREST e dados fictícios: não comprova OAuth, renovação real de sessão, conectividade remota nem persistência após reinício do banco. Concorrência de múltiplas conexões/instâncias deve ser homologada no Supabase real; os testes locais confirmam controle de versões e repetição serial.

Sem CSVs/cadastros oficiais, não foi possível validar cardinalidade, CP1 ou a diferença oficial de 60 para 61 ganhos. Sem a política comercial, a margem mínima e suas alçadas não são configuradas por suposição. Sem a matriz original, não se declara homologação integral do contrato. Envio, worker, timeout e reconciliação de e-mail não foram implementados nesta etapa.

A configuração da nuvem salvou `install_script` com `npm ci`, `start_skill` com diretório, startup e verificações, e os nomes das duas variáveis públicas Supabase. A política de rede original foi preservada. O salvamento é um rascunho: não executa scripts, não publica a configuração nem comprova restauração em outra tarefa. Nas configurações do ambiente, revise e salve o rascunho e publique quando os pré-requisitos forem preenchidos. A publicação da aplicação Vercel é uma operação separada.
