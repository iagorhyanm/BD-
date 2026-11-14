import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente com a SERVICE ROLE — ignora o RLS.
 *
 * ⚠️  Uso EXCLUSIVO no servidor, e só depois de conferir a permissão
 * do usuário (ex.: `requireEdg()`). O import "server-only" acima faz o
 * build falhar se este arquivo for importado por código do navegador.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
