import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ItemFeed = {
  id: string;
  userId: string;
  nome: string;
  fotoPerfil: string | null;
  data: string;
  leitura: string;
  tituloDia: string | null;
  noPrazo: boolean;
  minutos: number | null;
  versiculo: string | null;
  anotacao: string | null;
  foto: string | null;
  criadoEm: string;
  reacoes: { emoji: string; total: number; minha: boolean }[];
  comentarios: number;
};

const CAMPOS =
  "id, user_id, data, no_prazo, minutos, versiculo, anotacao, foto_path, criado_em, profiles!checkins_user_id_fkey(nome, foto_path), plano_dias(leitura, titulo), reacoes(emoji, user_id), comentarios(count)";

/**
 * Check-ins visíveis para o usuário (os próprios e os dos colegas de grupo — o RLS garante).
 * Filtros opcionais: só de certas pessoas e/ou dentro de um período.
 */
export async function carregarFeed(
  euId: string,
  filtros: { userIds?: string[]; de?: string; ate?: string; limite?: number; ids?: string[] } = {},
): Promise<ItemFeed[]> {
  const supabase = await createClient();
  let q = supabase
    .from("checkins")
    .select(CAMPOS)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(filtros.limite ?? 30);
  if (filtros.userIds) q = q.in("user_id", filtros.userIds.length ? filtros.userIds : ["00000000-0000-0000-0000-000000000000"]);
  if (filtros.ids) q = q.in("id", filtros.ids);
  if (filtros.de) q = q.gte("data", filtros.de);
  if (filtros.ate) q = q.lte("data", filtros.ate);
  const { data, error } = await q;
  if (error) console.error("erro ao carregar o feed", error.code, error.message);
  const linhas = data ?? [];

  // Fotos: URLs temporárias numa única chamada.
  const caminhos = [...new Set(linhas.map((l) => l.foto_path).filter(Boolean) as string[])];
  const urls = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("checkins").createSignedUrls(caminhos, 3600);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);
  }

  return linhas.map((l) => {
    const porEmoji = new Map<string, { total: number; minha: boolean }>();
    for (const r of l.reacoes ?? []) {
      const atual = porEmoji.get(r.emoji) ?? { total: 0, minha: false };
      atual.total++;
      if (r.user_id === euId) atual.minha = true;
      porEmoji.set(r.emoji, atual);
    }
    return {
      id: l.id,
      userId: l.user_id,
      nome: (l.profiles as { nome: string } | null)?.nome ?? "Alguém",
      fotoPerfil: (l.profiles as { foto_path: string | null } | null)?.foto_path ?? null,
      data: l.data,
      leitura: (l.plano_dias as { leitura: string } | null)?.leitura ?? "",
      tituloDia: (l.plano_dias as { titulo: string | null } | null)?.titulo ?? null,
      noPrazo: l.no_prazo,
      minutos: l.minutos,
      versiculo: l.versiculo,
      anotacao: l.anotacao,
      foto: l.foto_path ? urls.get(l.foto_path) ?? null : null,
      criadoEm: l.criado_em,
      reacoes: [...porEmoji.entries()].map(([emoji, v]) => ({ emoji, ...v })),
      comentarios: l.comentarios?.[0]?.count ?? 0,
    };
  });
}
