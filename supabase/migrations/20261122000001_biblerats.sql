-- =====================================================================
-- BibleRats — o sistema deixa de ser a gestão da Bandinha e vira um app
-- de desafios de leitura bíblica em grupo (estilo "GymRats").
--
-- 1) Remove tudo o que era da Bandinha (inscrições, seleção, membros,
--    agenda, presença, repertório, equipamentos, avisos, edições).
-- 2) Perfis passam a ter papel admin | usuario e são criados no cadastro.
-- 3) Cria livros da Bíblia, grupos (desafios), check-ins de leitura,
--    reações, comentários e o placar (1 ponto por dia com leitura).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Remove a Bandinha
-- ---------------------------------------------------------------------
drop view if exists public.resumo_presenca;

drop table if exists
  public.aviso_envios, public.avisos, public.checklist_itens, public.emprestimos, public.equipamentos,
  public.setlist_itens, public.setlists, public.musica_interpretes, public.musicas,
  public.presencas, public.escalas, public.eventos, public.membro_funcoes, public.funcoes, public.membros,
  public.avaliacoes, public.inscricoes, public.perguntas, public.formularios, public.rate_limits, public.edicoes
  cascade;

drop function if exists public.situacao_formulario(uuid);
drop function if exists public.formulario_publico(text);
drop function if exists public.preparar_inscricao();
drop function if exists public.puxar_para_equipe(uuid[]);
drop function if exists public.consumir_rate_limit(text, int, int);
drop function if exists public.ativar_edicao(uuid);
drop function if exists public.duplicar_edicao(uuid, text, int);
drop function if exists public.arquivos_orfaos_inscricao();
drop function if exists public.normalizar_telefone(text);

-- As funções de permissão antigas são removidas junto com as policies que
-- dependiam delas (perfis, logs e os buckets da Bandinha).
drop function if exists public.is_staff() cascade;
drop function if exists public.is_edg() cascade;
drop function if exists public.papel_atual() cascade;

drop type if exists public.tipo_pergunta, public.status_inscricao, public.sexo, public.nivel_membro,
  public.tipo_funcao, public.tipo_evento, public.status_presenca, public.dono_equipamento,
  public.estado_equipamento;

-- ---------------------------------------------------------------------
-- 2) Perfis: admin | usuario
-- ---------------------------------------------------------------------
create type public.papel_app as enum ('admin', 'usuario');

alter table public.profiles alter column papel drop default;
alter table public.profiles
  alter column papel type public.papel_app
  using (case when papel::text = 'edg' then 'admin' else 'usuario' end)::public.papel_app;
alter table public.profiles alter column papel set default 'usuario';
alter table public.profiles alter column precisa_trocar_senha set default false;
drop type public.papel_usuario;

comment on table public.profiles is 'Usuários do BibleRats. Criados automaticamente no cadastro.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and ativo and papel = 'admin')
$$;

create or replace function public.usuario_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and ativo)
$$;

-- Sempre pelo menos um administrador ativo.
create or replace function public.garantir_um_edg()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.papel = 'admin' and old.ativo
     and (tg_op = 'DELETE' or new.papel <> 'admin' or not new.ativo)
     and not exists (select 1 from public.profiles where papel = 'admin' and ativo and id <> old.id) then
    raise exception 'É preciso manter pelo menos um administrador ativo.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

-- Usuário comum só pode mudar o próprio nome/telefone (não papel, ativo etc.).
create or replace function public.proteger_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and (new.papel is distinct from old.papel or new.ativo is distinct from old.ativo
          or new.precisa_trocar_senha is distinct from old.precisa_trocar_senha
          or new.email is distinct from old.email or new.id is distinct from old.id) then
    raise exception 'Sem permissão para alterar estes dados.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_proteger
  before update on public.profiles
  for each row execute function public.proteger_perfil();

-- Cadastro: cria o perfil automaticamente (sempre como usuário comum).
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, email, papel, precisa_trocar_senha)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)), 80),
    lower(new.email),
    'usuario',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- registrar_log / uso_armazenamento com as novas permissões
