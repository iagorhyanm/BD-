/**
 * ============================================================
 *  TEMA DA BANDINHA — edite só este arquivo para trocar
 *  nome, logo e cores do sistema inteiro.
 * ============================================================
 *
 * Cores: use qualquer cor CSS (hex "#1e3a5f", "rgb(...)", "oklch(...)").
 * Logo: coloque a imagem em /public (ex.: /public/logo.svg) e aponte aqui.
 * Ícones do app instalado (PWA) ficam em /public/icons.
 */
export const tema = {
  nome: "Bandinha · EJC Marabá",
  nomeCurto: "Bandinha",
  descricao: "Gestão da equipe de música do EJC Marabá",
  logo: "/logo.svg",

  cores: {
    /** Cor principal: botões, links, destaques. */
    primaria: "#1f3a5f",
    /** Texto sobre a cor principal. */
    primariaTexto: "#ffffff",
    /** Cor de destaque (detalhes, selos, indicadores). */
    destaque: "#e0a43a",
    destaqueTexto: "#1f2430",
    /** Fundo das páginas. */
    fundo: "#f7f5f0",
    /** Fundo dos cartões. */
    cartao: "#ffffff",
    /** Texto principal. */
    texto: "#1c2230",
    /** Texto secundário (legendas). Contraste ≥ 4.5:1 sobre o fundo. */
    textoSuave: "#5b6372",
    /** Bordas. */
    borda: "#e4e0d6",
    /** Fundo de áreas neutras (abas, hover). */
    neutro: "#efece4",
    /** Erros e ações destrutivas. */
    perigo: "#c0392b",
    /** Cor do anel de foco (navegação por teclado). */
    foco: "#e0a43a",
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
