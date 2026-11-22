-- Testes de segurança e regras do BibleRats. Rodar com: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- Cadastro: o perfil nasce como "usuario", mesmo que alguém tente mandar papel=admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@teste.local', '{"nome":"Ana Leitora","papel":"admin"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'bia@teste.local', '{"nome":"Bia"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'caio@teste.local', '{"nome":"Caio"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'adm@teste.local', '{"nome":"Admin"}');
-- Isola de dados já existentes: só o admin de teste fica ativo como admin.
update public.profiles set papel = 'admin', ativo = true where id = '00000000-0000-0000-0000-0000000000d1';
update public.profiles set ativo = false where papel = 'admin' and id <> '00000000-0000-0000-0000-0000000000d1';

select is((select papel::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'usuario',
  'cadastro sempre cria usuário comum');
select is((select nome from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'Ana Leitora',
  'nome vem do cadastro');
select is((select sum(capitulos)::int from public.livros_biblia), 1189, 'Bíblia com 1189 capítulos');
select is((select count(*)::int from public.livros_biblia), 66, '66 livros');

-- ======================= anon =======================
set local role anon;
select throws_ok($$ select * from public.grupos $$, '42501', null, 'anon não lê grupos');
select throws_ok($$ select * from public.checkins $$, '42501', null, 'anon não lê check-ins');
select is((select count(*)::int from public.livros_biblia), 66, 'anon lê a lista de livros');
select throws_ok($$ select public.entrar_no_grupo('XXXX') $$, '42501', null, 'anon não entra em grupo');
reset role;

-- ======================= Ana cria um desafio =======================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select throws_ok($$ update public.profiles set papel = 'admin' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'usuário não se promove a admin');
select lives_ok($$ update public.profiles set nome = 'Ana Clara' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'usuário muda o próprio nome');

select lives_ok($$
  insert into public.grupos (id, nome, codigo, inicio, criado_por)
  values ('00000000-0000-0000-0000-0000000000f1', 'NT em 90 dias', 'TESTE123', public.hoje_belem() - 5,
          '00000000-0000-0000-0000-0000000000a1')
$$, 'usuário cria desafio');
select is(public.papel_no_grupo('00000000-0000-0000-0000-0000000000f1')::text, 'dono', 'quem cria vira dono');

select lives_ok($$
  insert into public.checkins (livro, capitulo_inicio, capitulo_fim, data) values
    ('mt', 1, 2, public.hoje_belem()), ('mt', 3, 3, public.hoje_belem() - 1), ('mt', 4, 5, public.hoje_belem())
$$, 'faz check-ins (hoje duas vezes e ontem)');
select throws_ok($$ insert into public.checkins (livro, capitulo_inicio, capitulo_fim) values ('gn', 50, 51) $$,
  'P0001', 'CAPITULO_INVALIDO', 'capítulo além do livro é recusado');
select throws_ok($$ insert into public.checkins (livro, capitulo_inicio, capitulo_fim, data) values ('gn', 1, 1, public.hoje_belem() + 1) $$,
  'P0001', 'DATA_FUTURA', 'data futura é recusada');
select throws_ok($$ insert into public.checkins (livro, capitulo_inicio, capitulo_fim, data) values ('gn', 1, 1, public.hoje_belem() - 10) $$,
  'P0001', 'DATA_ANTIGA', 'data muito antiga é recusada');
select throws_ok($$
  insert into public.checkins (user_id, livro, capitulo_inicio, capitulo_fim)
  values ('00000000-0000-0000-0000-0000000000b1', 'gn', 1, 1)
$$, '42501', null, 'não registra leitura em nome de outra pessoa');
select is(public.sequencia_atual('00000000-0000-0000-0000-0000000000a1'), 2, 'sequência de 2 dias');

-- ======================= Bia (antes de entrar) =======================
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.grupos where id = '00000000-0000-0000-0000-0000000000f1'), 0,
  'quem não é do grupo não vê o grupo');
select is((select count(*)::int from public.checkins where user_id = '00000000-0000-0000-0000-0000000000a1'), 0,
  'nem os check-ins de quem não é colega');
select is((public.grupo_por_codigo('teste123') ->> 'nome'), 'NT em 90 dias', 'vê a prévia pelo código de convite');
select throws_ok($$ insert into public.grupo_membros (grupo_id, user_id) values ('00000000-0000-0000-0000-0000000000f1', auth.uid()) $$,
  '42501', null, 'não entra no grupo sem o código');
select isnt(public.entrar_no_grupo('teste123'), null, 'entra pelo código');
select is((select count(*)::int from public.checkins where user_id = '00000000-0000-0000-0000-0000000000a1'), 3,
  'agora vê os check-ins da colega');
insert into public.checkins (livro, capitulo_inicio, capitulo_fim) values ('jo', 1, 1);
select lives_ok($$ insert into public.reacoes (checkin_id, emoji) select id, '🔥' from public.checkins where livro = 'mt' limit 1 $$,
  'reage no check-in da colega');

-- ======================= Caio (de fora) =======================
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select count(*)::int from public.profiles), 1, 'de fora só vê o próprio perfil');
select is((select count(*)::int from public.reacoes), 0, 'de fora não vê reações');

-- ======================= Placar e saída =======================
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select results_eq(
  $$ select nome, pontos from public.placar_grupo('00000000-0000-0000-0000-0000000000f1') $$,
  $$ values ('Ana Clara'::text, 2), ('Bia'::text, 1) $$,
  'placar: 1 ponto por dia com leitura');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
delete from public.grupo_membros where user_id = '00000000-0000-0000-0000-0000000000a1';
select is((select count(*)::int from public.grupo_membros where grupo_id = '00000000-0000-0000-0000-0000000000f1'), 2,
  'membro comum não remove o dono');

reset role;
select throws_ok($$ update public.profiles set ativo = false where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'P0001', 'É preciso manter pelo menos um administrador ativo.', 'sempre fica um admin ativo');

select * from finish();
rollback;
