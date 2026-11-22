"use client";

/** Ajuda do lado do navegador para ativar/desativar as notificações. */

export type EstadoPush = "sem-suporte" | "instalar-primeiro" | "bloqueado" | "ativo" | "inativo";

export function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
export function appInstalado() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export async function estadoPush(): Promise<EstadoPush> {
  const suporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!suporta) return ehIOS() && !appInstalado() ? "instalar-primeiro" : "sem-suporte";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "ativo" : "inativo";
}

function chaveParaBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

function nomeAparelho() {
  const ua = navigator.userAgent;
  const so = /android/i.test(ua) ? "Android" : ehIOS() ? "iPhone/iPad" : /windows/i.test(ua) ? "Windows" : /mac/i.test(ua) ? "Mac" : "Outro";
  const nav = /edg\//i.test(ua) ? "Edge" : /samsungbrowser/i.test(ua) ? "Samsung" : /firefox|fxios/i.test(ua) ? "Firefox" : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "";
  return `${so}${nav ? ` · ${nav}` : ""}`;
}

/** Pede permissão e cria a inscrição. Devolve a inscrição (JSON) para salvar no servidor. */
export async function ativarPush(): Promise<{ inscricao: PushSubscriptionJSON; aparelho: string } | { erro: string }> {
  const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!chave) return { erro: "Notificações ainda não configuradas." };
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return { erro: "Você não permitiu as notificações." };
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const existente = await reg.pushManager.getSubscription();
  const sub = existente ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave) }));
  return { inscricao: sub.toJSON(), aparelho: nomeAparelho() };
}

export async function desativarPush(): Promise<string | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
