"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { cadastrar } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoSenha } from "@/components/campo-senha";
import { AlertaErro } from "@/components/alerta-erro";

export function CadastroForm({ voltar }: { voltar?: string }) {
  const [estado, acao, pendente] = useActionState(cadastrar, undefined);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const qs = voltar ? `?voltar=${encodeURIComponent(voltar)}` : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar conta</CardTitle>
        <CardDescription>Leva menos de um minuto. Depois é só fazer o primeiro check-in de leitura.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={acao} className="space-y-4">
          <input type="hidden" name="voltar" value={voltar ?? ""} />
          <div className="space-y-2">
            <Label htmlFor="nome">Seu nome</Label>
            <Input id="nome" name="nome" autoComplete="name" autoCapitalize="words" required maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <CampoSenha id="senha" name="senha" autoComplete="new-password" required minLength={8} />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres, com letras e números.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmacao">Repita a senha</Label>
            <CampoSenha id="confirmacao" name="confirmacao" autoComplete="new-password" required minLength={8} />
          </div>
          <AlertaErro mensagem={estado?.erro} />
          <Button type="submit" size="lg" className="w-full" disabled={pendente}>
            {pendente ? "Criando conta…" : "Criar conta"}
          </Button>
          <p className="text-center text-sm">
            Já tem conta?{" "}
            <Link href={`/login${qs}`} className="font-semibold text-primary underline">
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