create or replace function public.registrar_log(
  p_acao text, p_entidade text, p_entidade_id text default null, p_descricao text default null, p_dados jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.usuario_ativo() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  insert into public.logs (ator_id, ator_nome, acao, entidade, entidade_id, descricao, dados)
  select auth.uid(), p.nome, p_acao, p_entidade, p_entidade_id, p_descricao, p_dados
  from public.profiles p where p.id = auth.uid();
end;
$$;

create or replace function public.uso_armazenamento()
returns table (bucket text, arquivos bigint, bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, count(*), coalesce(sum((o.metadata ->> 'size')::bigint), 0)
  from storage.objects o
  where public.is_admin()
  group by o.bucket_id
  order by 3 desc
$$;

-- ---------------------------------------------------------------------
-- 3) Livros da Bíblia (66, cânon protestante, nomes da Almeida)
-- ---------------------------------------------------------------------
create table public.livros_biblia (
  id text primary key check (id ~ '^[0-9a-z]{2,4}$'),
  nome text not null,
  abrev text not null,
  testamento text not null check (testamento in ('AT', 'NT')),
  capitulos int not null check (capitulos > 0),
  ordem int not null unique
);

insert into public.livros_biblia (ordem, id, nome, abrev, testamento, capitulos) values
  (1,'gn','Gênesis','Gn','AT',50),(2,'ex','Êxodo','Êx','AT',40),(3,'lv','Levítico','Lv','AT',27),
  (4,'nm','Números','Nm','AT',36),(5,'dt','Deuteronômio','Dt','AT',34),(6,'js','Josué','Js','AT',24),
  (7,'jz','Juízes','Jz','AT',21),(8,'rt','Rute','Rt','AT',4),(9,'1sm','1 Samuel','1Sm','AT',31),
  (10,'2sm','2 Samuel','2Sm','AT',24),(11,'1rs','1 Reis','1Rs','AT',22),(12,'2rs','2 Reis','2Rs','AT',25),
  (13,'1cr','1 Crônicas','1Cr','AT',29),(14,'2cr','2 Crônicas','2Cr','AT',36),(15,'ed','Esdras','Ed','AT',10),
  (16,'ne','Neemias','Ne','AT',13),(17,'et','Ester','Et','AT',10),(18,'job','Jó','Jó','AT',42),
  (19,'sl','Salmos','Sl','AT',150),(20,'pv','Provérbios','Pv','AT',31),(21,'ec','Eclesiastes','Ec','AT',12),
  (22,'ct','Cânticos','Ct','AT',8),(23,'is','Isaías','Is','AT',66),(24,'jr','Jeremias','Jr','AT',52),
  (25,'lm','Lamentações','Lm','AT',5),(26,'ez','Ezequiel','Ez','AT',48),(27,'dn','Daniel','Dn','AT',12),
  (28,'os','Oseias','Os','AT',14),(29,'jl','Joel','Jl','AT',3),(30,'am','Amós','Am','AT',9),
  (31,'ob','Obadias','Ob','AT',1),(32,'jn','Jonas','Jn','AT',4),(33,'mq','Miqueias','Mq','AT',7),
  (34,'na','Naum','Na','AT',3),(35,'hc','Habacuque','Hc','AT',3),(36,'sf','Sofonias','Sf','AT',3),
  (37,'ag','Ageu','Ag','AT',2),(38,'zc','Zacarias','Zc','AT',14),(39,'ml','Malaquias','Ml','AT',4),
  (40,'mt','Mateus','Mt','NT',28),(41,'mc','Marcos','Mc','NT',16),(42,'lc','Lucas','Lc','NT',24),
  (43,'jo','João','Jo','NT',21),(44,'at','Atos','At','NT',28),(45,'rm','Romanos','Rm','NT',16),
  (46,'1co','1 Coríntios','1Co','NT',16),(47,'2co','2 Coríntios','2Co','NT',13),(48,'gl','Gálatas','Gl','NT',6),
  (49,'ef','Efésios','Ef','NT',6),(50,'fp','Filipenses','Fp','NT',4),(51,'cl','Colossenses','Cl','NT',4),
  (52,'1ts','1 Tessalonicenses','1Ts','NT',5),(53,'2ts','2 Tessalonicenses','2Ts','NT',3),
  (54,'1tm','1 Timóteo','1Tm','NT',6),(55,'2tm','2 Timóteo','2Tm','NT',4),(56,'tt','Tito','Tt','NT',3),
  (57,'fm','Filemom','Fm','NT',1),(58,'hb','Hebreus','Hb','NT',13),(59,'tg','Tiago','Tg','NT',5),
  (60,'1pe','1 Pedro','1Pe','NT',5),(61,'2pe','2 Pedro','2Pe','NT',3),(62,'1jo','1 João','1Jo','NT',5),
  (63,'2jo','2 João','2Jo','NT',1),(64,'3jo','3 João','3Jo','NT',1),(65,'jd','Judas','Jd','NT',1),
  (66,'ap','Apocalipse','Ap','NT',22);

-- ---------------------------------------------------------------------
-- Grupos (desafios)
-- ---------------------------------------------------------------------
create type public.papel_grupo as enum ('dono', 'admin', 'membro');

create or replace function public.gerar_codigo_convite()
returns text
language sql
volatile
set search_path = ''
as $$
  -- 8 caracteres sem os ambíguos (0/O, 1/I/L)
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 8)
$$;

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 2 and 80),
  descricao text check (length(descricao) <= 1000),
  codigo text not null unique default public.gerar_codigo_convite() check (codigo ~ '^[A-Z0-9]{6,12}$'),
  inicio date not null default public.hoje_belem(),
  fim date,
  criado_por uuid references public.profiles (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim is null or fim >= inicio)
);

