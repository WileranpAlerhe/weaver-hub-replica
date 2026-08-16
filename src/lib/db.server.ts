/* Cliente de banco usado pelo servidor do site (server-only).
 *
 * Não usa a chave de service role: usa a chave publicável + um segredo
 * interno enviado no cabeçalho `x-app-server-secret`. As políticas de acesso
 * do banco só liberam as tabelas `leads` e `fb_settings` quando esse
 * cabeçalho está presente e correto, então nenhum visitante consegue ler ou
 * escrever nessas tabelas com a chave publicável sozinha.
 *
 * Resultado: o app funciona em qualquer host (Lovable, Vercel, domínio
 * próprio) sem nenhuma variável de ambiente configurada.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_URL,
} from "@/lib/public-config";

/** Segredo interno do servidor — nunca chega ao navegador (arquivo .server). */
export const APP_SERVER_SECRET = "fm-mickNSUPkTbK00aaBRdZAAe9mnzgdysTIEC6883s";

function buildFetch(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    // Chaves novas (sb_publishable_*) não são JWT: só o header apikey vale.
    if (apiKey.startsWith("sb_") && headers.get("Authorization") === `Bearer ${apiKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", apiKey);
    headers.set("x-app-server-secret", APP_SERVER_SECRET);
    return fetch(input, { ...init, headers });
  };
}

let _db: ReturnType<typeof createDbClient> | undefined;

function createDbClient() {
  const url = process.env["SUPABASE_URL"] || PUBLIC_SUPABASE_URL;
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return createClient<Database>(url, key, {
    global: { fetch: buildFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export function getDb() {
  if (!_db) _db = createDbClient();
  return _db;
}
