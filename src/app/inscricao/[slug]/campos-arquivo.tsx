"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CircleCheck, ImageIcon, Link2, RefreshCw, Upload, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { reduzirImagem } from "@/lib/imagem";
import { MAX_VIDEO_BYTES, lerVideo, respostaVideoArquivo } from "@/lib/inscricao";
import { normalizarUrl } from "@/lib/dominio";
import { prepararUpload } from "@/server/actions/inscricao-publica";
import { cn } from "@/lib/utils";

/** Envia o arquivo direto para o Storage (URL assinada) com progresso. */
function enviarComProgresso(url: string, arquivo: Blob, mime: string, aoProgredir: (pct: number) => void): Promise<void> {
  return new Promise((ok, erro) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", mime);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.upload.onprogress = (e) => e.lengthComputable && aoProgredir(Math.round((100 * e.loaded) / e.total));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? ok() : erro(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => erro(new Error("rede"));
    xhr.send(arquivo);
  });
}

function formatarMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0).replace(".", ",")} MB`;
}

/** Descobre o tipo do vídeo (alguns Androids mandam o arquivo sem tipo). */
function mimeDoVideo(f: File): string {
  if (f.type) return f.type;
  const ext = f.name.split(".").pop()?.toLowerCase();
  return { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", "3gp": "video/3gpp", mkv: "video/x-matroska" }[ext ?? ""] ?? "";
}

type Props = {
  id: string;
  slug: string;
  valor: string | undefined;
  aoMudar: (v: string | null) => void;
  aoMudarEnviando: (enviando: boolean) => void;
};

/* ------------------------------------------------------------------ */

export function CampoFoto({ id, slug, valor, aoMudar, aoMudarEnviando }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [estado, setEstado] = useState<"vazio" | "enviando" | "ok" | "erro">(valor ? "ok" : "vazio");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => () => void (previa && URL.revokeObjectURL(previa)), [previa]);

  async function escolher(arquivo?: File) {
    if (!arquivo) return;
    setErro(null);
    setEstado("enviando");
    aoMudarEnviando(true);
    try {
      let blob: Blob;
      try {
        blob = await reduzirImagem(arquivo, 1000);
      } catch {
        throw new Error("Não conseguimos ler essa foto. Tente outra (JPG ou PNG).");
      }
      const auth = await prepararUpload(slug, "foto", "image/jpeg", blob.size);
      if (!auth.ok) throw new Error(auth.erro);
      await enviarComProgresso(auth.signedUrl, blob, "image/jpeg", () => {});
      setPrevia(URL.createObjectURL(blob));
      aoMudar(auth.path);
      setEstado("ok");
    } catch (e) {
      aoMudar(null);
      setEstado("erro");
      setErro(e instanceof Error && e.message !== "rede" && !e.message.startsWith("HTTP") ? e.message : "Falha no envio. Confira a internet e tente de novo.");
    } finally {
      aoMudarEnviando(false);
      if (input.current) input.current.value = "";
      if (camera.current) camera.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {/* Câmera frontal direto (selfie) */}
      <input ref={camera} type="file" accept="image/*" capture="user" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => escolher(e.target.files?.[0])} />
      {/* Galeria */}
      <input ref={input} id={id} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => escolher(e.target.files?.[0])} />
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-background p-3 sm:flex-row sm:gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {previa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previa} alt="Prévia da sua foto" className="size-full object-cover" />
          ) : (
            <Camera className="size-8 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="w-full min-w-0 space-y-2 sm:flex-1">
          {estado === "ok" && (
            <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700 sm:justify-start">
              <CircleCheck className="size-4" aria-hidden /> Foto enviada
            </p>
          )}
          {estado === "enviando" && <p className="text-center text-sm text-muted-foreground sm:text-left" role="status">Enviando foto…</p>}
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button type="button" disabled={estado === "enviando"} onClick={() => camera.current?.click()}>
              {estado === "ok" ? <RefreshCw /> : <Camera />}
              {estado === "ok" ? "Tirar outra" : "Tirar selfie"}
            </Button>
            <Button type="button" variant="outline" disabled={estado === "enviando"} onClick={() => input.current?.click()}>
              <ImageIcon /> Escolher da galeria
            </Button>
          </div>
        </div>
      </div>
      {erro && <p className="text-sm font-medium text-destructive">{erro}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function CampoVideo({ id, slug, valor, aoMudar, aoMudarEnviando }: Props) {
  const atual = lerVideo(valor);
  const input = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<"arquivo" | "link">(atual?.tipo === "link" ? "link" : "arquivo");
  const [progresso, setProgresso] = useState<number | null>(null);
  const [enviado, setEnviado] = useState<{ nome: string; tamanho: number } | null>(null);
  const [link, setLink] = useState(atual?.tipo === "link" ? atual.url : "");
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(arquivo?: File) {
    if (!arquivo) return;
    setErro(null);
    const mime = mimeDoVideo(arquivo);
    if (arquivo.size > MAX_VIDEO_BYTES) {
      setErro(`Esse vídeo tem ${formatarMB(arquivo.size)} e o limite é 50 MB. Grave um trecho mais curto (até 1 minuto) ou use “Colar link”.`);
      if (input.current) input.current.value = "";
      return;
    }
    setProgresso(0);
    aoMudarEnviando(true);
    aoMudar(null);
    try {
      const auth = await prepararUpload(slug, "video", mime, arquivo.size);
      if (!auth.ok) throw new Error(auth.erro);
      await enviarComProgresso(auth.signedUrl, arquivo, mime, setProgresso);
      setEnviado({ nome: arquivo.name, tamanho: arquivo.size });
      aoMudar(respostaVideoArquivo(auth.path));
    } catch (e) {
      setEnviado(null);
      setErro(e instanceof Error && e.message !== "rede" && !e.message.startsWith("HTTP") ? e.message : "Falha no envio. Confira a internet e tente de novo, ou use “Colar link”.");
    } finally {
      setProgresso(null);
      aoMudarEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  function trocarModo(m: "arquivo" | "link") {
    if (progresso !== null) return;
    setModo(m);
    setErro(null);
    if (m === "link") aoMudar(link ? normalizarUrl(link) : null);
    else aoMudar(enviado && atual?.tipo === "arquivo" ? valor! : null);
  }

  const aba = (m: "arquivo" | "link", rotulo: string, Icone: typeof Upload) => (
    <button
      type="button"
      role="tab"
      aria-selected={modo === m}
      onClick={() => trocarModo(m)}
      className={cn("flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md text-sm font-medium", modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
    >
      <Icone className="size-4" aria-hidden /> {rotulo}
    </button>
  );

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Como enviar o vídeo" className="flex gap-1 rounded-lg border bg-muted/60 p-1">
        {aba("arquivo", "Enviar arquivo", Upload)}
        {aba("link", "Colar link", Link2)}
      </div>

      {modo === "arquivo" ? (
        <div className="space-y-2 rounded-xl border bg-background p-3">
          <input ref={input} id={id} type="file" accept="video/*" className="sr-only" onChange={(e) => escolher(e.target.files?.[0])} />
          {progresso !== null ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <p className="text-sm font-medium">Enviando vídeo… {progresso}%</p>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Não feche esta página até terminar.</p>
            </div>
          ) : enviado && atual?.tipo === "arquivo" ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex flex-1 items-center gap-1.5 text-sm font-medium text-emerald-700">
                <CircleCheck className="size-4 shrink-0" aria-hidden /> Vídeo enviado ({formatarMB(enviado.tamanho)})
              </p>
              <Button type="button" variant="outline" onClick={() => input.current?.click()}>
                <RefreshCw /> Trocar
              </Button>
            </div>
          ) : (
            <>
              <Button type="button" variant="outline" className="w-full" onClick={() => input.current?.click()}>
                <Video /> Gravar ou escolher vídeo
              </Button>
              <p className="text-xs text-muted-foreground">
                Até 50 MB (cerca de 1 minuto). Dica: grave em qualidade HD (não 4K) para o arquivo ficar menor.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Input
            id={id}
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="https://youtube.com/… ou link do Google Drive/Instagram"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              aoMudar(e.target.value.trim() ? normalizarUrl(e.target.value) : null);
            }}
          />
          <p className="text-xs text-muted-foreground">
            No YouTube, pode publicar como “Não listado”. No Google Drive, deixe “Qualquer pessoa com o link pode ver”.
          </p>
        </div>
      )}
      {erro && <p className="text-sm font-medium text-destructive">{erro}</p>}
    </div>
  );
}
