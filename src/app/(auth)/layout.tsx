import Image from "next/image";
import { tema } from "@/theme.config";
import { obterConfig } from "@/lib/config";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const config = await obterConfig();
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-primary px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full border-[40px] border-destaque/15" />
      <div aria-hidden className="pointer-events-none absolute -bottom-52 -left-40 size-[32rem] rounded-full border-[56px] border-white/5" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center text-primary-foreground">
          <Image src={tema.logo} alt="" width={64} height={64} priority className="size-16" />
          <div>
            <p className="text-2xl font-bold tracking-tight">{config.nome}</p>
            <p className="text-sm text-primary-foreground/75">{config.slogan}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
