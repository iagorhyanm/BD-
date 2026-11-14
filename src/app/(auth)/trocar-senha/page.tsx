import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { TrocarSenhaForm } from "./trocar-senha-form";

export const metadata: Metadata = { title: "Trocar senha" };

export default async function TrocarSenhaPage() {
  const perfil = await requireStaff({ permitirTrocaPendente: true });
  return <TrocarSenhaForm nome={perfil.nome.split(" ")[0]} obrigatoria={perfil.precisa_trocar_senha} />;
}
