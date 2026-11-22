-- =====================================================================
-- BibleRats — foto de perfil
-- Bucket público "avatares" (arquivo com nome aleatório, na pasta do
-- próprio usuário). Só o dono envia, troca ou apaga a própria foto.
-- =====================================================================

alter table public.profiles add column foto_path text
  check (foto_path is null or length(foto_path) <= 200);

-- A foto precisa estar na pasta do próprio usuário.
create or replace function public.validar_foto_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.foto_path is not null and split_part(new.foto_path, '/', 1) <> new.id::text then
    raise exception 'FOTO_INVALIDA' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger profiles_validar_foto
  before insert or update of foto_path on public.profiles
  for each row execute function public.validar_foto_perfil();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatares: envia na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatares: vê a própria pasta" on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatares: apaga da própria pasta" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Placar passa a devolver a foto de cada pessoa.
drop function public.placar_grupo(uuid);
create function public.placar_grupo(p_grupo uuid)
returns table (user_id uuid, nome text, foto_path text, papel public.papel_grupo, pontos int, sequencia int, ultimo date)
language sql
stable
set search_path = ''
as $$
  with g as (
    select inicio, least(coalesce(fim, public.hoje_belem()), public.hoje_belem()) as ate
    from public.grupos where id = p_grupo
  ), m as (
    select gm.user_id, gm.papel, p.nome, p.foto_path
    from public.grupo_membros gm join public.profiles p on p.id = gm.user_id
    where gm.grupo_id = p_grupo
  ), pts as (
    select c.user_id, count(*)::int as pontos, max(c.data) as ultimo
    from public.checkins c join m on m.user_id = c.user_id, g
    where c.data between g.inicio and g.ate
    group by c.user_id
  )
  select m.user_id, m.nome, m.foto_path, m.papel, coalesce(pts.pontos, 0), public.sequencia_atual(m.user_id), pts.ultimo
  from m left join pts on pts.user_id = m.user_id
  order by coalesce(pts.pontos, 0) desc, public.sequencia_atual(m.user_id) desc, m.nome
$$;
revoke execute on function public.placar_grupo(uuid) from anon;
