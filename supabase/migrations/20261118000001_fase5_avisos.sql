-- =====================================================================
-- Bandinha EJC Marabá — Fase 5: avisos e histórico de envios
-- =====================================================================

create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete restrict,
  titulo text not null check (length(trim(titulo)) > 0),
  texto text not null check (length(trim(texto)) > 0),
  fixado boolean not null default false,
  autor_id uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index avisos_edicao_idx on public.avisos (edicao_id, fixado desc, criado_em desc);

create trigger avisos_atualizado_em
  before update on public.avisos
  for each row execute function public.tocar_atualizado_em();

create trigger avisos_log
  after insert or update or delete on public.avisos
  for each row execute function public.log_alteracao('titulo', 'titulo', 'fixado');

-- Histórico de "Enviar para membros" (via WhatsApp).
create table public.aviso_envios (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references public.avisos (id) on delete cascade,
  filtro jsonb not null default '{}'::jsonb,
  filtro_descricao text,
  destinatarios int not null default 0,
  enviado_por uuid references public.profiles (id) on delete set null,
  enviado_em timestamptz not null default now()
);

create index aviso_envios_aviso_idx on public.aviso_envios (aviso_id, enviado_em desc);

alter table public.avisos enable row level security;
alter table public.aviso_envios enable row level security;

revoke all on public.avisos, public.aviso_envios from anon;

create policy "avisos: staff" on public.avisos for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "aviso_envios: staff" on public.aviso_envios for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
