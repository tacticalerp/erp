-- ==========================================================================
-- TACTICAL ERP -- Cron de backup semanal automático (Conde 2026-08-28)
--
-- Programa que el backup completo (ver supabase/functions/send-backup/
-- index.ts) se dispare solo cada semana, llamando la Edge Function -- llega
-- como archivo adjunto a gerencia@tacticalmg.co (ver DESTINATARIOS en el
-- index.ts si quieres agregar a alguien más).
--
-- Requiere que ya hayas desplegado la Edge Function send-backup (Dashboard
-- -> Edge Functions -> Create a new function -> nombre "send-backup" ->
-- pegar el código de supabase/functions/send-backup/index.ts -> Deploy)
-- ANTES de correr esto.
--
-- ⚠️ HORARIO EN UTC: igual que migracion_cron_informes.sql, pg_cron corre en
-- UTC. Este backup dispara los LUNES a las 11:00 UTC = 6:00am Bogotá (antes
-- de que arranque la semana laboral) -- antes que el informe diario de las
-- 7:20am para no competir por recursos exactamente a la misma hora.
-- ==========================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare
  -- Misma anon key y mismo proyecto que ya usa migracion_cron_informes.sql -- pública a propósito
  -- (ver tactical-supabase.js), la seguridad real la da RLS/service role, no que esté escondida.
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cXNrY2VjeXllZWZ4dnVpbGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjg1OTAsImV4cCI6MjEwMjY0NDU5MH0.kap_k25bLqJj4Q0xW60j1tljYO1SPpbPA2aafdYYxNQ';
  fn_url text := 'https://qwqskcecyyeefxvuilkz.supabase.co/functions/v1/send-backup';
begin
  perform cron.schedule(
    'backup-semanal',
    '0 11 * * 1',
    format(
      $c$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
        body := jsonb_build_object('trigger','cron')
      );$c$,
      fn_url, anon_key
    )
  );
end $$;

-- Nota: cron.schedule() con un nombre que ya existe ACTUALIZA ese job en vez
-- de duplicarlo -- este script se puede volver a correr sin problema si algo
-- cambia (ej. la URL de la función o el horario).

-- Para revisar que el job quedó creado:
--   select jobname, schedule, active from cron.job where jobname = 'backup-semanal';
-- Para ver si de verdad se está ejecutando (después de que pase la hora):
--   select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname='backup-semanal') order by start_time desc limit 5;
-- Para borrarlo si algo sale mal:
--   select cron.unschedule('backup-semanal');

-- ==========================================================================
-- FIN. Corre este script (pegar + Run en el SQL Editor de Supabase) SOLO
-- después de desplegar la Edge Function send-backup. Para probarlo sin
-- esperar hasta el lunes: botón "Invoke" en el Dashboard de la función, o
-- con curl a la URL de arriba (con el header Authorization) -- confirma que
-- el correo con el adjunto llega bien a gerencia@tacticalmg.co.
-- ==========================================================================
