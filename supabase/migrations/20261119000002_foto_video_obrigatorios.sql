-- Foto e vídeo nas inscrições são sempre obrigatórios.
update public.perguntas set obrigatoria = true where tipo in ('foto', 'video');

alter table public.perguntas
  add constraint perguntas_arquivo_obrigatorio
  check (tipo not in ('foto', 'video') or obrigatoria);
