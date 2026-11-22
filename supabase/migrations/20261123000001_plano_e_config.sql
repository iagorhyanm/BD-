-- =====================================================================
-- BibleRats — plano de leitura único (por data do calendário),
-- configurações gerais do app e aviso para todos.
--
-- Decisões:
--  * Um plano para todos; cada data tem a sua leitura.
--  * O check-in passa a ser "marquei a leitura do plano do dia X".
--  * Leitura atrasada vale ponto até 3 dias depois; a sequência 🔥
--    só conta leituras marcadas no próprio dia.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configurações gerais (uma linha só)
-- ---------------------------------------------------------------------
create table public.app_config (
  id int primary key default 1 check (id = 1),
  nome text not null default 'BibleRats' check (length(trim(nome)) between 2 and 40),
  slogan text not null default 'Leitura bíblica diária, em grupo.' check (length(slogan) <= 120),
  boas_vindas text not null default 'Bem-vindo(a)! Bora manter a sequência? 🔥' check (length(boas_vindas) <= 300),
  aviso_texto text check (aviso_texto is null or length(aviso_texto) <= 500),
  aviso_ativo boolean not null default false,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.profiles (id) on delete set null
);

insert into public.app_config (id) values (1);

create trigger app_config_atualizado_em
  before update on public.app_config
  for each row execute function public.tocar_atualizado_em();

create trigger app_config_log
  after update on public.app_config
  for each row execute function public.log_alteracao('nome', 'nome', 'slogan', 'boas_vindas', 'aviso_texto', 'aviso_ativo');

-- ---------------------------------------------------------------------
-- Plano de leitura: uma linha por data
-- ---------------------------------------------------------------------
create table public.plano_dias (
  data date primary key,
  -- Texto exibido, como veio do plano (ex.: "Gênesis 1–3; Salmo 1")
  leitura text not null check (length(trim(leitura)) between 1 and 300),
  -- Referências já interpretadas: [{"livro":"gn","inicio":1,"fim":3}, ...]
  referencias jsonb not null default '[]'::jsonb check (jsonb_typeof(referencias) = 'array'),
  titulo text check (titulo is null or length(titulo) <= 150),
  -- Texto de apoio / devocional opcional
  texto text check (texto is null or length(texto) <= 5000),
  atualizado_em timestamptz not null default now()
);

create trigger plano_dias_atualizado_em
  before update on public.plano_dias
  for each row execute function public.tocar_atualizado_em();

-- Valida as referências contra os livros e capítulos da Bíblia.
create or replace function public.validar_plano_dia()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  r jsonb;
  v_caps int;
begin
  for r in select * from jsonb_array_elements(new.referencias)
  loop
    select capitulos into v_caps from public.livros_biblia where id = r ->> 'livro';
    if v_caps is null
       or (r ->> 'inicio')::int < 1
       or (r ->> 'fim')::int < (r ->> 'inicio')::int
       or (r ->> 'fim')::int > v_caps then
      raise exception 'REFERENCIA_INVALIDA: %', r using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$;

create trigger plano_dias_validar
  before insert or update on public.plano_dias
  for each row execute function public.validar_plano_dia();

-- ---------------------------------------------------------------------
-- Check-ins: agora ligados ao dia do plano (um por pessoa por dia)
-- ---------------------------------------------------------------------
drop trigger if exists checkins_validar on public.checkins;
drop function if exists public.validar_checkin();

alter table public.checkins drop column livro;
alter table public.checkins drop column capitulo_inicio;
alter table public.checkins drop column capitulo_fim;
alter table public.checkins add column no_prazo boolean not null default true;
alter table public.checkins
  add constraint checkins_data_plano_fkey foreign key (data) references public.plano_dias (data) on update cascade;
alter table public.checkins add constraint checkins_um_por_dia unique (user_id, data);

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
    -- Marcou no próprio dia? (conta para a sequência 🔥)
    new.no_prazo := new.data = public.hoje_belem();
  else
    new.no_prazo := old.no_prazo;
  end if;
  if new.foto_path is not null and split_part(new.foto_path, '/', 1) <> new.user_id::text then
    raise exception 'FOTO_INVALIDA' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger checkins_validar
  before insert or update on public.checkins
  for each row execute function public.validar_checkin();

-- ---------------------------------------------------------------------
-- Sequência, placar e estatísticas (sobre os dias do plano)
-- ---------------------------------------------------------------------

