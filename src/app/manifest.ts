import type { MetadataRoute } from "next";
import { tema } from "@/theme.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: tema.nome,
    short_name: tema.nomeCurto,
    description: tema.descricao,
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: tema.cores.fundo,
    theme_color: tema.cores.primaria,
    categories: ["productivity", "music"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Seleção", url: "/selecao", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Agenda", url: "/agenda", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Presença", url: "/presenca", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
