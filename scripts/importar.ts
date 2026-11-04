import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { lerCSV, validarCarga } from "../lib/importacao.ts";
// Execute apenas no terminal administrativo. Nunca copie chaves para o Git ou para NEXT_PUBLIC_*.
const [pasta, lote] = process.argv.slice(2),
  dono = process.env.ATLAS_IMPORT_OWNER_ID,
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!pasta || !lote || !dono || !url || !key)
  throw new Error(
    "Informe pasta, lote e variáveis NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ATLAS_IMPORT_OWNER_ID no ambiente seguro.",
  );
const arquivos = {
  clientes: "cadastros/clientes.csv",
  vendedores: "cadastros/vendedores.csv",
  produtos: "cadastros/produtos.csv",
  metas: "cadastros/metas.csv",
  propostas: "dados/vendas_atlas_tratada.csv",
};
const entrada: Record<string, Record<string, string | null>[]> = {},
  hash = createHash("sha256");
for (const [tipo, nome] of Object.entries(arquivos)) {
  const conteudo = readFileSync(resolve(pasta, nome));
  hash.update(nome).update("\0").update(conteudo).update("\0");
  entrada[tipo] = lerCSV(
    new TextDecoder("utf-8", { fatal: true }).decode(conteudo),
    tipo,
  );
}
validarCarga(entrada);
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await db.rpc("importar_inicial", {
  dono,
  lote,
  digest: hash.digest("hex"),
  entrada,
});
if (error) throw new Error(`Importação rejeitada: ${error.message}`);
console.log(JSON.stringify(data, null, 2));
if (data.estado === "conflito") process.exitCode = 2;
