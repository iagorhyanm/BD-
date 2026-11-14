-- Testes de RLS da Fase 1. Rodar com: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Usuários de teste
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'edg@teste.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'coord@teste.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'inativo@teste.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'membro@teste.local');

insert into public.profiles (id, nome, papel, ativo, precisa_trocar_senha) values
  ('00000000-0000-0000-0000-0000000000e1', 'EDG Teste', 'edg', true, false),
  ('00000000-0000-0000-0000-0000000000c1', 'Coord Teste', 'coordenador', true, false),
  ('00000000-0000-0000-0000-0000000000c2', 'Coord Inativo', 'coordenador', false, false),
  ('00000000-0000-0000-0000-0000000000a1', 'Membro Teste', 'membro', true, false);

-- Isola o teste de dados já existentes: só o EDG de teste fica ativo
-- (tudo é desfeito no rollback ao final).
update public.profiles set ativo = false
where papel = 'edg' and id <> '00000000-0000-0000-0000-0000000000e1';

insert into public.edicoes (id, nome, ano) values
  ('00000000-0000-0000-0000-00000000ed01', 'EJC 2026', 2026);

-- ---------------- anon ----------------
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon não lê profiles');
select throws_ok($$ select * from public.edicoes $$, '42501', null, 'anon não lê edicoes');
select throws_ok($$ select * from public.logs $$, '42501', null, 'anon não lê logs');
reset role;

-- ---------------- coordenador ----------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

select is((select count(*)::int from public.profiles where id::text like '00000000-0000-0000-0000-0000000000%'), 4,
  'coordenador lê todos os perfis');
select is((select count(*)::int from public.edicoes where id = '00000000-0000-0000-0000-00000000ed01'), 1,
  'coordenador lê edições');
select is((select count(*)::int from public.logs), 0, 'coordenador não lê logs');

update public.profiles set papel = 'edg' where id = '00000000-0000-0000-0000-0000000000c1';
select is((select papel::text from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
  'coordenador', 'coordenador não se promove a EDG');

select throws_ok($$ insert into public.edicoes (nome) values ('Hack') $$, '42501', null,
  'coordenador não cria edição');
select throws_ok($$ select public.ativar_edicao('00000000-0000-0000-0000-00000000ed01') $$, '42501', null,
  'coordenador não ativa edição');
select throws_ok($$ insert into public.logs (acao, entidade) values ('x', 'y') $$, '42501', null,
  'ninguém insere log diretamente');

-- ---------------- coordenador inativo ----------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is((select count(*)::int from public.profiles), 1, 'inativo só enxerga o próprio perfil');
select is((select count(*)::int from public.edicoes), 0, 'inativo não lê edições');

-- ---------------- membro ----------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.profiles), 1, 'membro só enxerga o próprio perfil');
select is((select count(*)::int from public.edicoes), 0, 'membro não lê edições');

-- ---------------- EDG ----------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select lives_ok($$ select public.ativar_edicao('00000000-0000-0000-0000-00000000ed01') $$, 'EDG ativa edição');
select is((select ativa from public.edicoes where id = '00000000-0000-0000-0000-00000000ed01'), true,
  'edição ficou ativa');
select isnt((select public.duplicar_edicao('00000000-0000-0000-0000-00000000ed01', 'EJC 2027', 2027)), null,
  'EDG duplica edição');
select ok((select count(*) from public.logs where entidade = 'edicoes') >= 2, 'alterações em edições geram log');
select throws_ok(
  $$ update public.profiles set ativo = false where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'P0001', 'É preciso manter pelo menos um EDG ativo.', 'não dá para desativar o último EDG');

select * from finish();
rollback;
