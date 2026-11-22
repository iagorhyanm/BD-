"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertaErro } from "@/components/alerta-erro";
import { hojeEmBelem, somarDias } from "@/lib/datas";
import { interpretarData, interpretarLeitura, mapearColunas } from "@/lib/plano";
import { importarPlano, importarPlanoCronologico, type LinhaImportacao } from "@/server/actions/admin-app";

type Previa = { data: string; leitura: string; titulo: string | null; texto: string | null; erro: string | null };

/** Divide uma linha de CSV/texto colado (tab, ponto e vírgula ou vírgula; aspas opcionais). */
function dividir(linha: string, sep: string): string[] {
  const out: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') { atual += '"'; i++; } else aspas = !aspas;
    } else if (c === sep && !aspas) { out.push(atual); atual = ""; } else atual += c;
  }
  out.push(atual);
  return out.map((s) => s.trim());
}

function deTabela(linhas: unknown[][], inicio: string): Previa[] {
  const ano = Number(inicio.slice(0, 4));
  const cab = linhas[0]?.map((c) => String(c ?? "")) ?? [];
  const cols = mapearColunas(cab);
  const corpo = cols ? linhas.slice(1) : linhas;
  const res: Previa[] = [];
  let seq = 0;
  for (const l of corpo) {
    const cel = (i: number) => (i >= 0 && l[i] != null ? String(l[i]).trim() : "");
    let data: string | null;
    let leitura: string;
    let titulo = "";
    let texto = "";
    if (cols) {
      data = interpretarData(l[cols.data], ano);
      leitura = cel(cols.leitura);
      titulo = cel(cols.titulo);
      texto = cel(cols.texto);
    } else if (l.length >= 2 && interpretarData(l[0], ano)) {
      data = interpretarData(l[0], ano);
      leitura = cel(1);
      titulo = cel(2);
      texto = cel(3);
    } else {
      // só a leitura: datas em sequência a partir do Dia 1
      data = somarDias(inicio, seq);
      leitura = cel(0);
    }
    if (!leitura && !data) continue;
    seq++;
    const r = leitura ? interpretarLeitura(leitura) : { erro: "leitura vazia" };
    res.push({ data: data ?? "", leitura, titulo: titulo || null, texto: texto || null, erro: !data ? "data inválida" : r.erro });
  }
  return res;
}

function deTexto(texto: string, inicio: string): Previa[] {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  const sep = linhas.some((l) => l.includes("\t"))
    ? "\t"
    : linhas.every((l) => l.includes(";") && interpretarData(l.split(";")[0], 2000))
      ? ";"
      : null;
  if (sep) return deTabela(linhas.map((l) => dividir(l, sep)), inicio);
  // "dd/mm Gênesis 1-3" ou só "Gênesis 1-3"
  return deTabela(
    linhas.map((l) => {
      const m = l.trim().match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[-–:]?\s+(.+)$/);
      return m ? [m[1], m[2]] : [l.trim()];
    }),
    inicio,
  );
}

async function deArquivo(f: File, inicio: string): Promise<Previa[]> {
  if (/\.xlsx$/i.test(f.name)) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await f.arrayBuffer());
    const ws = wb.worksheets[0];
    const linhas: unknown[][] = [];
    ws.eachRow((row) => {
      const vals = (row.values as unknown[]).slice(1).map((v) => {
        if (v && typeof v === "object" && !(v instanceof Date)) {
          const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
          return o.richText ? o.richText.map((t) => t.text).join("") : o.result ?? o.text ?? "";
        }
        return v;
      });
      linhas.push(vals);
    });
    return deTabela(linhas, inicio);
  }
  const txt = await f.text();
  const primeira = txt.split(/\r?\n/)[0] ?? "";
  const sep = primeira.includes("\t") ? "\t" : primeira.split(";").length > primeira.split(",").length ? ";" : ",";
  return deTabela(txt.split(/\r?\n/).filter((l) => l.trim()).map((l) => dividir(l, sep)), inicio);
}

export function ImportarCronologico({ temPlano }: { temPlano: boolean }) {
  const router = useRouter();
  const [inicio, setInicio] = useState(hojeEmBelem());
  const [substituir, setSubstituir] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const fim = /^\d{4}-\d{2}-\d{2}$/.test(inicio) ? somarDias(inicio, 363) : null;

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <CalendarPlus className="size-5 text-primary" aria-hidden /> Bíblia em ordem cronológica (364 dias)
      </h2>
      <p className="text-sm text-muted-foreground">
        O plano que você enviou (52 semanas, de Gênesis 1 a Apocalipse 22). Escolha o dia em que o Dia 1 começa.
      </p>
      <div className="space-y-2">
        <Label htmlFor="cr-inicio">Data do Dia 1 (Gênesis 1 a 3)</Label>
        <Input id="cr-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-48" />
        {fim && <p className="text-xs text-muted-foreground">Termina em {fim.split("-").reverse().join("/")} (Apocalipse 12 a 22).</p>}
      </div>
      {temPlano && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} className="mt-1 size-4" />
          <span>Apagar os outros dias do plano atual (dias que alguém já marcou são mantidos).</span>
        </label>
      )}
      <AlertaErro mensagem={erro} />
      <Button
        disabled={pendente || !fim}
        onClick={() => {
          if (temPlano && !confirm("Isso vai sobrescrever as leituras dessas datas. Continuar?")) return;
          setErro(null);
          iniciar(async () => {
            const r = await importarPlanoCronologico(inicio, substituir);
            if (!r.ok) return setErro(r.erro);
            toast.success(`Plano publicado: ${r.dados.gravados} dias.`);
            router.push(`/admin/plano?mes=${inicio.slice(0, 7)}`);
            router.refresh();
          });
        }}
      >
        {pendente ? "Publicando…" : "Publicar este plano"}
      </Button>
    </section>
  );
}

