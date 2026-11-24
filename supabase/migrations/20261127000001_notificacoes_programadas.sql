-- =====================================================================
-- BibleRats — notificações programadas pelo administrador
-- (uma vez, diária ou semanal), com texto personalizado por pessoa.
-- O envio é feito pela rota /api/cron/notificacoes, chamada a cada
-- 5 minutos pelo agendador do Supabase (pg_cron + pg_net; veja
-- supabase/agendador.sql). O lembrete diário também passa a sair por
-- ela, no horário configurado aqui.
-- =====================================================================

alter table public.profiles add column notif_avisos boolean not null default true;

alter table public.app_config
  add column lembrete_ativo boolean not null default true,
  add column lembrete_hora time not null default '18:00',
  add column lembrete_ultimo date;

create table public.notificacoes_programadas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) between 1 and 80),
  mensagem text not null check (length(trim(mensagem)) between 1 and 300),
  destino text not null default '/' check (destino in ('/', '/checkin/novo', '/plano', '/grupos')),
  recorrencia text not null check (recorrencia in ('uma_vez', 'diaria', 'semanal')),
  data date,
  hora time not null,
  dias_semana smallint[] not null default '{}',
  publico text not null default 'todos' check (publico in ('todos', 'grupo', 'pessoas')),
  grupo_id uuid references public.grupos (id) on delete cascade,
  pessoas uuid[] not null default '{}',
  so_quem_nao_leu boolean not null default false,
  ativa boolean not null default true,
  proximo_envio timestamptz,
  ultimo_envio timestamptz,
  ultimo_total int,
  criado_por uuid references public.profiles (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (recorrencia <> 'uma_vez' or data is not null),
  check (recorrencia <> 'semanal' or cardinality(dias_semana) between 1 and 7),
  check (dias_semana <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  check (publico <> 'grupo' or grupo_id is not null),
  check (publico <> 'pessoas' or cardinality(pessoas) between 1 and 1000)
);
create index notificacoes_programadas_proximo_idx on public.notificacoes_programadas (proximo_envio) where ativa;

create trigger notificacoes_programadas_atualizado_em
  before update on public.notificacoes_programadas
  for each row execute function public.tocar_atualizado_em();

create table public.notificacoes_envios (
  id uuid primary key default gen_random_uuid(),
  notificacao_id uuid references public.notificacoes_programadas (id) on delete cascade,
  tipo text not null default 'programada' check (tipo in ('programada', 'lembrete', 'teste')),
  enviado_em timestamptz not null default now(),
  destinatarios int not null default 0,
  entregues int not null default 0
);
create index notificacoes_envios_notif_idx on public.notificacoes_envios (notificacao_id, enviado_em desc);

alter table public.notificacoes_programadas enable row level security;
alter table public.notificacoes_envios enable row level security;
revoke all on public.notificacoes_programadas, public.notificacoes_envios from anon;

create policy "notif prog: admin lê" on public.notificacoes_programadas for select to authenticated using ((select public.is_admin()));
create policy "notif prog: admin cria" on public.notificacoes_programadas for insert to authenticated with check ((select public.is_admin()));
create policy "notif prog: admin altera" on public.notificacoes_programadas for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "notif prog: admin exclui" on public.notificacoes_programadas for delete to authenticated using ((select public.is_admin()));
create policy "notif envios: admin lê" on public.notificacoes_envios for select to authenticated using ((select public.is_admin()));
