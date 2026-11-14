"use client";

import { useActionState, useState } from "react";
import { entrar } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoSenha } from "@/components/campo-senha";
import { AlertaErro } from "@/components/alerta-erro";

export function LoginForm({ voltar }: { voltar?: string }) {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  // Controlado: o React limpa o formulário após a action, e não queremos perder o login digitado.
  const [identificador, setIdentificador] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Entrar</CardTitle>
        <CardDescription>Acesso exclusivo dos coordenadores da Bandinha.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={acao} className="space-y-4">
          <input type="hidden" name="voltar" value={voltar ?? ""} />
          <div className="space-y-2">
            <Label htmlFor="identificador">E-mail ou usuário</Label>
            <Input
              id="identificador"
              name="identificador"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              placeholder="seu@email.com ou usuario"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <CampoSenha id="senha" name="senha" autoComplete="current-password" required />
          </div>
          <AlertaErro mensagem={estado?.erro} />
          <Button type="submit" size="lg" className="w-full" disabled={pendente}>
            {pendente ? "Entrando…" : "Entrar"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Esqueceu a senha? Peça ao EDG para redefinir.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
