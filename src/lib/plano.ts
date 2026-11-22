/**
 * Plano de leitura: interpreta referências bíblicas escritas à mão
 * ("Gn 1-3; Sl 23", "1 Coríntios 13", "Mateus 5:1-12", "Salmos 1, 2 e 3")
 * e datas vindas de planilhas.
 */
import { LIVROS, livro } from "@/lib/biblia";

export type Referencia = { livro: string; inicio: number; fim: number };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const chave = (s: string) => semAcento(s).toLowerCase().replace(/[\s.º°]/g, "");

/** Nomes e abreviações aceitos → id do livro. */
const NOMES = new Map<string, string>();
for (const l of LIVROS) {
  NOMES.set(chave(l.nome), l.id);
  NOMES.set(chave(l.abrev), l.id);
  NOMES.set(l.id, l.id);
}
const EXTRAS: Record<string, string> = {
  gen: "gn", genesis: "gn", exo: "ex", exodo: "ex", lev: "lv", num: "nm", deut: "dt", deu: "dt", jos: "js", jui: "jz",
  juizes: "jz", rute: "rt", samuel: "1sm", reis: "1rs", cronicas: "1cr", esd: "ed", nee: "ne", est: "et",
  salmo: "sl", salmos: "sl", sal: "sl", ps: "sl", prov: "pv", proverbio: "pv", ecl: "ec", cantares: "ct",
  cantico: "ct", canticodoscanticos: "ct", cantaresdesalomao: "ct", isa: "is", jer: "jr", lam: "lm",
  lamentacoesdejeremias: "lm", eze: "ez", dan: "dn", ose: "os", oseias: "os", oseas: "os", ams: "am", abd: "ob",
  obd: "ob", jon: "jn", miq: "mq", nau: "na", hab: "hc", sof: "sf", age: "ag", zac: "zc", mal: "ml",
  mat: "mt", mar: "mc", mr: "mc", luc: "lc", joa: "jo", joao: "jo", atos: "at", atosdosapostolos: "at",
  rom: "rm", gal: "gl", efe: "ef", fil: "fp", col: "cl", heb: "hb", tia: "tg", jud: "jd", apo: "ap",
  apocalipse: "ap", filemon: "fm", job: "job", jaimes: "tg", james: "tg", tiago: "tg",
};
for (const [k, v] of Object.entries(EXTRAS)) if (!NOMES.has(k)) NOMES.set(k, v);

/** Livros numerados: "1 Samuel", "I Sm", "Primeira de Coríntios"… */
function idDoLivro(bruto: string): string | null {
  let t = bruto.trim();
  // "Jó" com acento é o livro de Jó; "Jo" sem acento é João.
  if (/^j[óò]$/i.test(t) || /^j[óò]\b/i.test(t) && chave(t) === "jo") return "job";
  t = t.replace(/^(i{1,3})\s+(?=[a-zà-ú])/i, (m) => String(m.trim().length) + " ");
  t = t.replace(/^(primeira|primeiro|1ª|1a)\s+(de\s+|aos?\s+)?/i, "1 ").replace(/^(segunda|segundo|2ª|2a)\s+(de\s+|aos?\s+)?/i, "2 ").replace(/^(terceira|terceiro|3ª|3a)\s+(de\s+|aos?\s+)?/i, "3 ");
  const k = chave(t);
  if (NOMES.has(k)) return NOMES.get(k)!;
  // número + nome parcial: "1 Cor", "2 Tim"
  const m = k.match(/^([123])(.+)$/);
  if (m) {
    const candidato = LIVROS.find((l) => l.id.startsWith(m[1]) && chave(l.nome).slice(1).startsWith(m[2]));
    if (candidato) return candidato.id;
  }
  // prefixo único do nome (ex.: "Deuter", "Apoc")
  if (k.length >= 3) {
    const achados = LIVROS.filter((l) => chave(l.nome).startsWith(k));
    if (achados.length === 1) return achados[0].id;
  }
  return null;
}

export type ResultadoLeitura = { referencias: Referencia[]; erro: string | null };