-- Sequência: dias do plano seguidos lidos NO PRÓPRIO DIA. Se hoje ainda
-- não foi marcado, conta a partir do dia anterior do plano.
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
  ), considerados as (
    select * from dias where not (data = public.hoje_belem() and not ok)
  ), marcados as (
    select ok, count(*) filter (where not ok) over (order by data desc) as falhas from considerados
  )
  select count(*)::int from marcados where falhas = 0 and ok
$$;

-- Placar: 1 ponto por dia do plano lido (no prazo ou até 3 dias depois)
-- dentro do período do desafio.
create or replace function public.placar_grupo(p_grupo uuid)
returns table (user_id uuid, nome text, papel public.papel_grupo, pontos int, sequencia int, ultimo date)
language sql
stable
set search_path = ''
as $$
  with g as (
    select inicio, least(coalesce(fim, public.hoje_belem()), public.hoje_belem()) as ate
    from public.grupos where id = p_grupo
  ), m as (
    select gm.user_id, gm.papel, p.nome
    from public.grupo_membros gm join public.profiles p on p.id = gm.user_id
    where gm.grupo_id = p_grupo
  ), pts as (
    select c.user_id, count(*)::int as pontos, max(c.data) as ultimo
    from public.checkins c join m on m.user_id = c.user_id, g
    where c.data between g.inicio and g.ate
    group by c.user_id
  )
  select m.user_id, m.nome, m.papel, coalesce(pts.pontos, 0), public.sequencia_atual(m.user_id), pts.ultimo
  from m left join pts on pts.user_id = m.user_id
  order by coalesce(pts.pontos, 0) desc, public.sequencia_atual(m.user_id) desc, m.nome
$$;

create or replace function public.estatisticas_usuario(p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with c as (select * from public.checkins where user_id = p_user),
  refs as (
    select r
    from c join public.plano_dias d on d.data = c.data, jsonb_array_elements(d.referencias) r
  ),
  caps as (
    select distinct r ->> 'livro' as livro, generate_series((r ->> 'inicio')::int, (r ->> 'fim')::int) as cap from refs
  ),
  por_livro as (
    select l.id, l.capitulos, count(caps.cap)::int as lidos
    from public.livros_biblia l left join caps on caps.livro = l.id
    group by l.id, l.capitulos
  ),
  dias_plano as (
    select d.data,
           exists (select 1 from c where c.data = d.data and c.no_prazo) as ok,
           row_number() over (order by d.data) as rn
    from public.plano_dias d where d.data <= public.hoje_belem()
  ),
  ilhas as (
    select count(*)::int as n
    from (select rn - row_number() over (order by rn) as grupo from dias_plano where ok) x
    group by grupo
  )
  select jsonb_build_object(
    'dias', (select count(*) from c),
    'no_prazo', (select count(*) from c where no_prazo),
    'capitulos', (select coalesce(sum((r ->> 'fim')::int - (r ->> 'inicio')::int + 1), 0) from refs),
    'minutos', (select coalesce(sum(minutos), 0) from c),
    'sequencia', public.sequencia_atual(p_user),
    'recorde', (select coalesce(max(n), 0) from ilhas),
    'capitulos_distintos', (select count(*) from caps),
    'livros_concluidos', (select count(*) from por_livro where lidos = capitulos),
    'por_livro', (select jsonb_object_agg(id, lidos) from por_livro where lidos > 0)
  )
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.app_config enable row level security;
alter table public.plano_dias enable row level security;

revoke insert, delete on public.app_config from anon, authenticated;
revoke insert, update, delete on public.app_config from anon;
revoke all on public.plano_dias from anon;

create policy "config: todos leem" on public.app_config for select to anon, authenticated using (true);
create policy "config: admin altera" on public.app_config for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "plano: usuários leem" on public.plano_dias for select to authenticated using (true);
create policy "plano: admin cria" on public.plano_dias for insert to authenticated with check ((select public.is_admin()));
create policy "plano: admin altera" on public.plano_dias for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "plano: admin exclui" on public.plano_dias for delete to authenticated using ((select public.is_admin()));

revoke execute on function public.placar_grupo(uuid), public.estatisticas_usuario(uuid), public.sequencia_atual(uuid) from anon;

-- Primeira e última data do plano (para navegar entre os meses).
create or replace function public.limites_plano()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('inicio', min(data), 'fim', max(data)) from public.plano_dias
$$;
revoke execute on function public.limites_plano() from anon;
