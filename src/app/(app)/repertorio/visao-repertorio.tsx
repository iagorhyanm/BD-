"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ExternalLink, FileMusic, ListMusic, Music, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EstadoVazio } from "@/components/estado-vazio";
import { AlertaErro } from "@/components/alerta-erro";
import { Confirmar } from "@/components/confirmar";
import { semReset } from "@/lib/form";
import { formatarDataHora } from "@/lib/datas";
import { MOMENTOS, rotuloMidia, rotuloMomento } from "@/lib/dominio";
import { excluirMusica, salvarMusica, salvarSetlist } from "@/server/actions/repertorio";
import { cn } from "@/lib/utils";

export type Musica = {
  id: string;
  titulo: string;
  artista: string | null;
  tom: string | null;
  bpm: number | null;
  momentos: string[];
  cifra_url: string | null;
  media_url: string | null;
  observacoes: string | null;
  interpretes: string[];
};
type SetlistResumo = { id: string; titulo: string; evento: { titulo: string; inicio: string } | null; itens: number };

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function VisaoRepertorio({
  abaInicial,
  musicas,
  setlists,
  membros,
  temEdicao,
}: {
  abaInicial: "musicas" | "setlists";
  musicas: Musica[];
  setlists: SetlistResumo[];
  membros: { id: string; nome: string }[];
  temEdicao: boolean;
}) {
  const [aba, setAba] = useState(abaInicial);
  return (
    <div className="space-y-4">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg border bg-card p-1">
        {(
          [
            ["musicas", `Músicas (${musicas.length})`],
            ["setlists", `Setlists (${setlists.length})`],
          ] as const
        ).map(([v, r]) => (
          <button
            key={v}
            role="tab"
            aria-selected={aba === v}
            onClick={() => setAba(v)}
            className={cn("min-h-10 rounded-md text-sm font-medium", aba === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            {r}
          </button>
        ))}
      </div>
      {aba === "musicas" ? (
        <Biblioteca musicas={musicas} membros={membros} />
      ) : (
        <Setlists setlists={setlists} temEdicao={temEdicao} />
      )}
    </div>
  );
}

function Biblioteca({ musicas, membros }: { musicas: Musica[]; membros: { id: string; nome: string }[] }) {
  const [busca, setBusca] = useState("");
  const [momento, setMomento] = useState("");
  const [editando, setEditando] = useState<Musica | "nova" | null>(null);
  const nomeMembro = Object.fromEntries(membros.map((m) => [m.id, m.nome]));

  const filtradas = useMemo(() => {
    const b = normalizar(busca.trim());
    return musicas.filter(
      (m) => (!momento || m.momentos.includes(momento)) && (!b || normalizar(`${m.titulo} ${m.artista ?? ""}`).includes(b)),
    );
  }, [musicas, busca, momento]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar música ou artista" aria-label="Buscar" className="pl-9" />
        </div>
        <Button onClick={() => setEditando("nova")}>
          <Plus /> <span className="hidden sm:inline">Nova música</span>
          <span className="sr-only sm:hidden">Nova música</span>
        </Button>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por momento">
        <button
          aria-pressed={!momento}
          onClick={() => setMomento("")}
          className={cn("min-h-9 shrink-0 rounded-full border px-3 text-sm", !momento ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
        >
          Todos
        </button>
        {MOMENTOS.map((m) => (
          <button
            key={m.valor}
            aria-pressed={momento === m.valor}
            onClick={() => setMomento(momento === m.valor ? "" : m.valor)}
            className={cn("min-h-9 shrink-0 rounded-full border px-3 text-sm", momento === m.valor ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
          >
            {m.rotulo}
          </button>
        ))}
      </div>

      {musicas.length === 0 ? (
        <EstadoVazio icone={Music} titulo="Biblioteca vazia" descricao="Cadastre as músicas que a Bandinha toca." acao={<Button onClick={() => setEditando("nova")}><Plus /> Nova música</Button>} />
      ) : filtradas.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground">Nenhuma música encontrada.</p>
      ) : (
        <ul className="space-y-2">
          {filtradas.map((m) => (
            <li key={m.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-start gap-3">
                <button onClick={() => setEditando(m)} className="min-w-0 flex-1 text-left">
                  <p className="font-semibold">{m.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {[m.artista, m.tom && `Tom ${m.tom}`, m.bpm && `${m.bpm} BPM`].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {m.momentos.map((x) => <span key={x} className="rounded-full bg-muted px-2 py-0.5 text-xs">{rotuloMomento(x)}</span>)}
                  </div>
                  {m.interpretes.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">🎤 {m.interpretes.map((i) => nomeMembro[i]).join(", ")}</p>
                  )}
                </button>
                <div className="flex shrink-0 gap-1">
                  {m.cifra_url && (
                    <Button asChild variant="outline" size="sm">
                      <a href={m.cifra_url} target="_blank" rel="noopener noreferrer" aria-label={`Cifra de ${m.titulo}`}><FileMusic /> Cifra</a>
                    </Button>
                  )}
                  {m.media_url && (
                    <Button asChild variant="outline" size="sm">
                      <a href={m.media_url} target="_blank" rel="noopener noreferrer" aria-label={`${rotuloMidia(m.media_url)} de ${m.titulo}`}><ExternalLink /> {rotuloMidia(m.media_url)}</a>
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <DialogMusica musica={editando === "nova" ? null : editando} membros={membros} aoFechar={() => setEditando(null)} />
      )}
    </div>
  );
}

function DialogMusica({ musica, membros, aoFechar }: { musica: Musica | null; membros: { id: string; nome: string }[]; aoFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarMusica(musica?.id ?? null, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success(musica ? "Música salva!" : "Música cadastrada!");
      aoFechar();
    });
  }

  const chip = "flex min-h-9 cursor-pointer items-center rounded-full border bg-background px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50";

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{musica ? "Editar música" : "Nova música"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={semReset(enviar)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mu-titulo">Título</Label>
            <Input id="mu-titulo" name="titulo" required defaultValue={musica?.titulo} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mu-artista">Artista</Label>
            <Input id="mu-artista" name="artista" defaultValue={musica?.artista ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mu-tom">Tom</Label>
              <Input id="mu-tom" name="tom" defaultValue={musica?.tom ?? ""} placeholder="Ex.: G, Am, F#" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mu-bpm">BPM</Label>
              <Input id="mu-bpm" name="bpm" type="number" inputMode="numeric" min={20} max={300} defaultValue={musica?.bpm ?? ""} />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Momento do encontro</legend>
            <div className="flex flex-wrap gap-2">
              {MOMENTOS.map((m) => (
                <label key={m.valor} className={chip}>
                  <input type="checkbox" name="momentos" value={m.valor} defaultChecked={musica?.momentos.includes(m.valor)} className="sr-only" />
                  {m.rotulo}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="mu-cifra">Link da cifra</Label>
            <Input id="mu-cifra" name="cifra_url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" defaultValue={musica?.cifra_url ?? ""} placeholder="cifraclub.com.br/…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mu-media">Link do YouTube/Spotify</Label>
            <Input id="mu-media" name="media_url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" defaultValue={musica?.media_url ?? ""} />
          </div>
          {membros.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Quem canta/toca (nesta edição)</legend>
              <div className="flex flex-wrap gap-2">
                {membros.map((m) => (
                  <label key={m.id} className={chip}>
                    <input type="checkbox" name="interpretes" value={m.id} defaultChecked={musica?.interpretes.includes(m.id)} className="sr-only" />
                    {m.nome}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="space-y-2">
            <Label htmlFor="mu-obs">Observações</Label>
            <Textarea id="mu-obs" name="observacoes" rows={3} defaultValue={musica?.observacoes ?? ""} />
          </div>
          <AlertaErro mensagem={erro} />
          <Button type="submit" className="w-full" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
          {musica && (
            <Confirmar
              gatilho={
                <Button type="button" variant="ghost" className="w-full text-destructive">
                  <Trash2 /> Excluir música
                </Button>
              }
              titulo={`Excluir “${musica.titulo}”?`}
              descricao="A música sai da biblioteca de todas as edições."
              rotuloConfirmar="Excluir"
              destrutivo
              aoConfirmar={async () => {
                const r = await excluirMusica(musica.id);
                if (!r.ok) return toast.error(r.erro);
                toast.success("Música excluída.");
                aoFechar();
              }}
            />
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Setlists({ setlists, temEdicao }: { setlists: SetlistResumo[]; temEdicao: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  function nova() {
    iniciar(async () => {
      const fd = new FormData();
      fd.set("titulo", "Nova setlist");
      const r = await salvarSetlist(null, fd);
      if (!r.ok) return void toast.error(r.erro);
      router.push(`/repertorio/setlists/${r.dados.id}`);
    });
  }

  if (!temEdicao) return <p className="text-muted-foreground">Crie uma edição para montar setlists.</p>;

  return (
    <div className="space-y-4">
      <Button onClick={nova} disabled={pendente}>
        <Plus /> Nova setlist
      </Button>
      {setlists.length === 0 ? (
        <EstadoVazio icone={ListMusic} titulo="Nenhuma setlist" descricao="Monte a ordem das músicas de um ensaio ou apresentação. Dica: pela página do evento você cria a setlist do dia já vinculada." />
      ) : (
        <ul className="space-y-2">
          {setlists.map((s) => (
            <li key={s.id}>
              <Link href={`/repertorio/setlists/${s.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.itens} {s.itens === 1 ? "música" : "músicas"}
                    {s.evento ? ` · ${s.evento.titulo} (${formatarDataHora(s.evento.inicio, "dd/MM")})` : " · modelo (sem evento)"}
                  </p>
                </div>
                <Pencil className="size-4 text-muted-foreground" aria-hidden />
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
