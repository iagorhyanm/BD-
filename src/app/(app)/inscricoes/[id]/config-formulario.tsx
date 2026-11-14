"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertaErro } from "@/components/alerta-erro";
import { Confirmar } from "@/components/confirmar";
import { createClient } from "@/lib/supabase/client";
import { semReset } from "@/lib/form";
import { FUSO } from "@/lib/datas";
import type { Database } from "@/lib/supabase/database.types";
import { excluirFormulario, salvarCapa, salvarConfiguracoes } from "@/server/actions/formularios";

type Formulario = Database["public"]["Tables"]["formularios"]["Row"];

const paraInputLocal = (iso: string | null) => (iso ? formatInTimeZone(new Date(iso), FUSO, "yyyy-MM-dd'T'HH:mm") : "");

/** Reduz a imagem no navegador (máx. 1600px, JPEG) para carregar rápido no 4G. */
async function reduzirImagem(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, 1600 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, erro) =>
    canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Falha ao processar a imagem"))), "image/jpeg", 0.82),
  );
}

export function ConfigFormulario({
  formulario: f,
  capaUrl,
  lgpdEdicao,
  podeExcluir,
}: {
  formulario: Formulario;
  capaUrl: string | null;
  lgpdEdicao: string;
  podeExcluir: boolean;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [enviandoCapa, setEnviandoCapa] = useState(false);
  const inputCapa = useRef<HTMLInputElement>(null);

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarConfiguracoes(f.id, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success("Configurações salvas!");
    });
  }

  async function trocarCapa(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) return toast.error("Escolha uma imagem.");
    setEnviandoCapa(true);
    try {
      const blob = await reduzirImagem(arquivo);
      const path = `${f.id}/${Date.now()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("capas").upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      });
      if (error) throw error;
      const r = await salvarCapa(f.id, path);
      if (!r.ok) throw new Error(r.erro);
      toast.success("Capa atualizada!");
      router.refresh();
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setEnviandoCapa(false);
      if (inputCapa.current) inputCapa.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      {/* Capa */}
      <section className="space-y-2">
        <p className="text-sm font-medium">Imagem de capa</p>
        <div className="overflow-hidden rounded-xl border bg-muted">
          {capaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capaUrl} alt="Capa do formulário" className="aspect-[3/1] w-full object-cover" />
          ) : (
            <div className="flex aspect-[3/1] items-center justify-center text-sm text-muted-foreground">Sem capa</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputCapa}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id="capa"
            onChange={(e) => trocarCapa(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" disabled={enviandoCapa} onClick={() => inputCapa.current?.click()}>
            <ImagePlus /> {enviandoCapa ? "Enviando…" : capaUrl ? "Trocar capa" : "Escolher capa"}
          </Button>
          {capaUrl && (
            <Button
              type="button"
              variant="ghost"
              disabled={enviandoCapa}
              onClick={async () => {
                const r = await salvarCapa(f.id, null);
                if (r.ok) router.refresh();
              }}
            >
              <Trash2 /> Remover
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Formato largo (3:1) fica melhor. A imagem é reduzida automaticamente.</p>
      </section>

      <form onSubmit={semReset(enviar)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cf-titulo">Título</Label>
          <Input id="cf-titulo" name="titulo" defaultValue={f.titulo} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-desc">Descrição</Label>
          <Textarea id="cf-desc" name="descricao" rows={4} defaultValue={f.descricao ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-slug">Endereço do link</Label>
          <div className="flex items-center rounded-lg border bg-background focus-within:ring-3 focus-within:ring-ring/50">
            <span className="pl-3 text-sm whitespace-nowrap text-muted-foreground">/inscricao/</span>
            <Input id="cf-slug" name="slug" defaultValue={f.slug} required className="border-0 pl-1 focus-visible:ring-0" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cf-abre">Abre em (opcional)</Label>
            <Input id="cf-abre" name="abre_em" type="datetime-local" defaultValue={paraInputLocal(f.abre_em)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cf-fecha">Fecha em (opcional)</Label>
            <Input id="cf-fecha" name="fecha_em" type="datetime-local" defaultValue={paraInputLocal(f.fecha_em)} />
          </div>
        </div>
        <p className="-mt-2 text-sm text-muted-foreground">Horário de Marabá/Belém.</p>
        <div className="space-y-2">
          <Label htmlFor="cf-limite">Limite de inscrições (opcional)</Label>
          <Input id="cf-limite" name="limite" type="number" min={1} inputMode="numeric" defaultValue={f.limite ?? ""} className="sm:w-48" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-msg">Mensagem de confirmação</Label>
          <Textarea id="cf-msg" name="msg_confirmacao" rows={3} defaultValue={f.msg_confirmacao} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-lgpd">Texto de consentimento LGPD (opcional)</Label>
          <Textarea id="cf-lgpd" name="texto_lgpd" rows={5} defaultValue={f.texto_lgpd ?? ""} placeholder={lgpdEdicao} />
          <p className="text-sm text-muted-foreground">Deixe em branco para usar o texto padrão da edição.</p>
        </div>
        <AlertaErro mensagem={erro} />
        <Button type="submit" disabled={pendente} className="w-full sm:w-auto">
          {pendente ? "Salvando…" : "Salvar configurações"}
        </Button>
      </form>

      <section className="rounded-xl border border-destructive/30 p-4">
        <h2 className="font-semibold">Excluir formulário</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {podeExcluir
            ? "O link deixa de funcionar. Esta ação não pode ser desfeita."
            : "Este formulário já tem inscrições e não pode ser excluído. Desligue “Receber inscrições” para fechá-lo."}
        </p>
        {podeExcluir && (
          <Confirmar
            gatilho={
              <Button variant="destructive" className="mt-3">
                <Trash2 /> Excluir formulário
              </Button>
            }
            titulo="Excluir este formulário?"
            descricao="O link público deixa de funcionar e as perguntas são apagadas."
            rotuloConfirmar="Excluir"
            destrutivo
            aoConfirmar={async () => {
              const r = await excluirFormulario(f.id);
              if (!r.ok) return toast.error(r.erro);
              toast.success("Formulário excluído.");
              router.push("/inscricoes");
            }}
          />
        )}
      </section>
    </div>
  );
}
