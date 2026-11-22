-- =====================================================================
-- BibleRats — notificações push (lembrete diário, check-ins dos
-- amigos e comentários na sua leitura).
-- =====================================================================

-- Preferências (cada pessoa liga/desliga cada tipo)
alter table public.profiles
  add column notif_lembrete boolean not null default true,
  add column notif_checkins boolean not null default true,
  add column notif_comentarios boolean not null default true;

-- Um registro por aparelho/navegador com notificações ativadas.
create table public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  aparelho text check (aparelho is null or length(aparelho) <= 200),
  criado_em timestamptz not null default now()
);
create index push_inscricoes_user_idx on public.push_inscricoes (user_id);

alter table public.push_inscricoes enable row level security;
revoke all on public.push_inscricoes from anon;
revoke update on public.push_inscricoes from authenticated;

create policy "push: vê as próprias" on public.push_inscricoes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "push: cadastra as próprias" on public.push_inscricoes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.usuario_ativo()));
create policy "push: remove as próprias" on public.push_inscricoes for delete to authenticated
  using (user_id = (select auth.uid()));
