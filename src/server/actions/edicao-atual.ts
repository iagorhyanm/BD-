"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { COOKIE_EDICAO } from "@/lib/edicao";

/** Troca a edição que o usuário está visualizando (preferência pessoal, via cookie). */
export async function escolherEdicao(id: string) {
  await requireStaff();
  (await cookies()).set(COOKIE_EDICAO, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
