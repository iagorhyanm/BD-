"use client";

import Link from "next/link";
import { useActionState } from "react";
import { trocarSenha, sair } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CampoSenha } from "@/components/campo-senha";
import { AlertaErro } from "@/components/alerta-erro";

export function TrocarSenhaForm({ nome, obrigatoria }: { nome: string; obrigatoria: boolean }) {
  const [estado, acao, pendente] = useActionState(trocarSenha, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{obrigatoria ? `Olá, ${nome}! 👋` : "Trocar senha"}</CardTitle>
        <CardDescription>
          {obrigatoria
            ? "Antes de continuar, crie a sua senha pessoal. A senha provisória deixa de valer."
            : "Escolha uma nova senha para entrar no sistema."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={acao} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <CampoSenha id="senha" name="senha" autoComplete="new-password" required minLength={8} />
            <p className="text-sm text-muted-foreground">Mínimo de 8 caracteres, com letras e números.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmacao">Repita a nova senha</Label>
            <CampoSenha id="confirmacao" name="confirmacao" autoComplete="new-password" required minLength={8} />
          </div>
          <AlertaErro mensagem={estado?.erro} />
          <Button type="submit" size="lg" className="w-full" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar senha"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          {obrigatoria ? (
            <form action={sair}>
              <Button type="submit" variant="link">
                Sair
              </Button>
            </form>
          ) : (
            <Button asChild variant="link">
              <Link href="/">Voltar</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
