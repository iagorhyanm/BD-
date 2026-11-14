-- =====================================================================
-- Bandinha EJC Marabá — Fase 3: membros (funções), agenda, escala e presença
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funções (vozes e instrumentos) — lista global, editável pelo EDG
-- ---------------------------------------------------------------------
create type public.tipo_funcao as enum ('voz', 'instrumento', 'outro');

create table public.funcoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (length(trim(nome)) > 0),
  tipo public.tipo_funcao not null,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

insert into public.funcoes (nome, tipo, ordem) values
  ('Voz principal', 'voz', 1),
  ('Backing vocal', 'voz', 2),
  ('Violão', 'instrumento', 10),
  ('Guitarra', 'instrumento', 11),
  ('Baixo', 'instrumento', 12),
  ('Teclado', 'instrumento', 13),
  ('Bateria', 'instrumento', 14),
  ('Cajón', 'instrumento', 15),
  ('Percussão', 'instrumento', 16),
  ('Flauta', 'instrumento', 17),
  ('Violino', 'instrumento', 18),
  ('Som / mesa', 'outro', 30);

create table public.membro_funcoes (
  membro_id uuid not null references public.membros (id) on delete cascade,
  funcao_id uuid not null references public.funcoes (id) on delete cascade,
  primary key (membro_id, funcao_id)
);

create index membro_funcoes_funcao_idx on public.membro_funcoes (funcao_id);

-- ---------------------------------------------------------------------
-- Eventos: ensaios e apresentações
-- ---------------------------------------------------------------------
create type public.tipo_evento as enum ('ensaio', 'apresentacao');

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete restrict,
  tipo public.tipo_evento not null,
  titulo text not null check (length(trim(titulo)) > 0),
  inicio timestamptz not null,
  fim timestamptz,
  local text,
  pauta text,
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim is null or fim > inicio)
);

create index eventos_edicao_inicio_idx on public.eventos (edicao_id, inicio);

create trigger eventos_atualizado_em
  before update on public.eventos
  for each row execute function public.tocar_atualizado_em();

create trigger eventos_log
  after insert or update or delete on public.eventos
  for each row execute function public.log_alteracao('titulo', 'titulo', 'inicio', 'fim', 'local', 'tipo');

-- ---------------------------------------------------------------------
-- Escala: quem toca/canta o quê em cada evento
-- ---------------------------------------------------------------------
create table public.escalas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  membro_id uuid not null references public.membros (id) on delete cascade,
  funcao_id uuid not null references public.funcoes (id) on delete restrict,
  observacao text,
  criado_em timestamptz not null default now(),
  unique (evento_id, membro_id, funcao_id)
);

create index escalas_membro_idx on public.escalas (membro_id);

-- ---------------------------------------------------------------------
-- Presença
-- ---------------------------------------------------------------------
create type public.status_presenca as enum ('presente', 'falta', 'justificada', 'atraso');

create table public.presencas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  membro_id uuid not null references public.membros (id) on delete cascade,
  status public.status_presenca not null,
  motivo text,
  registrado_por uuid references public.profiles (id) on delete set null,
  atualizado_em timestamptz not null default now(),
  unique (evento_id, membro_id),
  check (status <> 'justificada' or length(trim(coalesce(motivo, ''))) > 0)
);

create index presencas_membro_idx on public.presencas (membro_id);

create trigger presencas_atualizado_em
  before update on public.presencas
  for each row execute function public.tocar_atualizado_em();

-- Resumo de presença por membro de uma edição.
-- Faltas "contáveis" = faltas não justificadas (decisão da equipe).
create or replace view public.resumo_presenca
with (security_invoker = true) as
select
  m.id as membro_id,
  m.edicao_id,
  m.nome,
  m.sexo,
  m.ativo,
  count(p.id)::int as registros,
  count(p.id) filter (where p.status = 'presente')::int as presentes,
  count(p.id) filter (where p.status = 'atraso')::int as atrasos,
  count(p.id) filter (where p.status = 'falta')::int as faltas,
  count(p.id) filter (where p.status = 'justificada')::int as justificadas,
  case when count(p.id) = 0 then null
       else round(100.0 * count(p.id) filter (where p.status in ('presente', 'atraso')) / count(p.id))::int
  end as percentual
from public.membros m
left join public.presencas p on p.membro_id = m.id
group by m.id;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.funcoes enable row level security;
alter table public.membro_funcoes enable row level security;
alter table public.eventos enable row level security;
alter table public.escalas enable row level security;
alter table public.presencas enable row level security;

revoke all on public.funcoes, public.membro_funcoes, public.eventos, public.escalas, public.presencas,
  public.resumo_presenca from anon;

create policy "funcoes: staff lê" on public.funcoes for select to authenticated
  using ((select public.is_staff()));
create policy "funcoes: EDG escreve" on public.funcoes for all to authenticated
  using ((select public.is_edg())) with check ((select public.is_edg()));

create policy "membro_funcoes: staff" on public.membro_funcoes for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "eventos: staff" on public.eventos for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "escalas: staff" on public.escalas for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "presencas: staff" on public.presencas for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