/** Interpreta um texto como "Gn 1-3; Sl 23" em referências por capítulo. */
export function interpretarLeitura(texto: string): ResultadoLeitura {
  const refs: Referencia[] = [];
  const partes = texto
    .normalize("NFC")
    .replace(/[–—]/g, "-")
    // "4 a 7" / "1a 4" → intervalo
    .replace(/(\d)\s*a\s+(\d)/gi, "$1-$2")
    .split(/;|\n|\s+\+\s+|\s+e\s+(?=(?:[1-3]\s*)?[a-zà-ú]{2,})/i)
    .map((p) => p.trim())
    .filter(Boolean);

  let livroAtual: string | null = null;
  for (const parte of partes) {
    // separa vírgulas que começam um novo livro ("Gn 1, Mt 2") das que listam capítulos ("Sl 1, 2")
    const pedacos = parte.split(/,\s*(?=(?:[1-3]\s*)?[a-zà-úA-ZÀ-Ú]{2,})/);
    for (const pedaco of pedacos) {
      const m = pedaco.match(/^\s*((?:[1-3]|i{1,3})?\s*[a-zà-úA-ZÀ-Ú][a-zà-úA-ZÀ-Ú.\s]*?)\s*(\d.*)?$/i);
      let id: string | null = livroAtual;
      let resto = pedaco.trim();
      if (m && m[1] && /[a-zà-ú]/i.test(m[1])) {
        const encontrado = idDoLivro(m[1]);
        if (!encontrado) return { referencias: [], erro: `Livro não reconhecido: “${m[1].trim()}”` };
        id = encontrado;
        resto = (m[2] ?? "").trim();
      }
      if (!id) return { referencias: [], erro: `Não entendi “${pedaco.trim()}”` };
      livroAtual = id;
      const l = livro(id)!;
      if (!resto) {
        refs.push({ livro: id, inicio: 1, fim: l.capitulos });
        continue;
      }
      // capítulos: "1-3", "5:1-12", "1:1-2:3", "1, 2 e 3"
      for (const trecho of resto.split(/\s*(?:,|\be\b)\s*/i).filter(Boolean)) {
        const r = trecho.match(/^(\d+)(?::\d+)?(?:\s*-\s*(\d+)(?::\d+)?)?$/);
        if (!r) return { referencias: [], erro: `Capítulos inválidos em “${pedaco.trim()}”` };
        const ini = Number(r[1]);
        // "5:1-12" → só o capítulo 5 (o segundo número é versículo)
        const ehVersiculo = /^\d+:\d+\s*-\s*\d+$/.test(trecho);
        const fim = r[2] && !ehVersiculo ? Number(r[2]) : ini;
        if (ini < 1 || fim < ini || fim > l.capitulos) {
          return { referencias: [], erro: `${l.nome} tem ${l.capitulos} capítulo(s): “${pedaco.trim()}” não existe` };
        }
        refs.push({ livro: id, inicio: ini, fim });
      }
    }
  }
  if (!refs.length) return { referencias: [], erro: "Leitura vazia" };
  return { referencias: refs, erro: null };
}

/** Texto curto a partir das referências: "Gênesis 1–3; Salmos 23". */
export function formatarReferencias(refs: Referencia[]): string {
  return refs
    .map((r) => {
      const l = livro(r.livro);
      if (!l) return r.livro;
      if (r.inicio === 1 && r.fim === l.capitulos && l.capitulos > 1) return l.nome;
      if (l.capitulos === 1) return l.nome;
      return r.inicio === r.fim ? `${l.nome} ${r.inicio}` : `${l.nome} ${r.inicio}–${r.fim}`;
    })
    .join("; ");
}

/** Converte valores de data de planilha para "yyyy-MM-dd". */
export function interpretarData(valor: unknown, anoPadrao: number): string | null {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return `${valor.getUTCFullYear()}-${String(valor.getUTCMonth() + 1).padStart(2, "0")}-${String(valor.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof valor === "number" && valor > 20000 && valor < 80000) {
    // número de série do Excel (dias desde 1899-12-30)
    const d = new Date(Date.UTC(1899, 11, 30) + valor * 86400000);
    return interpretarData(d, anoPadrao);
  }
  const s = String(valor ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valida(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (m) {
    let ano = m[3] ? Number(m[3]) : anoPadrao;
    if (ano < 100) ano += 2000;
    return valida(ano, Number(m[2]), Number(m[1]));
  }
  return null;
}

function valida(a: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export type LinhaPlano = { data: string; leitura: string; titulo: string | null; texto: string | null; referencias: Referencia[] };

/** Descobre as colunas pelo cabeçalho (data, leitura, título, texto). */
export function mapearColunas(cabecalho: string[]): { data: number; leitura: number; titulo: number; texto: number } | null {
  const k = cabecalho.map((c) => chave(String(c ?? "")));
  const achar = (...nomes: string[]) => k.findIndex((c) => nomes.some((n) => c.includes(n)));
  const data = achar("data", "dia");
  const leitura = achar("leitura", "passagem", "referencia", "livro", "capitulo", "textobiblico");
  if (data < 0 || leitura < 0) return null;
  return { data, leitura, titulo: achar("titulo", "tema", "assunto"), texto: achar("devocional", "reflexao", "texto", "mensagem", "comentario") };
}
