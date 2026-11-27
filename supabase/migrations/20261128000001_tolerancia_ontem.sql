-- =====================================================================
-- BibleRats — tolerância de 1 dia.
-- Esqueceu de marcar? A leitura de ONTEM marcada hoje conta como
-- feita no prazo: vale 1 ponto e mantém a sequência 🔥.
-- De 2 a 3 dias de atraso continua valendo meio ponto, sem sequência.
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
    -- Hoje ou ontem: no prazo (1 ponto e conta na sequência).
    new.no_prazo := new.data >= public.hoje_belem() - 1;
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

-- Sequência: dias seguidos do plano lidos no prazo. Hoje e ontem ainda
-- podem ser marcados, então não quebram a sequência enquanto estão
-- pendentes: se hoje não foi marcado, ele é ignorado; se hoje E ontem
-- não foram marcados, os dois são ignorados. (Se hoje foi marcado e
-- ontem não, ontem conta como falha — até a pessoa marcar.)
create or replace function public.sequencia_atual(p_user uuid)
returns int
language sql
stable
set search_path = ''
as $$
  with dias as (
    select d.data,
           exists (select 1 from public.checkins c where c.user_id = p_user and c.data = d.data and c.no_prazo) as ok
    from public.plano_dias d
    where d.data <= public.hoje_belem()
  ), leu_hoje as (
    select coalesce((select ok from dias where data = public.hoje_belem()), false) as v
  ), considerados as (
    select * from dias
    where not (data = public.hoje_belem() and not ok)
      and not (data = public.hoje_belem() - 1 and not ok and not (select v from leu_hoje))
  ), marcados as (
    select ok, count(*) filter (where not ok) over (order by data desc) as falhas from considerados
  )
  select count(*)::int from marcados where falhas = 0 and ok
$$;
revoke execute on function public.sequencia_atual(uuid) from anon;

-- Vale também para o que já foi marcado: leituras lançadas no dia seguinte
-- passam a contar como no prazo.
alter table public.checkins disable trigger checkins_validar;
update public.checkins
set no_prazo = true
where not no_prazo
  and (criado_em at time zone 'America/Belem')::date <= data + 1;
alter table public.checkins enable trigger checkins_validar;
