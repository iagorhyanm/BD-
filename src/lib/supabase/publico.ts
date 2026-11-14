import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente ANÔNIMO (sem sessão, sem cookies) para a página pública de inscrição.
 * Sempre age como o papel "anon": só consegue o que o RLS libera ao público.
 */
export function createPublicClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** URL pública de um arquivo do bucket "capas". */
export function urlCapa(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/capas/${path}`;
}
