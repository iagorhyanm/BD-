import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormConfig } from "./form-config";

export const metadata: Metadata = { title: "Textos e aviso" };

export default async function AdminConfigPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("app_config").select("*").eq("id", 1).single();
  return (
    <>
      <CabecalhoPagina titulo="Textos e aviso" voltar={{ href: "/admin", rotulo: "Administração" }} />
      <FormConfig config={data!} />
    </>
  );
}
