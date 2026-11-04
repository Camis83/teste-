# Compatibilidade consultada

Consulta realizada em 03/11/2026. As páginas dos sites nextjs.org e supabase.com não estavam liberadas no proxy; foram usadas as fontes oficiais no GitHub e os metadados do registro npm, com TLS verificado.

- [Next.js: instalação, fonte oficial](https://github.com/vercel/next.js/blob/canary/docs/01-app/01-getting-started/01-installation.mdx): Node mínimo 20.9, App Router e build suportado com Webpack. `next@16.4.5` declara Node >=20.9 e React 19 compatível.
- [Supabase: SSR, fonte oficial](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/server-side/creating-a-client.mdx): sessões em cookies com `@supabase/ssr`, chave pública e URL. A aplicação valida usuário com `getUser`, não confia apenas na presença de cookie.
- `@supabase/ssr@0.12.7` exige `supabase-js ^2.114.0`; escolhido `2.118.0`, Node >=22. Node fixado em `24.22.1`, React/React DOM `19.3.1`, TypeScript `7.0.2`.
- Dependências diretas sem intervalos, dependências transitivas com integridade no `package-lock.json`. `npm ci` reproduz a instalação. O build e a checagem de tipos validam a combinação neste ambiente. Vercel usa preset Next.js e Node 24 configurável no projeto de destino.
- Fonte: [Montserrat oficial](https://github.com/google/fonts/tree/main/ofl/montserrat). Licença em `public/marca/OFL.txt`.

As URLs documentam as fontes consultadas; não são integrações externas da aplicação.
