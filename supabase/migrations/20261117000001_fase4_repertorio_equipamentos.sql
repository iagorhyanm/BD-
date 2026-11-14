-- =====================================================================
-- Bandinha EJC Marabá — Fase 4: repertório, setlists, equipamentos,
-- empréstimos e checklists por apresentação
-- =====================================================================

-- ---------------------------------------------------------------------
-- Músicas — biblioteca GLOBAL (reaproveitada entre edições)
-- ---------------------------------------------------------------------
create table public.musicas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  artista text,
  tom text,
  bpm int check (bpm is null or bpm between 20 and 300),
  -- abertura, palestra, missa, animacao, oracao, adoracao, louvor, encerramento, outro
  momentos text[] not null default '{}',
  cifra_url text,
  media_url text,
  observacoes text,
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index musicas_titulo_idx on public.musicas (lower(titulo));

create trigger musicas_atualizado_em
  before update on public.musicas
  for each row execute function public.tocar_atualizado_em();

create trigger musicas_log
  after insert or delete on public.musicas
  for each row execute function public.log_alteracao('titulo');

-- Quem canta/toca a música (membros da edição).
create table public.musica_interpretes (
  musica_id uuid not null references public.musicas (id) on delete cascade,
  membro_id uuid not null references public.membros (id) on delete cascade,
  papel text,
  primary key (musica_id, membro_id)
);

-- ---------------------------------------------------------------------
-- Setlists (por edição; opcionalmente ligada a um evento)
-- ---------------------------------------------------------------------
create table public.setlists (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete restrict,
  evento_id uuid unique references public.eventos (id) on delete set null,
  titulo text not null check (length(trim(titulo)) > 0),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger setlists_atualizado_em
  before update on public.setlists
  for each row execute function public.tocar_atualizado_em();

create table public.setlist_itens (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  musica_id uuid not null references public.musicas (id) on delete restrict,
  ordem int not null default 0,
  tom text,
  observacao text
);

create index setlist_itens_setlist_idx on public.setlist_itens (setlist_id, ordem);

-- ---------------------------------------------------------------------
-- Equipamentos (por edição; copiados ao duplicar a edição)
-- ---------------------------------------------------------------------
create type public.dono_equipamento as enum ('equipe', 'emprestado');
create type public.estado_equipamento as enum ('bom', 'defeito', 'manutencao');

create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete restrict,
  item text not null check (length(trim(item)) > 0),
  categoria text,
  quantidade int not null default 1 check (quantidade >= 0),
  dono_tipo public.dono_equipamento not null default 'equipe',
  dono_nome text,
  estado public.estado_equipamento not null default 'bom',
  responsavel text,
  foto_path text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (dono_tipo = 'equipe' or length(trim(coalesce(dono_nome, ''))) > 0)
);

create index equipamentos_edicao_idx on public.equipamentos (edicao_id);

create trigger equipamentos_atualizado_em
  before update on public.equipamentos
  for each row execute function public.tocar_atualizado_em();

create trigger equipamentos_log
  after insert or update or delete on public.equipamentos
  for each row execute function public.log_alteracao('item', 'item', 'estado', 'quantidade', 'responsavel');

create table public.emprestimos (
  id uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references public.equipamentos (id) on delete cascade,
  quem text not null check (length(trim(quem)) > 0),
  retirado_em timestamptz not null default now(),
  devolvido_em timestamptz,
  observacao text,
  registrado_por uuid references public.profiles (id) on delete set null,
  check (devolvido_em is null or devolvido_em >= retirado_em)
);

create index emprestimos_equip_idx on public.emprestimos (equipamento_id, retirado_em desc);

-- ---------------------------------------------------------------------
-- Checklist por apresentação (o que levar)
-- ---------------------------------------------------------------------
create table public.checklist_itens (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  equipamento_id uuid references public.equipamentos (id) on delete set null,
  descricao text not null check (length(trim(descricao)) > 0),
  quantidade int not null default 1 check (quantidade > 0),
  conferido boolean not null default false,
  conferido_por uuid references public.profiles (id) on delete set null,
  conferido_em timestamptz,
  ordem int not null default 0
);

create index checklist_evento_idx on public.checklist_itens (evento_id, ordem);

-- ---------------------------------------------------------------------
-- Storage: fotos de equipamentos (privado, só staff)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipamentos', 'equipamentos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "equipamentos: staff lê" on storage.objects for select to authenticated
  using (bucket_id = 'equipamentos' and (select public.is_staff()));
create policy "equipamentos: staff envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'equipamentos' and (select public.is_staff()));
create policy "equipamentos: staff altera" on storage.objects for update to authenticated
  using (bucket_id = 'equipamentos' and (select public.is_staff()));
create policy "equipamentos: staff exclui" on storage.objects for delete to authenticated
  using (bucket_id = 'equipamentos' and (select public.is_staff()));

-- ---------------------------------------------------------------------
-- Duplicar edição: agora copia também os equipamentos
-- ---------------------------------------------------------------------
create or replace function public.duplicar_edicao(p_origem uuid, p_nome text, p_ano int)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_nova uuid;
  v_setlist record;
  v_nova_setlist uuid;
begin
  if not public.is_edg() then
    raise exception 'Apenas o EDG pode duplicar edições.' using errcode = '42501';
  end if;

  insert into public.edicoes (nome, ano, vagas_masculino, vagas_feminino, limite_faltas, texto_lgpd, criado_por)
  select p_nome, p_ano, e.vagas_masculino, e.vagas_feminino, e.limite_faltas, e.texto_lgpd, auth.uid()
  from public.edicoes e
  where e.id = p_origem
  returning id into v_nova;

  if v_nova is null then
    raise exception 'Edição de origem não encontrada.' using errcode = 'P0002';
  end if;

  -- Equipamentos (a foto é compartilhada; empréstimos não são copiados).
  insert into public.equipamentos (edicao_id, item, categoria, quantidade, dono_tipo, dono_nome, estado,
    responsavel, foto_path, observacoes)
  select v_nova, item, categoria, quantidade, dono_tipo, dono_nome, estado, responsavel, foto_path, observacoes
  from public.equipamentos
  where edicao_id = p_origem;

  -- Setlists sem evento (repertórios "modelo") também vêm junto.
  for v_setlist in
    select id, titulo, observacoes from public.setlists where edicao_id = p_origem and evento_id is null
  loop
    insert into public.setlists (edicao_id, titulo, observacoes)
    values (v_nova, v_setlist.titulo, v_setlist.observacoes)
    returning id into v_nova_setlist;

    insert into public.setlist_itens (setlist_id, musica_id, ordem, tom, observacao)
    select v_nova_setlist, musica_id, ordem, tom, observacao
    from public.setlist_itens where setlist_id = v_setlist.id;
  end loop;

  return v_nova;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.musicas enable row level security;
alter table public.musica_interpretes enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_itens enable row level security;
alter table public.equipamentos enable row level security;
alter table public.emprestimos enable row level security;
alter table public.checklist_itens enable row level security;

revoke all on public.musicas, public.musica_interpretes, public.setlists, public.setlist_itens,
  public.equipamentos, public.emprestimos, public.checklist_itens from anon;

create policy "musicas: staff" on public.musicas for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "musica_interpretes: staff" on public.musica_interpretes for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "setlists: staff" on public.setlists for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "setlist_itens: staff" on public.setlist_itens for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "equipamentos: staff" on public.equipamentos for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "emprestimos: staff" on public.emprestimos for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "checklist_itens: staff" on public.checklist_itens for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
