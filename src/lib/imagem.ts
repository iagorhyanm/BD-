/** Reduz a imagem no navegador (máx. `max` px, JPEG) para enviar rápido no 4G. */
export async function reduzirImagem(arquivo: File, max = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, erro) =>
    canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Falha ao processar a imagem"))), "image/jpeg", 0.82),
  );
}