create trigger grupos_atualizado_em
  before update on public.grupos
  for each row execute function public.tocar_atualizado_em();

create table public.grupo_membros (
  grupo_id uuid not null references public.grupos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  papel public.papel_grupo not null default 'membro',
  entrou_em timestamptz not null default now(),
  primary key (grupo_id, user_id)
);

create index grupo_membros_user_idx on public.grupo_membros (user_id);

-- Funções auxiliares de permissão (SECURITY DEFINER evita recursão de RLS).
create or replace function public.papel_no_grupo(p_grupo uuid)
returns public.papel_grupo
language sql
stable
security definer
set search_path = ''
as $$
  select papel from public.grupo_membros where grupo_id = p_grupo and user_id = auth.uid()
$$;

create or replace function public.e_membro(p_grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.grupo_membros where grupo_id = p_grupo and user_id = auth.uid())
$$;

-- O usuário logado e "outro" estão em algum grupo em comum?
create or replace function public.compartilha_grupo(p_outro uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grupo_membros a
    join public.grupo_membros b on b.grupo_id = a.grupo_id
    where a.user_id = auth.uid() and b.user_id = p_outro
  )
$$;

-- Quem cria o grupo vira o dono automaticamente.
create or replace function public.grupo_criado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.criado_por is not null then
    insert into public.grupo_membros (grupo_id, user_id, papel)
    values (new.id, new.criado_por, 'dono')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger grupos_dono
  after insert on public.grupos
  for each row execute function public.grupo_criado();

create trigger grupos_log
  after insert or update or delete on public.grupos
  for each row execute function public.log_alteracao('nome', 'nome', 'inicio', 'fim');

-- Prévia pública de um convite (nome, período e quantos participam).
create or replace function public.grupo_por_codigo(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id, 'nome', g.nome, 'descricao', g.descricao, 'inicio', g.inicio, 'fim', g.fim,
    'membros', (select count(*) from public.grupo_membros m where m.grupo_id = g.id),
    'encerrado', g.fim is not null and g.fim < public.hoje_belem(),
    'ja_participa', exists (select 1 from public.grupo_membros m where m.grupo_id = g.id and m.user_id = auth.uid())
  )
  from public.grupos g
  where g.codigo = upper(trim(p_codigo))
$$;

-- Entrar num grupo pelo código de convite.
create or replace function public.entrar_no_grupo(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupos;
begin
  if not public.usuario_ativo() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select * into g from public.grupos where codigo = upper(trim(p_codigo));
  if g.id is null then
    raise exception 'CODIGO_INVALIDO' using errcode = 'P0001';
  end if;
  if g.fim is not null and g.fim < public.hoje_belem() then
    raise exception 'DESAFIO_ENCERRADO' using errcode = 'P0001';
  end if;
  insert into public.grupo_membros (grupo_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return g.id;
end;
$$;

-- ---------------------------------------------------------------------
-- Check-ins de leitura
-- ---------------------------------------------------------------------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  data date not null default public.hoje_belem(),
  livro text not null references public.livros_biblia (id),
  capitulo_inicio int not null check (capitulo_inicio > 0),
  capitulo_fim int not null,
  minutos int check (minutos is null or minutos between 1 and 600),
  versiculo text check (versiculo is null or length(versiculo) <= 500),
  anotacao text check (anotacao is null or length(anotacao) <= 3000),
  foto_path text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (capitulo_fim >= capitulo_inicio)
);

create index checkins_user_data_idx on public.checkins (user_id, data desc);
create index checkins_data_idx on public.checkins (data desc, criado_em desc);

create trigger checkins_atualizado_em
  before update on public.checkins
  for each row execute function public.tocar_atualizado_em();

-- Valida capítulos do livro, data (não futura; até 3 dias atrás) e a foto.
create or replace function public.validar_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caps int;
begin
  select capitulos into v_caps from public.livros_biblia where id = new.livro;
  if v_caps is null then
    raise exception 'LIVRO_INVALIDO' using errcode = 'P0001';
  end if;
  if new.capitulo_fim > v_caps then
    raise exception 'CAPITULO_INVALIDO' using errcode = 'P0001';
  end if;
  if new.data > public.hoje_belem() then
    raise exception 'DATA_FUTURA' using errcode = 'P0001';
  end if;
  if (tg_op = 'INSERT' or new.data is distinct from old.data) and new.data < public.hoje_belem() - 3 then
    raise exception 'DATA_ANTIGA' using errcode = 'P0001';
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

-- Reações e comentários
create table public.reacoes (
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('🙏', '🔥', '❤️', '📖', '🙌')),
  criado_em timestamptz not null default now(),
  primary key (checkin_id, user_id, emoji)
);

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  texto text not null check (length(trim(texto)) between 1 and 1000),
  criado_em timestamptz not null default now()
);

