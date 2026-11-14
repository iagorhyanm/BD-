-- =====================================================================
-- Bandinha EJC Marabá — Fase 2: formulários, inscrições públicas,
-- seleção, avaliações e "puxar para a equipe"
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.tipo_pergunta as enum (
  'texto_curto', 'texto_longo', 'multipla', 'caixas', 'sim_nao', 'escala', 'lista'
);

create type public.status_inscricao as enum (
  'pendente', 'em_analise', 'selecionado', 'lista_espera', 'nao_selecionado'
);

create type public.sexo as enum ('masculino', 'feminino');

create type public.nivel_membro as enum ('iniciante', 'intermediario', 'avancado');

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------

-- Só dígitos, sem o 55 do país.
create or replace function public.normalizar_telefone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when length(d) > 11 and left(d, 2) = '55' then substr(d, 3)
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

-- Data de hoje no fuso de Belém.
create or replace function public.hoje_belem()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Belem')::date
$$;

-- ---------------------------------------------------------------------
-- Formulários de inscrição
-- ---------------------------------------------------------------------
create table public.formularios (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 80),
  titulo text not null check (length(trim(titulo)) > 0),
  descricao text,
  capa_path text,
  -- Abrir/fechar manual. Mesmo "aberto", respeita as datas e o limite.
  aberto boolean not null default false,
  abre_em timestamptz,
  fecha_em timestamptz,
  limite int check (limite is null or limite > 0),
  msg_confirmacao text not null default
    'Inscrição recebida! 🎶 Em breve a coordenação da Bandinha vai entrar em contato pelo WhatsApp.',
  -- Se nulo, usa o texto LGPD da edição.
  texto_lgpd text,
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (abre_em is null or fecha_em is null or abre_em < fecha_em)
);

create index formularios_edicao_idx on public.formularios (edicao_id);

create trigger formularios_atualizado_em
  before update on public.formularios
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Perguntas personalizadas
-- ---------------------------------------------------------------------
create table public.perguntas (
  id uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references public.formularios (id) on delete cascade,
  tipo public.tipo_pergunta not null,
  rotulo text not null check (length(trim(rotulo)) > 0),
  ajuda text,
  -- Para multipla/caixas/lista: array de strings com as opções.
  opcoes jsonb not null default '[]'::jsonb check (jsonb_typeof(opcoes) = 'array'),
  obrigatoria boolean not null default false,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create index perguntas_formulario_idx on public.perguntas (formulario_id, ordem);

-- ---------------------------------------------------------------------
-- Inscrições
-- ---------------------------------------------------------------------
create table public.inscricoes (
  id uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references public.formularios (id) on delete restrict,
  edicao_id uuid not null references public.edicoes (id) on delete restrict,
  -- Campos fixos
  nome text not null check (length(trim(nome)) >= 3),
  nascimento date not null,
  idade int not null,
  telefone text not null check (telefone ~ '^\d{10,11}$'),
  sexo public.sexo not null,
  ja_trabalhou boolean not null,
  equipe_anterior text,
  ano_anterior int,
  cidade text not null check (length(trim(cidade)) > 0),
  -- Perguntas personalizadas: { "<pergunta_id>": valor }
  respostas jsonb not null default '{}'::jsonb check (jsonb_typeof(respostas) = 'object'),
  -- LGPD
  consentimento boolean not null check (consentimento),
  consentimento_em timestamptz not null default now(),
  resp_nome text,
  resp_telefone text,
  resp_consentimento boolean,
  -- Seleção
  status public.status_inscricao not null default 'pendente',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (formulario_id, telefone),
  check (not ja_trabalhou or (equipe_anterior is not null and ano_anterior is not null))
);

create index inscricoes_edicao_idx on public.inscricoes (edicao_id, sexo, status);
create index inscricoes_formulario_idx on public.inscricoes (formulario_id);

create trigger inscricoes_atualizado_em
  before update on public.inscricoes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Situação de um formulário: aberto | fechado | agendado | encerrado | esgotado
-- SECURITY DEFINER: precisa contar inscrições, que o público não lê.
-- ---------------------------------------------------------------------
create or replace function public.situacao_formulario(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when f.id is null then null
    when not f.aberto then 'fechado'
    when f.abre_em is not null and now() < f.abre_em then 'agendado'
    when f.fecha_em is not null and now() >= f.fecha_em then 'encerrado'
    when f.limite is not null
      and (select count(*) from public.inscricoes i where i.formulario_id = f.id) >= f.limite then 'esgotado'
    else 'aberto'
  end
  from public.formularios f
  where f.id = p_id
$$;

-- Dados públicos de um formulário (para a página /inscricao/[slug]).
create or replace function public.formulario_publico(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', f.id,
    'slug', f.slug,
    'titulo', f.titulo,
    'descricao', f.descricao,
    'capa_path', f.capa_path,
    'abre_em', f.abre_em,
    'fecha_em', f.fecha_em,
    'msg_confirmacao', f.msg_confirmacao,
    'texto_lgpd', coalesce(nullif(trim(f.texto_lgpd), ''), e.texto_lgpd),
    'situacao', public.situacao_formulario(f.id),
    'perguntas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'tipo', p.tipo, 'rotulo', p.rotulo, 'ajuda', p.ajuda,
        'opcoes', p.opcoes, 'obrigatoria', p.obrigatoria
      ) order by p.ordem, p.criado_em)
      from public.perguntas p where p.formulario_id = f.id
    ), '[]'::jsonb)
  )
  from public.formularios f
  join public.edicoes e on e.id = f.edicao_id
  where f.slug = lower(p_slug)
