/** Os 66 livros da Bíblia (cânon protestante, nomes da Almeida). Igual à tabela livros_biblia. */
export type Livro = { id: string; nome: string; abrev: string; testamento: "AT" | "NT"; capitulos: number };

const L = (id: string, nome: string, abrev: string, testamento: "AT" | "NT", capitulos: number): Livro => ({
  id,
  nome,
  abrev,
  testamento,
  capitulos,
});

export const LIVROS: Livro[] = [
  L("gn", "Gênesis", "Gn", "AT", 50), L("ex", "Êxodo", "Êx", "AT", 40), L("lv", "Levítico", "Lv", "AT", 27),
  L("nm", "Números", "Nm", "AT", 36), L("dt", "Deuteronômio", "Dt", "AT", 34), L("js", "Josué", "Js", "AT", 24),
  L("jz", "Juízes", "Jz", "AT", 21), L("rt", "Rute", "Rt", "AT", 4), L("1sm", "1 Samuel", "1Sm", "AT", 31),
  L("2sm", "2 Samuel", "2Sm", "AT", 24), L("1rs", "1 Reis", "1Rs", "AT", 22), L("2rs", "2 Reis", "2Rs", "AT", 25),
  L("1cr", "1 Crônicas", "1Cr", "AT", 29), L("2cr", "2 Crônicas", "2Cr", "AT", 36), L("ed", "Esdras", "Ed", "AT", 10),
  L("ne", "Neemias", "Ne", "AT", 13), L("et", "Ester", "Et", "AT", 10), L("job", "Jó", "Jó", "AT", 42),
  L("sl", "Salmos", "Sl", "AT", 150), L("pv", "Provérbios", "Pv", "AT", 31), L("ec", "Eclesiastes", "Ec", "AT", 12),
  L("ct", "Cânticos", "Ct", "AT", 8), L("is", "Isaías", "Is", "AT", 66), L("jr", "Jeremias", "Jr", "AT", 52),
  L("lm", "Lamentações", "Lm", "AT", 5), L("ez", "Ezequiel", "Ez", "AT", 48), L("dn", "Daniel", "Dn", "AT", 12),
  L("os", "Oseias", "Os", "AT", 14), L("jl", "Joel", "Jl", "AT", 3), L("am", "Amós", "Am", "AT", 9),
  L("ob", "Obadias", "Ob", "AT", 1), L("jn", "Jonas", "Jn", "AT", 4), L("mq", "Miqueias", "Mq", "AT", 7),
  L("na", "Naum", "Na", "AT", 3), L("hc", "Habacuque", "Hc", "AT", 3), L("sf", "Sofonias", "Sf", "AT", 3),
  L("ag", "Ageu", "Ag", "AT", 2), L("zc", "Zacarias", "Zc", "AT", 14), L("ml", "Malaquias", "Ml", "AT", 4),
  L("mt", "Mateus", "Mt", "NT", 28), L("mc", "Marcos", "Mc", "NT", 16), L("lc", "Lucas", "Lc", "NT", 24),
  L("jo", "João", "Jo", "NT", 21), L("at", "Atos", "At", "NT", 28), L("rm", "Romanos", "Rm", "NT", 16),
  L("1co", "1 Coríntios", "1Co", "NT", 16), L("2co", "2 Coríntios", "2Co", "NT", 13), L("gl", "Gálatas", "Gl", "NT", 6),
  L("ef", "Efésios", "Ef", "NT", 6), L("fp", "Filipenses", "Fp", "NT", 4), L("cl", "Colossenses", "Cl", "NT", 4),
  L("1ts", "1 Tessalonicenses", "1Ts", "NT", 5), L("2ts", "2 Tessalonicenses", "2Ts", "NT", 3),
  L("1tm", "1 Timóteo", "1Tm", "NT", 6), L("2tm", "2 Timóteo", "2Tm", "NT", 4), L("tt", "Tito", "Tt", "NT", 3),
  L("fm", "Filemom", "Fm", "NT", 1), L("hb", "Hebreus", "Hb", "NT", 13), L("tg", "Tiago", "Tg", "NT", 5),
  L("1pe", "1 Pedro", "1Pe", "NT", 5), L("2pe", "2 Pedro", "2Pe", "NT", 3), L("1jo", "1 João", "1Jo", "NT", 5),
  L("2jo", "2 João", "2Jo", "NT", 1), L("3jo", "3 João", "3Jo", "NT", 1), L("jd", "Judas", "Jd", "NT", 1),
  L("ap", "Apocalipse", "Ap", "NT", 22),
];

const POR_ID = new Map(LIVROS.map((l) => [l.id, l]));
export const livro = (id: string) => POR_ID.get(id);

/** "Mateus 5" ou "Mateus 5–7" (livros de 1 capítulo: só o nome). */
export function formatarLeitura(livroId: string, inicio: number, fim: number): string {
  const l = livro(livroId);
  if (!l) return livroId;
  if (l.capitulos === 1) return l.nome;
  return inicio === fim ? `${l.nome} ${inicio}` : `${l.nome} ${inicio}–${fim}`;
}

export const totalCapitulos = (testamento?: "AT" | "NT") =>
  LIVROS.filter((l) => !testamento || l.testamento === testamento).reduce((s, l) => s + l.capitulos, 0);

export const EMOJIS_REACAO = ["🙏", "🔥", "❤️", "📖", "🙌"] as const;
export type EmojiReacao = (typeof EMOJIS_REACAO)[number];
