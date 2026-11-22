import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SearchX className="size-7" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-muted-foreground">
          O link pode estar errado, ou você não participa desse desafio.
        </p>
        <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
