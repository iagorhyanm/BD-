-- Testes: selfie/vídeo obrigatórios e bucket privado de inscrições.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'edg6@teste.local');
insert into public.profiles (id, nome, papel, precisa_trocar_senha)
values ('00000000-0000-0000-0000-0000000000e1', 'EDG', 'edg', false);
insert into public.edicoes (id, nome) values ('00000000-0000-0000-0000-00000000ed01', 'EJC Teste');
insert into public.formularios (id, edicao_id, slug, titulo, aberto)
values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'teste-arquivos', 'Teste', true);

select throws_ok($$
  insert into public.perguntas (formulario_id, tipo, rotulo, obrigatoria)
  values ('00000000-0000-0000-0000-0000000000f1', 'foto', 'Selfie', false)
$$, '23514', null, 'pergunta de foto não pode ser opcional');
select throws_ok($$
  insert into public.perguntas (formulario_id, tipo, rotulo, obrigatoria)
  values ('00000000-0000-0000-0000-0000000000f1', 'video', 'Vídeo', false)
$$, '23514', null, 'pergunta de vídeo não pode ser opcional');

insert into public.perguntas (id, formulario_id, tipo, rotulo, obrigatoria) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'foto', 'Selfie', true),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1', 'video', 'Vídeo', true);

select is((select public from storage.buckets where id = 'inscricoes'), false, 'bucket de inscrições é privado');

set local role anon;
select throws_ok($$
  insert into public.inscricoes (formulario_id, edicao_id, nome, nascimento, idade, telefone, sexo, ja_trabalhou,
    cidade, respostas, consentimento)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'Sem Selfie',
    '2000-01-01', 0, '94990000001', 'masculino', false, 'Marabá',
    '{"00000000-0000-0000-0000-0000000000a2":"https://youtu.be/x"}', true)
$$, 'P0001', 'PERGUNTA_OBRIGATORIA: Selfie', 'sem selfie a inscrição é recusada');
select throws_ok($$
  insert into public.inscricoes (formulario_id, edicao_id, nome, nascimento, idade, telefone, sexo, ja_trabalhou,
    cidade, respostas, consentimento)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000ed01', 'Sem Video',
    '2000-01-01', 0, '94990000002', 'masculino', false, 'Marabá',
    '{"00000000-0000-0000-0000-0000000000a1":"x/y/foto-1.jpg"}', true)
$$, 'P0001', 'PERGUNTA_OBRIGATORIA: Vídeo', 'sem vídeo a inscrição é recusada');
select throws_ok($$
  insert into storage.objects (bucket_id, name) values ('inscricoes', 'qualquer/coisa.mp4')
$$, '42501', null, 'público não grava direto no bucket');
select is((select count(*)::int from storage.objects where bucket_id = 'inscricoes'), 0, 'público não lista arquivos');
select throws_ok($$ select * from public.uso_armazenamento() $$, '42501', null, 'público não vê uso de armazenamento');

select * from finish();
rollback;
