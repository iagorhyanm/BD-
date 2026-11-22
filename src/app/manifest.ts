import type { MetadataRoute } from "next";
import { tema } from "@/theme.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: tema.nome,
    short_name: tema.nomeCurto,
    description: tema.descricao,
    lang: "pt-BR",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: tema.cores.fundo,
    theme_color: tema.cores.primaria,
    categories: ["lifestyle", "books", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Marcar leitura", url: "/checkin/novo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Plano de leitura", url: "/plano", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Desafios", url: "/grupos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
