-- =====================================================================
-- Bandinha EJC Marabá — Foto do rosto e vídeo na inscrição
-- =====================================================================

-- Novos tipos de pergunta.
alter type public.tipo_pergunta add value if not exists 'foto';
alter type public.tipo_pergunta add value if not exists 'video';

-- Bucket PRIVADO para fotos e vídeos das inscrições.
-- O público NÃO tem permissão de escrita: o servidor gera uma URL assinada
-- de uso único (com limite por IP) para cada arquivo. Só o staff lê/apaga.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inscricoes', 'inscricoes', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-matroska']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "inscricoes: staff lê" on storage.objects for select to authenticated
  using (bucket_id = 'inscricoes' and (select public.is_staff()));
create policy "inscricoes: staff exclui" on storage.objects for delete to authenticated
  using (bucket_id = 'inscricoes' and (select public.is_staff()));

-- Uso de armazenamento por bucket (para o EDG acompanhar o limite do plano).
create or replace function public.uso_armazenamento()
returns table (bucket text, arquivos bigint, bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, count(*), coalesce(sum((o.metadata ->> 'size')::bigint), 0)
  from storage.objects o
  where public.is_edg()
  group by o.bucket_id
  order by 3 desc
$$;

-- Arquivos de inscrição que não pertencem a nenhuma inscrição (formulário
-- abandonado no meio) e têm mais de 1 dia.
create or replace function public.arquivos_orfaos_inscricao()
returns table (nome text, bytes bigint, criado_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, coalesce((o.metadata ->> 'size')::bigint, 0), o.created_at
  from storage.objects o
  where public.is_edg()
    and o.bucket_id = 'inscricoes'
    and o.created_at < now() - interval '1 day'
    and not exists (
      select 1
      from public.inscricoes i, jsonb_each_text(i.respostas) r
      where r.value = o.name or r.value = 'arquivo:' || o.name
    )
$$;

revoke execute on function public.uso_armazenamento() from public, anon;
revoke execute on function public.arquivos_orfaos_inscricao() from public, anon;
grant execute on function public.uso_armazenamento() to authenticated;
grant execute on function public.arquivos_orfaos_inscricao() to authenticated;