$$;

-- Prepara e valida uma inscrição antes de gravar. Vale para qualquer
-- origem (inclusive chamadas diretas à API com a chave pública).
create or replace function public.preparar_inscricao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.formularios;
  v_situacao text;
  p record;
  v_valor jsonb;
begin
  -- Trava o formulário: serializa inscrições simultâneas (limite de vagas).
  select * into f from public.formularios where id = new.formulario_id for update;
  if f.id is null then
    raise exception 'FORMULARIO_INEXISTENTE' using errcode = 'P0001';
  end if;

  v_situacao := public.situacao_formulario(f.id);
  if v_situacao <> 'aberto' and not public.is_staff() then
    raise exception 'FORMULARIO_%', upper(v_situacao) using errcode = 'P0001';
  end if;

  new.edicao_id := f.edicao_id;
  new.nome := regexp_replace(trim(new.nome), '\s+', ' ', 'g');
  new.cidade := regexp_replace(trim(new.cidade), '\s+', ' ', 'g');
  new.telefone := public.normalizar_telefone(new.telefone);
  new.idade := extract(year from age(public.hoje_belem(), new.nascimento))::int;
  new.consentimento_em := now();
  new.criado_em := now();

  if not public.is_staff() then
    new.status := 'pendente';
  end if;

  if new.idade < 5 or new.idade > 120 or new.nascimento > public.hoje_belem() then
    raise exception 'NASCIMENTO_INVALIDO' using errcode = 'P0001';
  end if;

  if not new.ja_trabalhou then
    new.equipe_anterior := null;
    new.ano_anterior := null;
  end if;

  -- Menor de idade: dados e consentimento do responsável.
  if new.idade < 18 then
    new.resp_telefone := public.normalizar_telefone(new.resp_telefone);
    if coalesce(trim(new.resp_nome), '') = ''
       or new.resp_telefone !~ '^\d{10,11}$'
       or not coalesce(new.resp_consentimento, false) then
      raise exception 'RESPONSAVEL_OBRIGATORIO' using errcode = 'P0001';
    end if;
  else
    new.resp_nome := null;
    new.resp_telefone := null;
    new.resp_consentimento := null;
  end if;

  -- Perguntas obrigatórias respondidas.
  for p in
    select id, rotulo from public.perguntas where formulario_id = f.id and obrigatoria
  loop
    v_valor := new.respostas -> p.id::text;
    if v_valor is null or v_valor = 'null'::jsonb or v_valor = '""'::jsonb or v_valor = '[]'::jsonb then
      raise exception 'PERGUNTA_OBRIGATORIA: %', p.rotulo using errcode = 'P0001';
    end if;
  end loop;

  return new;
end;
$$;

create trigger inscricoes_preparar
  before insert on public.inscricoes
  for each row execute function public.preparar_inscricao();

-- ---------------------------------------------------------------------
-- Avaliações dos coordenadores (nota 1–5 + comentário)
-- ---------------------------------------------------------------------
create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null references public.inscricoes (id) on delete cascade,
  coordenador_id uuid not null references public.profiles (id) on delete cascade,
  nota int not null check (nota between 1 and 5),
  comentario text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (inscricao_id, coordenador_id)
);

create trigger avaliacoes_atualizado_em
  before update on public.avaliacoes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Membros (base; a Fase 3 completa com funções, instrumentos etc.)
