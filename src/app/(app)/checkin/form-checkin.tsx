"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Camera, Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertaErro } from "@/components/alerta-erro";
import { Confirmar } from "@/components/confirmar";
import { capitalizar, hojeEmBelem, rotuloDia, somarDias } from "@/lib/datas";
import { reduzirImagem } from "@/lib/imagem";
import { semReset } from "@/lib/form";
import { createClient } from "@/lib/supabase/client";
import { excluirCheckin, salvarCheckin } from "@/server/actions/checkins";
import { cn } from "@/lib/utils";

export type CheckinForm = {
  id: string;
  data: string;
  leitura: string;
  minutos: number | null;
  versiculo: string | null;
  anotacao: string | null;
  foto_path: string | null;
  fotoUrl: string | null;
};

export type DiaMarcavel = { data: string; leitura: string; titulo: string | null; checkinId: string | null };

export function FormCheckin({ userId, checkin, dias = [], diaInicial }: { userId: string; checkin?: CheckinForm; dias?: DiaMarcavel[]; diaInicial?: string }) {
  const router = useRouter();
  const hoje = hojeEmBelem();
  const abertos = dias.filter((d) => !d.checkinId);
  const [data, setData] = useState(
    checkin?.data ?? (abertos.find((d) => d.data === diaInicial) ?? abertos[0])?.data ?? "",
  );
  const [fotoPath, setFotoPath] = useState<string | null>(checkin?.foto_path ?? null);
  const [fotoPrevia, setFotoPrevia] = useState<string | null>(checkin?.fotoUrl ?? null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const inputFoto = useRef<HTMLInputElement>(null);


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
    fd.set("foto_path", fotoPath ?? "");
    iniciar(async () => {
      const r = await salvarCheckin(checkin?.id ?? null, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success(
        checkin
          ? "Leitura atualizada!"
          : data === hoje
            ? "Leitura marcada! 🔥"
            : data === somarDias(hoje, -1)
              ? "Leitura de ontem marcada! Ponto e sequência garantidos 🔥"
              : "Leitura marcada! Meio ponto garantido 📖",
      );
      router.push(checkin ? `/checkin/${r.dados.id}` : "/");
    });
  }

  return (
    <form onSubmit={semReset(enviar)} className="space-y-5">
      {checkin ? (
        <section className="flex items-start gap-3 rounded-2xl border bg-card p-4">
          <BookOpen className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-sm text-muted-foreground">Leitura de {rotuloDia(checkin.data, hoje)}</p>
            <p className="text-lg font-bold">{checkin.leitura}</p>
          </div>
        </section>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Qual leitura você fez?</legend>
          <div className="space-y-2">
            {dias.map((d) => {
              const feito = !!d.checkinId;
              const ativo = data === d.data;
              return (
                <button
                  key={d.data}
                  type="button"
                  disabled={feito}
                  aria-pressed={ativo}
                  onClick={() => setData(d.data)}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-2 text-left",
                    ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                    feito && "opacity-60",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-xs", ativo ? "opacity-90" : "text-muted-foreground")}>
                      {capitalizar(rotuloDia(d.data, hoje))}
                      {!feito && d.data === somarDias(hoje, -1) && " · esqueceu? Ainda vale 1 ponto e mantém a 🔥"}
                      {!feito && d.data < somarDias(hoje, -1) && " · vale ½ ponto, não conta na 🔥"}
                    </span>
                    <span className="block font-semibold">{d.leitura}</span>
                  </span>
                  {feito && (
                    <span className="flex items-center gap-1 text-xs font-medium">
                      <Check className="size-4" aria-hidden /> feita
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="ck-min">Quanto tempo você leu? (minutos)</Label>
          <Input id="ck-min" name="minutos" type="number" inputMode="numeric" required min={1} max={600} defaultValue={checkin?.minutos ?? ""} className="w-32" placeholder="Ex.: 15" />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="ck-vers">Versículo que marcou (opcional)</Label>
          <Textarea id="ck-vers" name="versiculo" rows={2} maxLength={500} defaultValue={checkin?.versiculo ?? ""} placeholder="Ex.: “Lâmpada para os meus pés é a tua palavra…” (Sl 119:105)" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ck-anot">O que você aprendeu?</Label>
          <Textarea id="ck-anot" name="anotacao" rows={4} required minLength={3} maxLength={3000} defaultValue={checkin?.anotacao ?? ""} placeholder="Uma reflexão curta sobre a leitura, para compartilhar com o grupo." />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Foto da sua leitura</p>
          {!fotoPrevia && <p className="text-xs text-muted-foreground">Ex.: a Bíblia aberta no texto de hoje.</p>}
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
      {!fotoPath && !enviandoFoto && <p className="text-center text-sm text-muted-foreground">Adicione a foto para concluir 📸</p>}
      <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={pendente || enviandoFoto || !data || !fotoPath}>
        {pendente ? "Salvando…" : checkin ? "Salvar alterações" : "Marcar como lida 🔥"}
      </Button>

      {checkin && (
        <Confirmar
          gatilho={
            <Button type="button" variant="ghost" className="w-full text-destructive">
              <Trash2 /> Excluir esta leitura
            </Button>
          }
          titulo="Excluir esta leitura?"
          descricao="Ela sai do feed e do placar dos seus desafios. Depois de 3 dias não dá mais para marcar de novo."
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
