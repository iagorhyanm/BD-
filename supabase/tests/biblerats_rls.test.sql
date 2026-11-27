-- Testes de segurança e regras do BibleRats. Rodar com: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(60);

-- Cadastro: o perfil nasce como "usuario", mesmo que alguém tente mandar papel=admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@teste.local', '{"nome":"Ana Leitora","papel":"admin"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'bia@teste.local', '{"nome":"Bia"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'caio@teste.local', '{"nome":"Caio"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'adm@teste.local', '{"nome":"Admin"}');
-- Isola de dados já existentes: só o admin de teste fica ativo como admin.
update public.profiles set papel = 'admin', ativo = true where id = '00000000-0000-0000-0000-0000000000d1';
update public.profiles set ativo = false where papel = 'admin' and id <> '00000000-0000-0000-0000-0000000000d1';

-- Plano de teste: de 5 dias atrás até amanhã (Mateus 1..7)
delete from public.plano_dias where data between public.hoje_belem() - 5 and public.hoje_belem() + 1
  and not exists (select 1 from public.checkins c where c.data = plano_dias.data);
insert into public.plano_dias (data, leitura, referencias)
select public.hoje_belem() + n, 'Mateus ' || (n + 6), jsonb_build_array(jsonb_build_object('livro', 'mt', 'inicio', n + 6, 'fim', n + 6))
from generate_series(-5, 1) n
where n <> -3
on conflict (data) do update set leitura = excluded.leitura, referencias = excluded.referencias;

select is((select papel::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'usuario',
  'cadastro sempre cria usuário comum');
select is((select sum(capitulos)::int from public.livros_biblia), 1189, 'Bíblia com 1189 capítulos');
select throws_ok($$ insert into public.plano_dias (data, leitura, referencias) values ('2099-01-01', 'x', '[{"livro":"gn","inicio":50,"fim":51}]') $$,
  'P0001', null, 'plano recusa capítulo inexistente');

-- ======================= anon =======================
set local role anon;
select throws_ok($$ select * from public.grupos $$, '42501', null, 'anon não lê grupos');
select throws_ok($$ select * from public.checkins $$, '42501', null, 'anon não lê check-ins');
select throws_ok($$ select * from public.plano_dias $$, '42501', null, 'anon não lê o plano');
select is((select count(*)::int from public.app_config), 1, 'anon lê as configurações (nome do app no login)');
select throws_ok($$ select public.entrar_no_grupo('XXXX') $$, '42501', null, 'anon não entra em grupo');
select throws_ok($$ select * from public.push_inscricoes $$, '42501', null, 'anon não lê inscrições de notificação');
select throws_ok($$ select * from public.notificacoes_programadas $$, '42501', null, 'anon não lê notificações programadas');
reset role;

-- ======================= Ana =======================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select throws_ok($$ update public.profiles set papel = 'admin' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'usuário não se promove a admin');
select lives_ok($$ update public.profiles set nome = 'Ana Clara' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'usuário muda o próprio nome');
select lives_ok($$ update public.profiles set foto_path = '00000000-0000-0000-0000-0000000000a1/x.jpg' where id = auth.uid() $$,
  'usuário põe foto de perfil');
select throws_ok($$ update public.profiles set foto_path = '00000000-0000-0000-0000-0000000000b1/x.jpg' where id = auth.uid() $$,
  'P0001', 'FOTO_INVALIDA', 'foto de perfil só da própria pasta');
select throws_ok($$ insert into public.plano_dias (data, leitura) values ('2099-01-02', 'x') $$,
  '42501', null, 'usuário comum não mexe no plano');
update public.app_config set nome = 'Hackeado';
select isnt((select nome from public.app_config), 'Hackeado', 'usuário comum não muda as configurações');
select is((select count(*)::int from public.plano_dias where data = public.hoje_belem()), 1, 'usuário vê o plano');

select lives_ok($$
  insert into public.grupos (id, nome, codigo, inicio, criado_por)
  values ('00000000-0000-0000-0000-0000000000f1', 'NT em 90 dias', 'TESTE123', public.hoje_belem() - 5,
          '00000000-0000-0000-0000-0000000000a1')
$$, 'usuário cria desafio');
select is(public.papel_no_grupo('00000000-0000-0000-0000-0000000000f1')::text, 'dono', 'quem cria vira dono');

select throws_ok($$ insert into public.checkins (data, versiculo) values (public.hoje_belem(), 'Mt 5:3') $$,
  'P0001', 'CAMPOS_OBRIGATORIOS', 'check-in exige o que aprendeu, foto e tempo');
select throws_ok($$ insert into public.checkins (data, minutos, anotacao, foto_path) values (public.hoje_belem(), 10, 'Aprendi', '00000000-0000-0000-0000-0000000000b1/f.jpg') $$,
  'P0001', 'FOTO_INVALIDA', 'foto do check-in só da própria pasta');
reset role;
-- Daqui em diante os check-ins de teste já vêm com os campos obrigatórios.
alter table public.checkins alter column minutos set default 10,
  alter column anotacao set default 'Aprendi algo',
  alter column foto_path set default (auth.uid()::text || '/teste.jpg');
set local role authenticated;
select lives_ok($$ insert into public.checkins (data, versiculo) values (public.hoje_belem(), 'Mt 5:3') $$,
  'marca a leitura de hoje');
select is((select no_prazo from public.checkins where user_id = auth.uid() and data = public.hoje_belem()), true,
  'leitura de hoje conta como no prazo');
select throws_ok($$ insert into public.checkins (data) values (public.hoje_belem()) $$,
  '23505', null, 'não marca o mesmo dia duas vezes');
select throws_ok($$ insert into public.checkins (data) values (public.hoje_belem() + 1) $$,
  'P0001', 'DATA_FUTURA', 'não marca dia futuro');
select throws_ok($$ insert into public.checkins (data) values (public.hoje_belem() - 5) $$,
  'P0001', 'DATA_ANTIGA', 'não marca dia com mais de 3 dias de atraso');
select throws_ok($$ insert into public.checkins (data) values (public.hoje_belem() - 3) $$,
  '23503', null, 'só marca dias que existem no plano');
select throws_ok($$ insert into public.checkins (user_id, data, foto_path) values ('00000000-0000-0000-0000-0000000000b1', public.hoje_belem() - 1, '00000000-0000-0000-0000-0000000000b1/x.jpg') $$,
  '42501', null, 'não marca leitura em nome de outra pessoa');
reset role;

-- Ana leu no prazo também nos 2 dias anteriores (semeado direto, como se tivesse sido no dia).
alter table public.checkins disable trigger checkins_validar;
insert into public.checkins (user_id, data, no_prazo, foto_path) values
  ('00000000-0000-0000-0000-0000000000a1', public.hoje_belem() - 1, true, '00000000-0000-0000-0000-0000000000a1/a.jpg'),
  ('00000000-0000-0000-0000-0000000000a1', public.hoje_belem() - 2, true, '00000000-0000-0000-0000-0000000000a1/b.jpg');
alter table public.checkins enable trigger checkins_validar;
select is(public.sequencia_atual('00000000-0000-0000-0000-0000000000a1'), 3, 'sequência de 3 dias no prazo');

-- ======================= Bia =======================
set local role authenticated;
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

select lives_ok($$ insert into public.checkins (data) values (public.hoje_belem() - 1) $$, 'esqueceu ontem: marca hoje');
select is((select no_prazo from public.checkins where user_id = auth.uid() and data = public.hoje_belem() - 1), true,
  'ontem marcado hoje conta como no prazo');
select lives_ok($$ insert into public.checkins (data) values (public.hoje_belem() - 2) $$, 'marca leitura atrasada (2 dias)');
select is((select no_prazo from public.checkins where user_id = auth.uid() and data = public.hoje_belem() - 2), false,
  'leitura atrasada não conta como no prazo');
insert into public.checkins (data) values (public.hoje_belem());
select is(public.sequencia_atual(auth.uid()), 2, 'ontem (tolerância) + hoje = sequência 2; 2 dias de atraso não entra');
select lives_ok($$ insert into public.reacoes (checkin_id, emoji)
  select id, '🔥' from public.checkins where user_id = '00000000-0000-0000-0000-0000000000a1' and data = public.hoje_belem()
$$, 'reage no check-in da colega');

-- ======================= Notificações =======================
select lives_ok($$ insert into public.push_inscricoes (user_id, endpoint, p256dh, auth) values (auth.uid(), 'https://push.example/bia', 'BKxxxxxxxxxx', 'aaaaaaaa') $$,
  'cadastra notificação no próprio aparelho');
select throws_ok($$ insert into public.push_inscricoes (user_id, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000000a1', 'https://push.example/x', 'BKxxxxxxxxxx', 'aaaaaaaa') $$,
  '42501', null, 'não cadastra notificação para outra pessoa');
select lives_ok($$ update public.profiles set notif_checkins = false where id = auth.uid() $$, 'muda as próprias preferências');

-- ======================= Caio (de fora) =======================
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select count(*)::int from public.profiles), 1, 'de fora só vê o próprio perfil');
select is((select count(*)::int from public.checkins), 0, 'de fora não vê leituras');
select is((select count(*)::int from public.push_inscricoes), 0, 'não vê as notificações dos outros');
select throws_ok($$ insert into public.notificacoes_programadas (titulo, mensagem, recorrencia, hora) values ('x', 'y', 'diaria', '06:00') $$,
  '42501', null, 'usuário comum não programa notificação');
select is((select count(*)::int from public.notificacoes_programadas), 0, 'usuário comum não vê notificações programadas');

-- ======================= Placar e estatísticas =======================
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select results_eq(
  $$ select nome, pontos from public.placar_grupo('00000000-0000-0000-0000-0000000000f1') $$,
  $$ values ('Ana Clara'::text, 3.0::numeric), ('Bia'::text, 2.5::numeric) $$,
  'placar: 1 ponto no dia ou no dia seguinte, meio ponto com mais atraso');
select is((public.estatisticas_usuario(auth.uid()) ->> 'capitulos')::int, 3, 'estatística: 3 capítulos lidos pelo plano');

-- ======================= Admin =======================
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select lives_ok($$ insert into public.plano_dias (data, leitura, referencias) values ('2099-01-03', 'Salmo 23', '[{"livro":"sl","inicio":23,"fim":23}]') $$,
  'admin cadastra dia do plano');
select lives_ok($$ update public.app_config set aviso_texto = 'Encontro sábado!', aviso_ativo = true $$, 'admin muda configurações');
select is((select aviso_texto from public.app_config), 'Encontro sábado!', 'aviso salvo');
select lives_ok($$ insert into public.notificacoes_programadas (titulo, mensagem, recorrencia, hora) values ('Bom dia, {nome}!', 'Bora ler?', 'diaria', '06:00') $$,
  'admin programa notificação');
select throws_ok($$ insert into public.notificacoes_programadas (titulo, mensagem, recorrencia, hora) values ('x', 'y', 'semanal', '06:00') $$,
  '23514', null, 'semanal exige pelo menos um dia');

reset role;
alter table public.checkins disable trigger checkins_validar;
insert into public.checkins (user_id, data, no_prazo, foto_path) values
  ('00000000-0000-0000-0000-0000000000d1', public.hoje_belem() - 2, true, '00000000-0000-0000-0000-0000000000d1/a.jpg');
alter table public.checkins enable trigger checkins_validar;
select is(public.sequencia_atual('00000000-0000-0000-0000-0000000000d1'), 1, 'hoje e ontem pendentes não quebram a sequência');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
insert into public.checkins (data) values (public.hoje_belem());
select is(public.sequencia_atual(auth.uid()), 1, 'leu hoje mas não marcou ontem: sequência recomeça');
insert into public.checkins (data) values (public.hoje_belem() - 1);
select is(public.sequencia_atual(auth.uid()), 3, 'marcou ontem depois: sequência volta inteira');
reset role;
select throws_ok($$ update public.profiles set ativo = false where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'P0001', 'É preciso manter pelo menos um administrador ativo.', 'sempre fica um admin ativo');

select * from finish();
rollback;
