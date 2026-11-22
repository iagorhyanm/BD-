import { sair } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SemAcessoPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Acesso não liberado</CardTitle>
        <CardDescription>
          Sua conta está desativada. Fale com um administrador do BibleRats.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={sair}>
          <Button type="submit" className="w-full" size="lg">
            Sair
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
