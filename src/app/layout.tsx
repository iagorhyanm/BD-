import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { RegistrarSW } from "@/components/registrar-sw";
import { cssVariaveisDoTema, tema } from "@/theme.config";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: tema.nome, template: `%s · ${tema.nomeCurto}` },
  description: tema.descricao,
  applicationName: tema.nomeCurto,
  appleWebApp: { capable: true, title: tema.nomeCurto, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: tema.cores.primaria,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssVariaveisDoTema() }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors closeButton />
        <RegistrarSW />
      </body>
    </html>
  );
}
