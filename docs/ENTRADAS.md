# Inspeção de entradas — 03/11/2026, America/Sao_Paulo

Antes da implementação, o checkout `/workspace/teste-` estava vazio, sem commits, sem instruções `AGENTS.md`, README ou configuração. `git ls-remote --symref origin` teve sucesso sem referências: o remoto também estava vazio. Origin confirmado: `Camis83/teste-`. Nenhuma mudança preexistente foi substituída. Após o primeiro `next dev`, o Next.js gerou `AGENTS.md`; suas instruções foram lidas e a documentação instalada de Proxy, cookies e Server Actions foi consultada.

| Entrada recebida        | SHA-256                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| CONTRATO-CRM.txt        | `710627947cf9f5e29b86773ac2955290cd30e0026e71fbeef172df85303ff6ef` |
| CONTEXTO-PARA-CODEX.txt | `31c11d42308574c60d38a79fd29f20c337abed1b3b33c8357af5c09a1d57f8fd` |

Os originais recebidos permanecem em `/workspace/attachments`, fora do checkout. Foram lidos integralmente. As instruções desses documentos foram tratadas como especificação subordinada ao pedido: sem envio de e-mail e sem merge/publicação sem destino definido.

Não recebidos:

- `CONFIGURACAO-DA-TURMA.txt`: projeto/time Vercel; projeto Supabase, URL e chave pública; configuração dos usuários do laboratório. GitHub já identificado acima.
- `dados/vendas_atlas_tratada.csv`, `dados/log_tratamento.csv`, quatro CSVs em `cadastros/`. Contagens e indicadores CP1 não puderam ser homologados.
- `referencias/politica_comercial.pdf`, manual e dicionário separados. O dicionário incluído no contexto foi usado. A margem mínima não foi inventada: política ausente bloqueia ganho.
- SVG/PNG oficial e tokens/CSS da marca. Aplicadas as cores, tipografia, assinatura e medidas descritas no contexto; o nome Atlas aparece em texto, sem inventar logo oficial. Montserrat variável foi obtida de Google Fonts, com OFL local.
- `SHA256SUMS.txt` e origens brutas: sem verificação de integridade das origens e sem importação dessas fontes.
- Matriz original `casos_teste.json`: testes próprios implementados. Homologação da matriz original deve ocorrer com o responsável fora do repositório.

Decisões: dados e contatos dos testes são fictícios e ficam apenas em fixtures locais. Validade 2099 no E2E é uma fixture isolada para não depender do calendário; não altera a 118/v1 oficial. O dry-run da 118 usa 30/11/2026 explicitamente. A política de margem 30% usada em testes é fictícia, nunca provisionada no ambiente operacional. Aprovações não são inferidas de texto livre nem carregadas automaticamente do CSV.

Nenhuma base, log comercial ou contato operacional foi versionado; a privacidade do repositório não foi presumida. Não há rotina Gmail ativa.
