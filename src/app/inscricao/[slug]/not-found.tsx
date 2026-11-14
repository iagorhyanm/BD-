import { SearchX } from "lucide-react";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-destaque/20 text-primary">
          <SearchX className="size-7" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">Formulário não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Confira se o link está correto ou peça um novo link à coordenação.</p>
      </div>
    </main>
  );
}
