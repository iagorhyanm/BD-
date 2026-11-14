"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertaErro } from "@/components/alerta-erro";
import { Confirmar } from "@/components/confirmar";
import { createClient } from "@/lib/supabase/client";
import { semReset } from "@/lib/form";
import { reduzirImagem } from "@/lib/imagem";
import { ROTULO_ESTADO, type DonoEquipamento, type EstadoEquipamento } from "@/lib/dominio";
import { excluirEquipamento, salvarEquipamento, salvarFotoEquipamento } from "@/server/actions/equipamentos";

export type EquipForm = {
  id: string;
  item: string;
  categoria: string | null;
  quantidade: number;
  dono_tipo: DonoEquipamento;
  dono_nome: string | null;
  estado: EstadoEquipamento;
  responsavel: string | null;
  observacoes: string | null;
  fotoUrl: string | null;
};

export function FormEquipamento({ equip, categorias }: { equip?: EquipForm; categorias: string[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [dono, setDono] = useState<DonoEquipamento>(equip?.dono_tipo ?? "equipe");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarEquipamento(equip?.id ?? null, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success(equip ? "Item salvo!" : "Item cadastrado!");
      if (!equip) router.push(`/equipamentos/${r.dados.id}`);
    });
  }

  async function trocarFoto(arquivo?: File) {
    if (!arquivo || !equip) return;
    setEnviandoFoto(true);
    try {
      const blob = await reduzirImagem(arquivo, 1200);
      const path = `${equip.id}/${Date.now()}.jpg`;
      const { error } = await createClient().storage.from("equipamentos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const r = await salvarFotoEquipamento(equip.id, path);
      if (!r.ok) throw new Error(r.erro);
      toast.success("Foto atualizada!");
      router.refresh();
    } catch {
      toast.error("Não foi possível enviar a foto.");
    } finally {
      setEnviandoFoto(false);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {equip && (
        <section className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {equip.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={equip.fotoUrl} alt={`Foto de ${equip.item}`} className="size-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">Sem foto</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={inputFoto} type="file" accept="image/*" capture="environment" className="sr-only" id="foto-equip" onChange={(e) => trocarFoto(e.target.files?.[0])} />
            <Button type="button" variant="outline" disabled={enviandoFoto} onClick={() => inputFoto.current?.click()}>
              <ImagePlus /> {enviandoFoto ? "Enviando…" : equip.fotoUrl ? "Trocar foto" : "Tirar/escolher foto"}
            </Button>
            {equip.fotoUrl && (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  const r = await salvarFotoEquipamento(equip.id, null);
                  if (r.ok) router.refresh();
                }}
              >
                Remover
              </Button>
            )}
          </div>
        </section>
      )}

      <form onSubmit={semReset(enviar)} className="space-y-4 rounded-xl border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="eq-item">Item</Label>
          <Input id="eq-item" name="item" required defaultValue={equip?.item} placeholder="Ex.: Violão Yamaha C40" />
        </div>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <div className="space-y-2">
            <Label htmlFor="eq-cat">Categoria</Label>
            <Input id="eq-cat" name="categoria" list="categorias-equip" defaultValue={equip?.categoria ?? ""} placeholder="Instrumento, Som, Cabos…" />
            <datalist id="categorias-equip">
              {[...new Set(["Instrumento", "Som", "Cabos", "Acessórios", "Microfones", ...categorias])].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-qtd">Qtd.</Label>
            <Input id="eq-qtd" name="quantidade" type="number" inputMode="numeric" min={0} required defaultValue={equip?.quantidade ?? 1} />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Dono</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["equipe", "Da equipe"],
                ["emprestado", "Emprestado"],
              ] as const
            ).map(([v, r]) => (
              <label key={v} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-background px-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="radio" name="dono_tipo" value={v} checked={dono === v} onChange={() => setDono(v)} className="size-5 accent-[var(--primary)]" />
                {r}
              </label>
            ))}
          </div>
          {dono === "emprestado" && (
            <Input name="dono_nome" required defaultValue={equip?.dono_nome ?? ""} placeholder="Emprestado por quem?" aria-label="Emprestado por quem" />
          )}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="eq-estado">Estado</Label>
            <select id="eq-estado" name="estado" defaultValue={equip?.estado ?? "bom"} className="h-11 w-full rounded-lg border border-input bg-background px-3 md:h-10">
              {(Object.keys(ROTULO_ESTADO) as EstadoEquipamento[]).map((e) => <option key={e} value={e}>{ROTULO_ESTADO[e].rotulo}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-resp">Responsável</Label>
            <Input id="eq-resp" name="responsavel" defaultValue={equip?.responsavel ?? ""} placeholder="Quem cuida do item" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eq-obs">Observações</Label>
          <Textarea id="eq-obs" name="observacoes" rows={3} defaultValue={equip?.observacoes ?? ""} />
        </div>
        <AlertaErro mensagem={erro} />
        <Button type="submit" className="w-full sm:w-auto" disabled={pendente}>
          {pendente ? "Salvando…" : equip ? "Salvar" : "Cadastrar item"}
        </Button>
      </form>

      {equip && (
        <Confirmar
          gatilho={
            <Button variant="ghost" className="text-destructive">
              <Trash2 /> Excluir item
            </Button>
          }
          titulo={`Excluir “${equip.item}”?`}
          descricao="Apaga também o histórico de empréstimos deste item."
          rotuloConfirmar="Excluir"
          destrutivo
          aoConfirmar={async () => {
            const r = await excluirEquipamento(equip.id);
            if (!r.ok) return toast.error(r.erro);
            toast.success("Item excluído.");
            router.push("/equipamentos");
          }}
        />
      )}
    </div>
  );
}
