import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/** Rotas que não exigem login. */
const ROTAS_PUBLICAS = ["/login", "/cadastro", "/convite", "/offline"];

function ehPublica(pathname: string) {
  return ROTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Renova a sessão a cada requisição e protege as rotas internas. */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { pathname } = request.nextUrl;

  // Valida o JWT localmente (chaves assimétricas do Supabase), sem ida ao
  // servidor de autenticação a cada página. Renova a sessão quando expira.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;

  if (!user && !ehPublica(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?voltar=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/cadastro")) {
    const url = request.nextUrl.clone();
    const voltar = request.nextUrl.searchParams.get("voltar");
    url.pathname = voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