-- ---------------------------------------------------------------------
create table public.membros (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete restrict,
  inscricao_id uuid unique references public.inscricoes (id) on delete set null,
  nome text not null check (length(trim(nome)) > 0),
  sexo public.sexo not null,
  nascimento date,
  idade int check (idade is null or idade between 5 and 120),
  telefone text,
  cidade text,
  nivel public.nivel_membro,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index membros_edicao_idx on public.membros (edicao_id, ativo);

create trigger membros_atualizado_em
  before update on public.membros
  for each row execute function public.tocar_atualizado_em();

-- "Puxar para a equipe": cria membros a partir das inscrições
-- e marca as inscrições como selecionadas. Retorna quantos membros novos.
create or replace function public.puxar_para_equipe(p_ids uuid[])
returns int
language plpgsql
set search_path = ''
as $$
declare
  v_novos int;
begin
  if not public.is_staff() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  insert into public.membros (edicao_id, inscricao_id, nome, sexo, nascimento, idade, telefone, cidade)
  select i.edicao_id, i.id, i.nome, i.sexo, i.nascimento, i.idade, i.telefone, i.cidade
  from public.inscricoes i
  where i.id = any (p_ids)
  on conflict (inscricao_id) do nothing;
  get diagnostics v_novos = row_count;

  update public.inscricoes
  set status = 'selecionado'
  where id = any (p_ids) and status <> 'selecionado';

  return v_novos;
end;
$$;

-- ---------------------------------------------------------------------
-- Rate limit (anti-spam do formulário público). Usado só pelo servidor.
-- ---------------------------------------------------------------------
create table public.rate_limits (
  chave text not null,
  janela_inicio timestamptz not null,
  contagem int not null default 0,
  primary key (chave, janela_inicio)
);

create or replace function public.consumir_rate_limit(p_chave text, p_limite int, p_janela_segundos int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_janela timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_janela_segundos) * p_janela_segundos);
  v_contagem int;
begin
  insert into public.rate_limits (chave, janela_inicio, contagem)
  values (p_chave, v_janela, 1)
  on conflict (chave, janela_inicio) do update set contagem = public.rate_limits.contagem + 1
  returning contagem into v_contagem;

  -- Limpeza ocasional de janelas antigas.
  if random() < 0.02 then
    delete from public.rate_limits where janela_inicio < now() - interval '1 day';
  end if;

  return v_contagem <= p_limite;
end;
$$;

-- ---------------------------------------------------------------------
-- Logs
-- ---------------------------------------------------------------------
create trigger formularios_log
  after insert or update or delete on public.formularios
  for each row execute function public.log_alteracao(
    'titulo', 'titulo', 'slug', 'aberto', 'abre_em', 'fecha_em', 'limite');

create trigger inscricoes_log
  after update or delete on public.inscricoes
  for each row execute function public.log_alteracao('nome', 'status');

create trigger membros_log
  after insert or update or delete on public.membros
  for each row execute function public.log_alteracao('nome', 'nome', 'ativo');

-- ---------------------------------------------------------------------
-- Storage: capas dos formulários (leitura pública, escrita do staff)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capas', 'capas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "capas: staff envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'capas' and (select public.is_staff()));

create policy "capas: staff altera"
  on storage.objects for update to authenticated
  using (bucket_id = 'capas' and (select public.is_staff()));

create policy "capas: staff exclui"
  on storage.objects for delete to authenticated
  using (bucket_id = 'capas' and (select public.is_staff()));

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.formularios enable row level security;
alter table public.perguntas enable row level security;
alter table public.inscricoes enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.membros enable row level security;
alter table public.rate_limits enable row level security;

-- O público não lê nada; só pode inserir inscrições (policy abaixo).
revoke all on public.formularios, public.perguntas, public.avaliacoes,
  public.membros, public.rate_limits from anon;
revoke all on public.inscricoes from anon;
grant insert on public.inscricoes to anon;
-- rate_limits: só a service role.
revoke all on public.rate_limits from authenticated;

-- formularios / perguntas / membros: staff faz tudo.
create policy "formularios: staff" on public.formularios for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "perguntas: staff" on public.perguntas for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "membros: staff" on public.membros for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- inscricoes: público só insere em formulário aberto, sempre como pendente.
create policy "inscricoes: público insere em formulário aberto"
  on public.inscricoes for insert to anon
  with check (status = 'pendente' and public.situacao_formulario(formulario_id) = 'aberto');

create policy "inscricoes: staff" on public.inscricoes for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- avaliacoes: staff lê todas; cada coordenador mexe só na própria.
create policy "avaliacoes: staff lê" on public.avaliacoes for select to authenticated
  using ((select public.is_staff()));

create policy "avaliacoes: insere a própria" on public.avaliacoes for insert to authenticated
  with check ((select public.is_staff()) and coordenador_id = (select auth.uid()));

create policy "avaliacoes: altera a própria" on public.avaliacoes for update to authenticated
  using ((select public.is_staff()) and coordenador_id = (select auth.uid()))
  with check (coordenador_id = (select auth.uid()));

create policy "avaliacoes: exclui a própria" on public.avaliacoes for delete to authenticated
  using ((select public.is_staff()) and coordenador_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------
revoke execute on function public.situacao_formulario(uuid) from public;
grant execute on function public.situacao_formulario(uuid) to anon, authenticated;

revoke execute on function public.formulario_publico(text) from public;
grant execute on function public.formulario_publico(text) to anon, authenticated;

revoke execute on function public.puxar_para_equipe(uuid[]) from public, anon;
grant execute on function public.puxar_para_equipe(uuid[]) to authenticated;

revoke execute on function public.consumir_rate_limit(text, int, int) from public, anon, authenticated;
