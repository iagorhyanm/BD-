"use client";

import Link from "next/link";
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
  // Controlado: o React limpa o formulário após a action, e não queremos perder o e-mail digitado.
  const [identificador, setIdentificador] = useState("");
  const qs = voltar ? `?voltar=${encodeURIComponent(voltar)}` : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Entrar</CardTitle>
        <CardDescription>Bem-vindo(a) de volta! Bora manter a sequência? 🔥</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={acao} className="space-y-4">
          <input type="hidden" name="voltar" value={voltar ?? ""} />
          <div className="space-y-2">
            <Label htmlFor="identificador">E-mail</Label>
            <Input
              id="identificador"
              name="identificador"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              placeholder="seu@email.com"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
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
          <p className="text-center text-sm">
            Ainda não tem conta?{" "}
            <Link href={`/cadastro${qs}`} className="font-semibold text-primary underline">
              Criar conta
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">Esqueceu a senha? Peça a um administrador para redefinir.</p>
        </form>
      </CardContent>
    </Card>
  );
}
