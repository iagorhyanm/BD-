-- Testes de RLS e regras da Fase 2. Rodar com: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'edg2@teste.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'coord2@teste.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'coord3@teste.local');

insert into public.profiles (id, nome, papel, precisa_trocar_senha) values
  ('00000000-0000-0000-0000-0000000000e1', 'EDG', 'edg', false),
  ('00000000-0000-0000-0000-0000000000c1', 'Coord Um', 'coordenador', false),
  ('00000000-0000-0000-0000-0000000000c3', 'Coord Três', 'coordenador', false);

insert into public.edicoes (id, nome) values ('00000000-0000-0000-0000-00000000ed01', 'EJC Teste');

insert into public.formularios (id, edicao_id, slug, titulo, aberto, limite) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'teste-aberto', 'Aberto', true, 3),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000ed01', 'teste-fechado', 'Fechado', false, null),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000ed01', 'teste-futuro', 'Futuro', true, null);
update public.formularios set abre_em = now() + interval '1 day' where id = '00000000-0000-0000-0000-0000000000f3';

insert into public.perguntas (id, formulario_id, tipo, rotulo, obrigatoria, opcoes) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'lista', 'Instrumento', true,
   '["Violão","Voz"]');

-- ======================= anon =======================
set local role anon;

select is((public.formulario_publico('teste-aberto') ->> 'situacao'), 'aberto', 'público vê o formulário aberto');
select is(jsonb_array_length(public.formulario_publico('teste-aberto') -> 'perguntas'), 1, 'público vê as perguntas pelo RPC');
select is(public.formulario_publico('teste-fechado') ->> 'situacao', 'fechado', 'situação fechado');
select is(public.formulario_publico('teste-futuro') ->> 'situacao', 'agendado', 'situação agendado');
select is(public.formulario_publico('nao-existe'), null, 'slug inexistente devolve nulo');

select throws_ok($$ select * from public.perguntas $$, '42501', null, 'público não lê perguntas');
select throws_ok($$ select * from public.inscricoes $$, '42501', null, 'público não lê inscrições');
select throws_ok($$ select * from public.membros $$, '42501', null, 'público não lê membros');

select lives_ok($$
  insert into public.inscricoes (formulario_id, edicao_id, nome, nascimento, idade, telefone, sexo, ja_trabalhou,
    cidade, respostas, consentimento, status)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'Ana Maria',
    '2000-01-10', 0, '(94) 99111-1111', 'feminino', false, 'Marabá',
    '{"00000000-0000-0000-0000-0000000000a1":"Voz"}', true, 'selecionado')
$$, 'público insere em formulário aberto');

select throws_ok($$
  insert into public.inscricoes (formulario_id, edicao_id, nome, nascimento, idade, telefone, sexo, ja_trabalhou,
    cidade, respostas, consentimento)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'Ana Duplicada',
    '2000-01-10', 0, '94991111111', 'feminino', false, 'Marabá',
    '{"00000000-0000-0000-0000-0000000000a1":"Voz"}', true)
$$, '23505', null, 'telefone duplicado no mesmo formulário é bloqueado');

select throws_ok($$
  insert into public.inscricoes (formulario_id, edicao_id, nome, nascimento, idade, telefone, sexo, ja_trabalhou,
    cidade, consentimento)
  values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000ed01', 'Bruno',
    '2000-01-10', 0, '94992222222', 'masculino', false, 'Marabá', true)
$$, 'P0001', 'FORMULARIO_FECHADO', 'formulário fechado não aceita inscrição');

select throws_ok($$
  insert into public.inscricoes (formulario_id, edicao_id, nome, nascimento, idade, telefone, sexo, ja_trabalhou,
    cidade, consentimento)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'Carlos',
    '2000-01-10', 0, '94993333333', 'masculino', false, 'Marabá', true)
$$, 'P0001', 'PERGUNTA_OBRIGATORIA: Instrumento', 'pergunta obrigatória sem resposta é rejeitada');

select throws_ok($$
  insert into public.inscricoes (formulario_id, edicao_id, nome, nascimento, idade, telefone, sexo, ja_trabalhou,
    cidade, respostas, consentimento)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'Menor Sem Resp',
    (public.hoje_belem() - interval '15 years')::date, 0, '94994444444', 'masculino', false, 'Marabá',
    '{"00000000-0000-0000-0000-0000000000a1":"Voz"}', true)
$$, 'P0001', 'RESPONSAVEL_OBRIGATORIO', 'menor de idade exige responsável');

select lives_ok($$
  insert into public.inscricoes (formulario_id, edicao_id, nome, nascimento, idade, telefone, sexo, ja_trabalhou,
    equipe_anterior, ano_anterior, cidade, respostas, consentimento, resp_nome, resp_telefone, resp_consentimento)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'Menor Com Resp',
    (public.hoje_belem() - interval '15 years')::date, 0, '94995555555', 'masculino', true, 'Bandinha', 2025,
    'Marabá', '{"00000000-0000-0000-0000-0000000000a1":"Violão"}', true, 'Mãe', '94996666666', true)
$$, 'menor com responsável é aceito');

select lives_ok($$
  insert into public.inscricoes (formulario_id, edicao_id, nome, nascimento, idade, telefone, sexo, ja_trabalhou,
    cidade, respostas, consentimento)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'Terceiro',
    '1999-05-05', 0, '94997777777', 'masculino', false, 'Marabá',
    '{"00000000-0000-0000-0000-0000000000a1":"Voz"}', true)
$$, 'terceira inscrição (limite = 3) é aceita');

select throws_ok($$
  insert into public.inscricoes (formulario_id, edicao_id, nome, nascimento, idade, telefone, sexo, ja_trabalhou,
    cidade, respostas, consentimento)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'Quarto',
    '1999-05-05', 0, '94998888888', 'masculino', false, 'Marabá',
    '{"00000000-0000-0000-0000-0000000000a1":"Voz"}', true)
$$, 'P0001', 'FORMULARIO_ESGOTADO', 'limite de inscrições é respeitado');

select throws_ok($$ select public.puxar_para_equipe(array[]::uuid[]) $$, '42501', null, 'público não puxa para a equipe');
reset role;

-- Conferências como superusuário
select is((select status::text from public.inscricoes where nome = 'Ana Maria'), 'pendente',
  'status enviado pelo público é forçado para pendente');
select is((select telefone from public.inscricoes where nome = 'Ana Maria'), '94991111111', 'telefone normalizado');
select is((select idade from public.inscricoes where nome = 'Menor Com Resp'), 15, 'idade calculada pelo banco');

-- ======================= coordenador =======================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

select lives_ok($$
  insert into public.avaliacoes (inscricao_id, coordenador_id, nota, comentario)
  select id, '00000000-0000-0000-0000-0000000000c1', 5, 'Ótima voz' from public.inscricoes where nome = 'Ana Maria'
$$, 'coordenador avalia');

select throws_ok($$
  insert into public.avaliacoes (inscricao_id, coordenador_id, nota)
  select id, '00000000-0000-0000-0000-0000000000c3', 1 from public.inscricoes where nome = 'Ana Maria'
$$, '42501', null, 'coordenador não avalia em nome de outro');

select is((select public.puxar_para_equipe(array(select id from public.inscricoes where nome in ('Ana Maria', 'Terceiro')))),
  2, 'puxar para a equipe cria membros');
select is((select count(*)::int from public.inscricoes where nome in ('Ana Maria', 'Terceiro') and status = 'selecionado'),
  2, 'puxados ficam como selecionados');

select * from finish();
rollback;
