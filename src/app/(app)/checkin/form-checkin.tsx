"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertaErro } from "@/components/alerta-erro";
import { Confirmar } from "@/components/confirmar";
import { LIVROS, livro as acharLivro } from "@/lib/biblia";
import { hojeEmBelem, rotuloDia, somarDias } from "@/lib/datas";
import { reduzirImagem } from "@/lib/imagem";
import { semReset } from "@/lib/form";
import { createClient } from "@/lib/supabase/client";
import { excluirCheckin, salvarCheckin } from "@/server/actions/checkins";
import { cn } from "@/lib/utils";

export type CheckinForm = {
  id: string;
  data: string;
  livro: string;
  capitulo_inicio: number;
  capitulo_fim: number;
  minutos: number | null;
  versiculo: string | null;
  anotacao: string | null;
  foto_path: string | null;
  fotoUrl: string | null;
};

const selectCls = "h-12 w-full rounded-lg border border-input bg-background px-3 text-base";

export function FormCheckin({ userId, checkin, ultimoLivro }: { userId: string; checkin?: CheckinForm; ultimoLivro?: { livro: string; capitulo: number } }) {
  const router = useRouter();
  const hoje = hojeEmBelem();
  const [data, setData] = useState(checkin?.data ?? hoje);
  const [livroId, setLivroId] = useState(checkin?.livro ?? ultimoLivro?.livro ?? "");
  const sugestao = ultimoLivro ? Math.min(ultimoLivro.capitulo + 1, acharLivro(ultimoLivro.livro)?.capitulos ?? 1) : 1;
  const [capIni, setCapIni] = useState(checkin?.capitulo_inicio ?? (ultimoLivro ? sugestao : 1));
  const [capFim, setCapFim] = useState(checkin?.capitulo_fim ?? (ultimoLivro ? sugestao : 1));
  const [fotoPath, setFotoPath] = useState<string | null>(checkin?.foto_path ?? null);
  const [fotoPrevia, setFotoPrevia] = useState<string | null>(checkin?.fotoUrl ?? null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const inputFoto = useRef<HTMLInputElement>(null);

  const l = acharLivro(livroId);
  const capitulos = useMemo(() => Array.from({ length: l?.capitulos ?? 0 }, (_, i) => i + 1), [l]);
  const dias = [0, 1, 2, 3].map((n) => somarDias(hoje, -n));

  async function escolherFoto(f?: File) {
    if (!f) return;
    setEnviandoFoto(true);
    try {
      const blob = await reduzirImagem(f, 1280);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from("checkins").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setFotoPath(path);
      setFotoPrevia(URL.createObjectURL(blob));
    } catch {
      toast.error("Não foi possível enviar a foto.");
    } finally {
      setEnviandoFoto(false);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  }

  function enviar(fd: FormData) {
    setErro(null);
    fd.set("data", data);
    fd.set("livro", livroId);
    fd.set("capitulo_inicio", String(capIni));
    fd.set("capitulo_fim", String(capFim));
    fd.set("foto_path", fotoPath ?? "");
    iniciar(async () => {
      const r = await salvarCheckin(checkin?.id ?? null, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success(checkin ? "Leitura atualizada!" : "Leitura registrada! 🔥");
      router.push(checkin ? `/checkin/${r.dados.id}` : "/");
    });
  }

  return (
    <form onSubmit={semReset(enviar)} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Quando você leu?</legend>
        <div className="grid grid-cols-4 gap-2">
          {dias.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={data === d}
              onClick={() => setData(d)}
              className={cn(
                "min-h-11 rounded-xl border px-1 text-sm font-medium capitalize",
                data === d ? "border-primary bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {rotuloDia(d, hoje).replace(/, .*/, "")}
            </button>
          ))}
        </div>
      </fieldset>

      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="ck-livro">Livro</Label>
          <select
            id="ck-livro"
            value={livroId}
            required
            onChange={(e) => {
              setLivroId(e.target.value);
              setCapIni(1);
              setCapFim(1);
            }}
            className={selectCls}
          >
            <option value="" disabled>
              Escolha o livro…
            </option>
            <optgroup label="Antigo Testamento">
              {LIVROS.filter((x) => x.testamento === "AT").map((x) => (
                <option key={x.id} value={x.id}>{x.nome}</option>
              ))}
            </optgroup>
            <optgroup label="Novo Testamento">
              {LIVROS.filter((x) => x.testamento === "NT").map((x) => (
                <option key={x.id} value={x.id}>{x.nome}</option>
              ))}
            </optgroup>
          </select>
        </div>
        {l && l.capitulos > 1 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ck-ini">Do capítulo</Label>
              <select
                id="ck-ini"
                value={capIni}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCapIni(v);
                  if (capFim < v) setCapFim(v);
                }}
                className={selectCls}
              >
                {capitulos.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ck-fim">Até o capítulo</Label>
              <select id="ck-fim" value={capFim} onChange={(e) => setCapFim(Number(e.target.value))} className={selectCls}>
                {capitulos.filter((c) => c >= capIni).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="ck-min">Tempo de leitura (minutos, opcional)</Label>
          <Input id="ck-min" name="minutos" type="number" inputMode="numeric" min={1} max={600} defaultValue={checkin?.minutos ?? ""} className="w-32" />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="ck-vers">Versículo que marcou (opcional)</Label>
          <Textarea id="ck-vers" name="versiculo" rows={2} maxLength={500} defaultValue={checkin?.versiculo ?? ""} placeholder="Ex.: “Lâmpada para os meus pés é a tua palavra…” (Sl 119:105)" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ck-anot">O que você aprendeu? (opcional)</Label>
          <Textarea id="ck-anot" name="anotacao" rows={4} maxLength={3000} defaultValue={checkin?.anotacao ?? ""} placeholder="Uma reflexão curta para compartilhar com o grupo." />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Foto (opcional)</p>
          <input ref={inputFoto} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => escolherFoto(e.target.files?.[0])} />
          {fotoPrevia ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotoPrevia} alt="Prévia da foto" className="max-h-72 w-full rounded-xl object-cover" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                aria-label="Remover foto"
                onClick={() => {
                  setFotoPath(null);
                  setFotoPrevia(null);
                }}
              >
                <X />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" disabled={enviandoFoto} onClick={() => inputFoto.current?.click()}>
              <Camera /> {enviandoFoto ? "Enviando…" : "Adicionar foto"}
            </Button>
          )}
        </div>
      </section>

      <AlertaErro mensagem={erro} />
      <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={pendente || enviandoFoto || !livroId}>
        {pendente ? "Salvando…" : checkin ? "Salvar alterações" : "Registrar leitura 🔥"}
      </Button>

      {checkin && (
        <Confirmar
          gatilho={
            <Button type="button" variant="ghost" className="w-full text-destructive">
              <Trash2 /> Excluir esta leitura
            </Button>
          }
          titulo="Excluir esta leitura?"
          descricao="Ela sai do feed e do placar dos seus desafios."
          rotuloConfirmar="Excluir"
          destrutivo
          aoConfirmar={async () => {
            const r = await excluirCheckin(checkin.id);
            if (!r.ok) return toast.error(r.erro);
            toast.success("Leitura excluída.");
            router.push("/");
          }}
        />
      )}
    </form>
  );
}
