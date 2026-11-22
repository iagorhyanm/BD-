import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: [
    // Tudo, exceto arquivos estáticos, imagens, ícones e manifest do PWA.
    "/((?!api/cron|_next/static|_next/image|favicon.ico|icons/|logo.svg|manifest.webmanifest|sw.js|offline|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