create index comentarios_checkin_idx on public.comentarios (checkin_id, criado_em);

-- ---------------------------------------------------------------------
-- Placar e estatísticas (respeitam o RLS de quem consulta)
-- ---------------------------------------------------------------------

-- Sequência atual de dias seguidos com leitura (conta se leu hoje ou ontem).
create or replace function public.sequencia_atual(p_user uuid)
returns int
language sql
stable
set search_path = ''
as $$
  with dias as (
    select distinct data from public.checkins where user_id = p_user and data <= public.hoje_belem()
  ), ilhas as (
    select data - (row_number() over (order by data))::int as grupo, data from dias
  ), blocos as (
    select max(data) as fim, count(*)::int as n from ilhas group by grupo
  )
  select coalesce((select n from blocos where fim >= public.hoje_belem() - 1 order by fim desc limit 1), 0)
$$;

-- Placar de um grupo: 1 ponto por dia com check-in dentro do período do desafio.
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
  ), dias as (
    select distinct c.user_id, c.data
    from public.checkins c join m on m.user_id = c.user_id, g
    where c.data between g.inicio and g.ate
  ), pts as (
    select d.user_id, count(*)::int as pontos, max(d.data) as ultimo from dias d group by d.user_id
  )
  select m.user_id, m.nome, m.papel, coalesce(pts.pontos, 0), public.sequencia_atual(m.user_id), pts.ultimo
  from m left join pts on pts.user_id = m.user_id
  order by coalesce(pts.pontos, 0) desc, public.sequencia_atual(m.user_id) desc, m.nome
$$;

-- Estatísticas do perfil.
create or replace function public.estatisticas_usuario(p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with c as (select * from public.checkins where user_id = p_user),
  dias as (select distinct data from c),
  ilhas as (select data - (row_number() over (order by data))::int as grupo from dias),
  blocos as (select count(*)::int as n from ilhas group by grupo),
  caps as (
    select distinct c.livro, generate_series(c.capitulo_inicio, c.capitulo_fim) as cap from c
  ),
  por_livro as (
    select l.id, l.capitulos, count(caps.cap)::int as lidos
    from public.livros_biblia l left join caps on caps.livro = l.id
    group by l.id, l.capitulos
  )
  select jsonb_build_object(
    'dias', (select count(*) from dias),
    'checkins', (select count(*) from c),
    'capitulos', (select coalesce(sum(capitulo_fim - capitulo_inicio + 1), 0) from c),
    'minutos', (select coalesce(sum(minutos), 0) from c),
    'sequencia', public.sequencia_atual(p_user),
    'recorde', (select coalesce(max(n), 0) from blocos),
    'capitulos_distintos', (select count(*) from caps),
    'livros_concluidos', (select count(*) from por_livro where lidos = capitulos),
    'por_livro', (select jsonb_object_agg(id, lidos) from por_livro where lidos > 0)
  )
$$;

-- ---------------------------------------------------------------------
-- Storage: fotos dos check-ins (privado; pasta = id do usuário)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('checkins', 'checkins', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "checkins: envia na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'checkins' and (storage.foldername(name))[1] = (select auth.uid())::text
              and (select public.usuario_ativo()));
create policy "checkins: vê as próprias e dos colegas" on storage.objects for select to authenticated
  using (bucket_id = 'checkins' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.compartilha_grupo(((storage.foldername(name))[1])::uuid)
    or (select public.is_admin())));
