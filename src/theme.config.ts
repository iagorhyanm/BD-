/**
 * ============================================================
 *  TEMA DO BIBLERATS — edite só este arquivo para trocar
 *  nome, logo e cores do sistema inteiro.
 * ============================================================
 *
 * Cores: use qualquer cor CSS (hex "#1e3a5f", "rgb(...)", "oklch(...)").
 * Logo: coloque a imagem em /public (ex.: /public/logo.svg) e aponte aqui.
 * Ícones do app instalado (PWA) ficam em /public/icons.
 */
export const tema = {
  nome: "BibleRats",
  nomeCurto: "BibleRats",
  descricao: "Leia a Bíblia todo dia com seus amigos: desafios, sequência e placar.",
  /** Frase curta exibida no login e no cadastro. */
  slogan: "Leitura bíblica diária, em grupo.",
  logo: "/logo.png",

  cores: {
    /** Cor principal (verde do logo): botões, links, destaques. */
    primaria: "#0b5c3e",
    /** Texto sobre a cor principal (creme do logo). */
    primariaTexto: "#fbf6ea",
    /** Cor de destaque (sequência 🔥, selos, indicadores). */
    destaque: "#e9a83a",
    destaqueTexto: "#21242c",
    /** Fundo das páginas (creme claro). */
    fundo: "#f8f4ea",
    /** Fundo dos cartões. */
    cartao: "#ffffff",
    /** Texto principal (grafite do logo). */
    texto: "#21242c",
    /** Texto secundário (legendas). Contraste ≥ 4.5:1 sobre o fundo. */
    textoSuave: "#585d68",
    /** Bordas. */
    borda: "#e5dfcf",
    /** Fundo de áreas neutras (abas, hover). */
    neutro: "#eee8d8",
    /** Erros e ações destrutivas. */
    perigo: "#c0392b",
    /** Cor do anel de foco (navegação por teclado). */
    foco: "#e9a83a",
  },


  /** Arredondamento dos cantos. */
  raio: "0.75rem",
} as const;

/** Gera as variáveis CSS do shadcn/ui a partir do tema. */
export function cssVariaveisDoTema(): string {
  const c = tema.cores;
  return `:root{
--background:${c.fundo};
--foreground:${c.texto};
--card:${c.cartao};
--card-foreground:${c.texto};
--popover:${c.cartao};
--popover-foreground:${c.texto};
--primary:${c.primaria};
--primary-foreground:${c.primariaTexto};
--secondary:${c.neutro};
--secondary-foreground:${c.texto};
--muted:${c.neutro};
--muted-foreground:${c.textoSuave};
--accent:${c.neutro};
--accent-foreground:${c.texto};
--destaque:${c.destaque};
--destaque-foreground:${c.destaqueTexto};
--destructive:${c.perigo};
--border:${c.borda};
--input:${c.borda};
--ring:${c.foco};
--radius:${tema.raio};
--sidebar:${c.primaria};
--sidebar-foreground:${c.primariaTexto};
--sidebar-primary:${c.destaque};
--sidebar-primary-foreground:${c.destaqueTexto};
--sidebar-accent:color-mix(in oklab, ${c.primariaTexto} 12%, transparent);
--sidebar-accent-foreground:${c.primariaTexto};
--sidebar-border:color-mix(in oklab, ${c.primariaTexto} 15%, transparent);
--sidebar-ring:${c.foco};
}`;
}