export function ImportarArquivo({ temPlano }: { temPlano: boolean }) {
  const router = useRouter();
  const [inicio, setInicio] = useState(hojeEmBelem());
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState<Previa[] | null>(null);
  const [substituir, setSubstituir] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const inputArq = useRef<HTMLInputElement>(null);
  const comErro = previa?.filter((p) => p.erro) ?? [];

  async function lerArquivo(f?: File) {
    if (!f) return;
    setErro(null);
    try {
      setPrevia(await deArquivo(f, inicio));
    } catch {
      setErro("Não consegui ler esse arquivo. Use .xlsx, .csv ou cole o texto.");
    } finally {
      if (inputArq.current) inputArq.current.value = "";
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <FileUp className="size-5 text-primary" aria-hidden /> Importar outro plano
      </h2>
      <p className="text-sm text-muted-foreground">
        Planilha (.xlsx ou .csv) com as colunas <b>Data</b> e <b>Leitura</b> (opcionais: Título, Texto). Ou cole abaixo, uma leitura por linha.
        Se não tiver datas, elas seguem em sequência a partir do Dia 1.
      </p>
      <div className="space-y-2">
        <Label htmlFor="im-inicio">Dia 1 (quando a lista não tem datas)</Label>
        <Input id="im-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-48" />
      </div>
      <input ref={inputArq} type="file" accept=".xlsx,.csv,.txt,text/csv" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => lerArquivo(e.target.files?.[0])} />
      <Button type="button" variant="outline" onClick={() => inputArq.current?.click()}>
        <FileUp /> Escolher planilha
      </Button>
      <div className="space-y-2">
        <Label htmlFor="im-texto">Ou cole aqui</Label>
        <Textarea
          id="im-texto"
          rows={5}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"01/01 Gênesis 1 a 3\n02/01 Gênesis 4 a 7\n…  ou só:\nGênesis 1 a 3\nGênesis 4 a 7"}
        />
        <Button type="button" variant="secondary" disabled={!texto.trim()} onClick={() => setPrevia(deTexto(texto, inicio))}>
          Ver prévia
        </Button>
      </div>

      {previa && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {previa.length} dias encontrados
            {comErro.length > 0 && <span className="text-destructive"> · {comErro.length} com problema</span>}
          </p>
          <ol className="max-h-80 divide-y overflow-y-auto rounded-xl border text-sm">
            {previa.map((p, i) => (
              <li key={i} className="flex gap-3 px-3 py-2">
                <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{p.data ? p.data.split("-").reverse().join("/") : "—"}</span>
                <span className="min-w-0 flex-1">
                  {p.leitura || "—"}
                  {p.titulo && <span className="block text-xs text-muted-foreground">{p.titulo}</span>}
                  {p.erro && <span className="block text-xs text-destructive">{p.erro}</span>}
                </span>
              </li>
            ))}
          </ol>
          {temPlano && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} className="mt-1 size-4" />
              <span>Apagar os outros dias do plano atual (dias que alguém já marcou são mantidos).</span>
            </label>
          )}
          <AlertaErro mensagem={erro} />
          <Button
            disabled={pendente || comErro.length > 0 || previa.length === 0}
            onClick={() => {
              setErro(null);
              iniciar(async () => {
                const linhas: LinhaImportacao[] = previa.map(({ data, leitura, titulo, texto }) => ({ data, leitura, titulo, texto }));
                const r = await importarPlano(linhas, substituir);
                if (!r.ok) return setErro(r.erro);
                toast.success(r.dados.gravados === 1 ? "1 dia importado." : `${r.dados.gravados} dias importados.`);
                setPrevia(null);
                setTexto("");
                router.push(`/admin/plano?mes=${linhas[0].data.slice(0, 7)}`);
                router.refresh();
              });
            }}
          >
            {pendente ? "Importando…" : comErro.length ? "Corrija as linhas com problema" : `Importar ${previa.length} ${previa.length === 1 ? "dia" : "dias"}`}
          </Button>
        </div>
      )}
    </section>
  );
}
