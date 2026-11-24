-- =====================================================================
-- Agendador das notificações (rodar UMA vez no SQL Editor do Supabase).
-- Chama o app a cada 5 minutos; o app envia o que estiver na hora
-- (notificações programadas e o lembrete diário).
--
-- Antes, guarde o mesmo valor da variável CRON_SECRET da Vercel no cofre:
--   select vault.create_secret('<o mesmo CRON_SECRET da Vercel>', 'cron_secret');
-- e troque o endereço abaixo se o seu site tiver outro.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('biblerats-notificacoes')
where exists (select 1 from cron.job where jobname = 'biblerats-notificacoes');

select cron.schedule(
  'biblerats-notificacoes',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://biblerats-app.vercel.app/api/cron/notificacoes',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 55000
  );
  $$
);

-- Conferir:   select * from cron.job;
-- Execuções:  select * from cron.job_run_details order by start_time desc limit 10;
-- Respostas:  select status_code, content from net._http_response order by created desc limit 10;
