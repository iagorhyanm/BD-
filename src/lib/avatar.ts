/** URL pública da foto de perfil (bucket "avatares"). */
export function urlFoto(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatares/${path}`;
}
