-- =====================================================================
-- Bandinha EJC Marabá — Fase 1: base, perfis, edições e log de atividades
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel_usuario as enum ('edg', 'coordenador', 'membro');

-- ---------------------------------------------------------------------
-- Função utilitária: mantém atualizado_em em dia
-- ---------------------------------------------------------------------
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  usuario text unique check (usuario is null or usuario ~ '^[a-z0-9._-]{3,30}$'),
  email text,
  telefone text,
  papel public.papel_usuario not null default 'coordenador',
  ativo boolean not null default true,
  precisa_trocar_senha boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.profiles is 'Usuários do sistema. Papel membro ainda não tem acesso.';

create trigger profiles_atualizado_em
  before update on public.profiles
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Funções de permissão (usadas nas policies)
-- SECURITY DEFINER para poder ler profiles sem recursão de RLS.
-- ---------------------------------------------------------------------
create or replace function public.papel_atual()
returns public.papel_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.papel
  from public.profiles p
  where p.id = auth.uid() and p.ativo
$$;

create or replace function public.is_edg()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.papel_atual() = 'edg', false)
$$;

-- "Staff" = quem opera o sistema hoje: EDG e coordenadores ativos.
-- O papel 'membro' fica de fora de propósito (sem acesso por enquanto).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.papel_atual() in ('edg', 'coordenador'), false)
$$;

-- Impede que o sistema fique sem nenhum EDG ativo.
create or replace function public.garantir_um_edg()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  restantes int;
begin
  if old.papel = 'edg' and old.ativo
     and (tg_op = 'DELETE' or new.papel <> 'edg' or not new.ativo) then
    select count(*) into restantes
    from public.profiles
    where papel = 'edg' and ativo and id <> old.id;
    if restantes = 0 then
      raise exception 'É preciso manter pelo menos um EDG ativo.'
        using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger profiles_garantir_um_edg
  before update or delete on public.profiles
  for each row execute function public.garantir_um_edg();

-- ---------------------------------------------------------------------
-- Edições (ex.: "EJC 2027")
-- ---------------------------------------------------------------------
create table public.edicoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  ano int check (ano between 2000 and 2100),
  ativa boolean not null default false,
  vagas_masculino int not null default 0 check (vagas_masculino >= 0),
  vagas_feminino int not null default 0 check (vagas_feminino >= 0),
  limite_faltas int not null default 3 check (limite_faltas >= 0),
  texto_lgpd text not null default
    'Autorizo a equipe da Bandinha do EJC Marabá a usar os dados informados neste formulário '
    'exclusivamente para o processo de seleção e organização da equipe, conforme a Lei Geral de '
    'Proteção de Dados (Lei nº 13.709/2018). Os dados não serão compartilhados com terceiros e '
    'poderão ser excluídos a qualquer momento mediante solicitação.',
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- No máximo uma edição ativa por vez.
create unique index edicoes_uma_ativa on public.edicoes ((true)) where ativa;

create trigger edicoes_atualizado_em
  before update on public.edicoes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Log de atividades
-- ---------------------------------------------------------------------
create table public.logs (
  id bigint generated always as identity primary key,
  ator_id uuid references public.profiles (id) on delete set null,
  ator_nome text,
  acao text not null,
  entidade text not null,
  entidade_id text,
  descricao text,
  dados jsonb,
  criado_em timestamptz not null default now()
);

create index logs_criado_em_idx on public.logs (criado_em desc);
create index logs_entidade_idx on public.logs (entidade, entidade_id);

