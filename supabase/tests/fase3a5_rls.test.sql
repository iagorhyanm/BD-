-- Testes de RLS e regras das Fases 3, 4 e 5. Rodar com: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'edg3@teste.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'coord3@teste.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'membro3@teste.local');

insert into public.profiles (id, nome, papel, precisa_trocar_senha) values
  ('00000000-0000-0000-0000-0000000000e1', 'EDG', 'edg', false),
  ('00000000-0000-0000-0000-0000000000c1', 'Coord', 'coordenador', false),
  ('00000000-0000-0000-0000-0000000000a1', 'Membro', 'membro', false);

insert into public.edicoes (id, nome) values ('00000000-0000-0000-0000-00000000ed01', 'EJC Teste');

insert into public.membros (id, edicao_id, nome, sexo) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000ed01', 'Ana', 'feminino'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000ed01', 'Beto', 'masculino');

insert into public.eventos (id, edicao_id, tipo, titulo, inicio) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000ed01', 'ensaio', 'Ensaio 1', now()),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-00000000ed01', 'ensaio', 'Ensaio 2', now() + interval '7 days');

insert into public.equipamentos (id, edicao_id, item, estado) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'Violão Yamaha', 'bom');

insert into public.musicas (id, titulo) values ('00000000-0000-0000-0000-0000000000c9', 'Música Teste');

insert into public.setlists (id, edicao_id, titulo) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-00000000ed01', 'Repertório base');
insert into public.setlist_itens (setlist_id, musica_id, ordem) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000c9', 0);

-- ======================= anon =======================
set local role anon;
select throws_ok($$ select * from public.funcoes $$, '42501', null, 'anon não lê funções');
select throws_ok($$ select * from public.eventos $$, '42501', null, 'anon não lê eventos');
select throws_ok($$ select * from public.presencas $$, '42501', null, 'anon não lê presenças');
select throws_ok($$ select * from public.musicas $$, '42501', null, 'anon não lê músicas');
select throws_ok($$ select * from public.equipamentos $$, '42501', null, 'anon não lê equipamentos');
select throws_ok($$ select * from public.avisos $$, '42501', null, 'anon não lê avisos');
select throws_ok($$ select * from public.resumo_presenca $$, '42501', null, 'anon não lê resumo de presença');
reset role;

-- ======================= membro (sem acesso) =======================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.eventos), 0, 'membro não vê eventos');
select is((select count(*)::int from public.membros), 0, 'membro não vê membros');
select is((select count(*)::int from public.funcoes), 0, 'membro não vê funções');

-- ======================= coordenador =======================
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select ok((select count(*) from public.funcoes) >= 10, 'coordenador vê as funções padrão');
select throws_ok($$ insert into public.funcoes (nome, tipo) values ('Sanfona', 'instrumento') $$,
  '42501', null, 'coordenador não cria função (só EDG)');

select lives_ok($$
  insert into public.escalas (evento_id, membro_id, funcao_id)
  select '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', id
  from public.funcoes where nome in ('Voz principal', 'Violão')
$$, 'coordenador escala membro');

select lives_ok($$
  insert into public.presencas (evento_id, membro_id, status) values
    ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'presente'),
    ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', 'falta'),
    ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b2', 'atraso')
$$, 'coordenador faz chamada');

select throws_ok($$
  insert into public.presencas (evento_id, membro_id, status)
  values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', 'justificada')
$$, '23514', null, 'falta justificada exige motivo');

select is((select percentual from public.resumo_presenca where membro_id = '00000000-0000-0000-0000-0000000000b1'),
  50, 'percentual de presença calculado');
select is((select faltas from public.resumo_presenca where membro_id = '00000000-0000-0000-0000-0000000000b1'),
  1, 'faltas não justificadas contadas');

select lives_ok($$
  insert into public.checklist_itens (evento_id, equipamento_id, descricao)
  values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', 'Violão Yamaha')
$$, 'coordenador monta checklist');

select lives_ok($$
  insert into public.avisos (edicao_id, titulo, texto, autor_id)
  values ('00000000-0000-0000-0000-00000000ed01', 'Ensaio', 'Sábado 15h', '00000000-0000-0000-0000-0000000000c1')
$$, 'coordenador cria aviso');

select throws_ok($$ select public.duplicar_edicao('00000000-0000-0000-0000-00000000ed01', 'Cópia', 2028) $$,
  '42501', null, 'coordenador não duplica edição');

-- ======================= EDG =======================
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select isnt(public.duplicar_edicao('00000000-0000-0000-0000-00000000ed01', 'EJC Cópia', 2028), null,
  'EDG duplica edição');
select is(
  (select count(*)::int from public.equipamentos e join public.edicoes d on d.id = e.edicao_id
    where d.nome = 'EJC Cópia'),
  1, 'duplicar edição copia equipamentos');
select is(
  (select count(*)::int from public.setlist_itens i join public.setlists s on s.id = i.setlist_id
    join public.edicoes d on d.id = s.edicao_id where d.nome = 'EJC Cópia'),
  1, 'duplicar edição copia setlists modelo com itens');

select * from finish();
rollback;
