"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { InputTelefone } from "@/components/input-telefone";
import { AlertaErro } from "@/components/alerta-erro";
import { ChipsFuncoes } from "@/components/chips-funcoes";
import { Confirmar } from "@/components/confirmar";
import { semReset } from "@/lib/form";
import { ROTULO_NIVEL, type Funcao, type Nivel } from "@/lib/dominio";
import { excluirMembro, salvarMembro } from "@/server/actions/membros";

export type MembroForm = {
  id: string;
  nome: string;
  sexo: "masculino" | "feminino";
  nascimento: string | null;
  idade: number | null;
  telefone: string | null;
  cidade: string | null;
  nivel: Nivel | null;
  observacoes: string | null;
  ativo: boolean;
  funcoes: string[];
  veioDaInscricao: boolean;
};

export function FormMembro({ membro, funcoes }: { membro?: MembroForm; funcoes: Funcao[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [ativo, setAtivo] = useState(membro?.ativo ?? true);

  function enviar(fd: FormData) {
    setErro(null);
    if (ativo) fd.set("ativo", "on");
    iniciar(async () => {
      const r = await salvarMembro(membro?.id ?? null, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success(membro ? "Membro salvo!" : "Membro cadastrado!");
      if (!membro) router.push(`/membros/${r.dados.id}`);
    });
  }

  return (
    <form onSubmit={semReset(enviar)} className="space-y-5">
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="m-nome">Nome</Label>
          <Input id="m-nome" name="nome" defaultValue={membro?.nome} required autoCapitalize="words" />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Sexo</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["masculino", "feminino"] as const).map((s) => (
              <label key={s} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-background px-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="radio" name="sexo" value={s} defaultChecked={membro?.sexo === s} required className="size-5 accent-[var(--primary)]" />
                {s === "masculino" ? "Masculino" : "Feminino"}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="m-nasc">Nascimento</Label>
            <Input id="m-nasc" name="nascimento" type="date" defaultValue={membro?.nascimento ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-idade">ou idade</Label>
            <Input id="m-idade" name="idade" type="number" inputMode="numeric" min={5} max={120} defaultValue={membro?.nascimento ? "" : (membro?.idade ?? "")} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="m-tel">Telefone/WhatsApp</Label>
            <InputTelefone id="m-tel" name="telefone" defaultValue={membro?.telefone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-cidade">Cidade</Label>
            <Input id="m-cidade" name="cidade" defaultValue={membro?.cidade ?? ""} />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Na Bandinha</h2>
        <ChipsFuncoes funcoes={funcoes} marcadas={membro?.funcoes ?? []} />
        <div className="space-y-2">
          <Label htmlFor="m-nivel">Nível</Label>
          <select id="m-nivel" name="nivel" defaultValue={membro?.nivel ?? ""} className="h-11 w-full rounded-lg border border-input bg-background px-3 md:h-10">
            <option value="">Não informado</option>
            {(Object.keys(ROTULO_NIVEL) as Nivel[]).map((n) => (
              <option key={n} value={n}>{ROTULO_NIVEL[n]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-obs">Observações</Label>
          <Textarea id="m-obs" name="observacoes" rows={3} defaultValue={membro?.observacoes ?? ""} />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t pt-3">
          <span>
            <span className="block font-medium">Ativo</span>
            <span className="text-sm text-muted-foreground">Inativos não aparecem na chamada nem nos envios.</span>
          </span>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </label>
      </section>

      <AlertaErro mensagem={erro} />
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pendente}>
        {pendente ? "Salvando…" : membro ? "Salvar alterações" : "Cadastrar membro"}
      </Button>

      {membro && (
        <div className="border-t pt-4">
          <Confirmar
            gatilho={
              <Button type="button" variant="ghost" className="text-destructive">
                <Trash2 /> Excluir membro
              </Button>
            }
            titulo={`Excluir ${membro.nome}?`}
            descricao="Apaga também a escala e o histórico de presença dessa pessoa. Para só tirar da equipe, prefira marcar como inativo."
            rotuloConfirmar="Excluir"
            destrutivo
            aoConfirmar={async () => {
              const r = await excluirMembro(membro.id);
              if (!r.ok) return toast.error(r.erro);
              toast.success("Membro excluído.");
              router.push("/membros");
            }}
          />
        </div>
      )}
    </form>
  );
}