-- Registro manual de log pelo usuário logado (staff).
create or replace function public.registrar_log(
  p_acao text,
  p_entidade text,
  p_entidade_id text default null,
  p_descricao text default null,
  p_dados jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  insert into public.logs (ator_id, ator_nome, acao, entidade, entidade_id, descricao, dados)
  select auth.uid(), p.nome, p_acao, p_entidade, p_entidade_id, p_descricao, p_dados
  from public.profiles p where p.id = auth.uid();
end;
$$;

-- Trigger genérico de log.
--   TG_ARGV[0]  = coluna usada como rótulo (ex.: 'nome')
--   TG_ARGV[1…] = colunas cujas alterações devem ser registradas
-- Em UPDATE, só registra se alguma coluna monitorada mudou.
-- Em DELETE, guarda só o rótulo (sem dados pessoais — LGPD).
-- Alterações feitas pela service role (auth.uid() nulo) são registradas
-- explicitamente no código do servidor.
create or replace function public.log_alteracao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_rotulo_col text := tg_argv[0];
  v_mudancas jsonb := '{}'::jsonb;
  v_col text;
  v_acao text;
  i int;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    for i in 1 .. coalesce(tg_nargs - 1, 0) loop
      v_col := tg_argv[i];
      if (v_old -> v_col) is distinct from (v_new -> v_col) then
        v_mudancas := v_mudancas || jsonb_build_object(
          v_col, jsonb_build_object('de', v_old -> v_col, 'para', v_new -> v_col));
      end if;
    end loop;
    if v_mudancas = '{}'::jsonb then
      return new;
    end if;
  end if;

  v_acao := case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'alterou' else 'excluiu' end;

  insert into public.logs (ator_id, ator_nome, acao, entidade, entidade_id, descricao, dados)
  select auth.uid(), p.nome, v_acao, tg_table_name, v_row ->> 'id', v_row ->> v_rotulo_col,
         case when tg_op = 'UPDATE' then v_mudancas end
  from public.profiles p where p.id = auth.uid();

  return coalesce(new, old);
end;
$$;

create trigger edicoes_log
  after insert or update or delete on public.edicoes
  for each row execute function public.log_alteracao(
    'nome', 'nome', 'ano', 'ativa', 'vagas_masculino', 'vagas_feminino', 'limite_faltas', 'texto_lgpd');

-- ---------------------------------------------------------------------
-- Operações de edição
-- ---------------------------------------------------------------------
create or replace function public.ativar_edicao(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_edg() then
    raise exception 'Apenas o EDG pode ativar edições.' using errcode = '42501';
  end if;
  update public.edicoes set ativa = false where ativa and id <> p_id;
  update public.edicoes set ativa = true where id = p_id;
end;
$$;

-- Duplica uma edição: copia as configurações. As fases seguintes
-- redefinem esta função para copiar também equipamentos, etc.
create or replace function public.duplicar_edicao(p_origem uuid, p_nome text, p_ano int)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_nova uuid;
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

  return v_nova;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.edicoes enable row level security;
alter table public.logs enable row level security;

-- O público (anon) não acessa nada destas tabelas.
revoke all on public.profiles, public.edicoes, public.logs from anon;
-- Logs só são gravados por funções/trigger; ninguém escreve diretamente.
revoke insert, update, delete on public.logs from authenticated;

-- profiles: cada um lê o próprio perfil; staff lê todos; só EDG escreve.
create policy "profiles: ler o próprio"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: staff lê todos"
  on public.profiles for select to authenticated
  using ((select public.is_staff()));

create policy "profiles: EDG insere"
  on public.profiles for insert to authenticated
  with check ((select public.is_edg()));

create policy "profiles: EDG altera"
  on public.profiles for update to authenticated
  using ((select public.is_edg()))
  with check ((select public.is_edg()));

create policy "profiles: EDG exclui"
  on public.profiles for delete to authenticated
  using ((select public.is_edg()));

-- edicoes: staff lê; só EDG escreve.
create policy "edicoes: staff lê"
  on public.edicoes for select to authenticated
  using ((select public.is_staff()));

create policy "edicoes: EDG insere"
  on public.edicoes for insert to authenticated
  with check ((select public.is_edg()));

create policy "edicoes: EDG altera"
  on public.edicoes for update to authenticated
  using ((select public.is_edg()))
  with check ((select public.is_edg()));

create policy "edicoes: EDG exclui"
  on public.edicoes for delete to authenticated
  using ((select public.is_edg()));

-- logs: só EDG lê.
create policy "logs: EDG lê"
  on public.logs for select to authenticated
  using ((select public.is_edg()));

-- ---------------------------------------------------------------------
-- Permissões de execução das funções
-- ---------------------------------------------------------------------
revoke execute on function public.registrar_log(text, text, text, text, jsonb) from public, anon;
revoke execute on function public.ativar_edicao(uuid) from public, anon;
revoke execute on function public.duplicar_edicao(uuid, text, int) from public, anon;
grant execute on function public.registrar_log(text, text, text, text, jsonb) to authenticated;
grant execute on function public.ativar_edicao(uuid) to authenticated;
grant execute on function public.duplicar_edicao(uuid, text, int) to authenticated;