create policy "checkins: apaga as próprias" on storage.objects for delete to authenticated
  using (bucket_id = 'checkins' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.livros_biblia enable row level security;
alter table public.grupos enable row level security;
alter table public.grupo_membros enable row level security;
alter table public.checkins enable row level security;
alter table public.reacoes enable row level security;
alter table public.comentarios enable row level security;

revoke all on public.grupos, public.grupo_membros, public.checkins, public.reacoes, public.comentarios from anon;
revoke insert, update, delete on public.livros_biblia from anon, authenticated;
-- Entrada em grupos só pelo código (função entrar_no_grupo) ou ao criar.
revoke insert on public.grupo_membros from authenticated;

-- livros: leitura pública
create policy "livros: todos leem" on public.livros_biblia for select to anon, authenticated using (true);

-- profiles
create policy "profiles: vê o próprio, colegas de grupo e admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.compartilha_grupo(id) or (select public.is_admin()));
create policy "profiles: altera o próprio ou admin" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: admin exclui" on public.profiles for delete to authenticated
  using ((select public.is_admin()));

-- logs
create policy "logs: admin lê" on public.logs for select to authenticated using ((select public.is_admin()));

-- grupos
-- (criado_por também vê: o "returning" do insert é checado antes do gatilho
--  que torna quem criou membro/dono do grupo)
create policy "grupos: membros e admin veem" on public.grupos for select to authenticated
  using (public.e_membro(id) or criado_por = (select auth.uid()) or (select public.is_admin()));
create policy "grupos: usuário ativo cria" on public.grupos for insert to authenticated
  with check ((select public.usuario_ativo()) and criado_por = (select auth.uid()));
create policy "grupos: dono/admin do grupo altera" on public.grupos for update to authenticated
  using (public.papel_no_grupo(id) in ('dono', 'admin'))
  with check (public.papel_no_grupo(id) in ('dono', 'admin'));
create policy "grupos: dono exclui" on public.grupos for delete to authenticated
  using (public.papel_no_grupo(id) = 'dono' or (select public.is_admin()));

-- grupo_membros
create policy "membros: quem é do grupo vê" on public.grupo_membros for select to authenticated
  using (public.e_membro(grupo_id) or (select public.is_admin()));
create policy "membros: sair ou ser removido" on public.grupo_membros for delete to authenticated
  using (
    (user_id = (select auth.uid()) and papel <> 'dono')
    or (public.papel_no_grupo(grupo_id) in ('dono', 'admin') and papel <> 'dono')
  );
create policy "membros: dono muda papel" on public.grupo_membros for update to authenticated
  using (public.papel_no_grupo(grupo_id) = 'dono' and papel <> 'dono')
  with check (papel <> 'dono');

-- checkins
create policy "checkins: vê os próprios e dos colegas" on public.checkins for select to authenticated
  using (user_id = (select auth.uid()) or public.compartilha_grupo(user_id) or (select public.is_admin()));
create policy "checkins: cria os próprios" on public.checkins for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.usuario_ativo()));
create policy "checkins: altera os próprios" on public.checkins for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "checkins: apaga os próprios" on public.checkins for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- reações (só em check-ins que a pessoa pode ver)
create policy "reacoes: vê" on public.reacoes for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id));
create policy "reacoes: reage" on public.reacoes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.usuario_ativo())
              and exists (select 1 from public.checkins c where c.id = checkin_id));
create policy "reacoes: desfaz a própria" on public.reacoes for delete to authenticated
  using (user_id = (select auth.uid()));

-- comentários
create policy "comentarios: vê" on public.comentarios for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id));
create policy "comentarios: comenta" on public.comentarios for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.usuario_ativo())
              and exists (select 1 from public.checkins c where c.id = checkin_id));
create policy "comentarios: apaga o próprio ou o dono do check-in" on public.comentarios for delete to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------
revoke execute on function public.entrar_no_grupo(text) from public, anon;
grant execute on function public.entrar_no_grupo(text) to authenticated;
grant execute on function public.grupo_por_codigo(text) to anon, authenticated;
grant execute on function public.placar_grupo(uuid), public.estatisticas_usuario(uuid), public.sequencia_atual(uuid)
  to authenticated;
revoke execute on function public.placar_grupo(uuid), public.estatisticas_usuario(uuid), public.sequencia_atual(uuid)
  from anon;
revoke execute on function public.uso_armazenamento() from public, anon;
grant execute on function public.uso_armazenamento() to authenticated;
