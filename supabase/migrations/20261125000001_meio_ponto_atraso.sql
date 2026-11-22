-- =====================================================================
-- BibleRats — leitura marcada com atraso vale MEIO ponto.
-- No próprio dia: 1 ponto. Até 3 dias depois: 0,5 ponto.
-- =====================================================================
drop function public.placar_grupo(uuid);
create function public.placar_grupo(p_grupo uuid)
returns table (user_id uuid, nome text, foto_path text, papel public.papel_grupo, pontos numeric, sequencia int, ultimo date)
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
    select c.user_id,
           sum(case when c.no_prazo then 1.0 else 0.5 end) as pontos,
           max(c.data) as ultimo
    from public.checkins c join m on m.user_id = c.user_id, g
    where c.data between g.inicio and g.ate
    group by c.user_id
  )
  select m.user_id, m.nome, m.foto_path, m.papel, coalesce(pts.pontos, 0)::numeric(10, 1), public.sequencia_atual(m.user_id), pts.ultimo
  from m left join pts on pts.user_id = m.user_id
  order by coalesce(pts.pontos, 0) desc, public.sequencia_atual(m.user_id) desc, m.nome
$$;
revoke execute on function public.placar_grupo(uuid) from anon;

-- =====================================================================
-- Check-in: "o que aprendi", foto e tempo de leitura passam a ser
-- obrigatórios (o versículo continua opcional).
-- =====================================================================
create or replace function public.validar_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.data is distinct from old.data then
    raise exception 'DATA_FIXA' using errcode = 'P0001';
  end if;
  if new.data > public.hoje_belem() then
    raise exception 'DATA_FUTURA' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    if new.data < public.hoje_belem() - 3 then
      raise exception 'DATA_ANTIGA' using errcode = 'P0001';
    end if;
    new.no_prazo := new.data = public.hoje_belem();
  else
    new.no_prazo := old.no_prazo;
  end if;
  if new.minutos is null or coalesce(length(trim(new.anotacao)), 0) < 3 or new.foto_path is null then
    raise exception 'CAMPOS_OBRIGATORIOS' using errcode = 'P0001';
  end if;
  if split_part(new.foto_path, '/', 1) <> new.user_id::text then
    raise exception 'FOTO_INVALIDA' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
