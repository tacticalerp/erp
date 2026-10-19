-- ==========================================================================
-- TACTICAL ERP -- Backup automático TODOS LOS VIERNES EN LA NOCHE (Conde 2026-10-19)
--
-- Reemplaza el cron "backup-quincenal" (días 1 y 16 de cada mes). El backup completo
-- (supabase/functions/send-backup/index.ts, ya desplegada) llega como adjunto a
-- gerencia@tacticalmg.co -- igual que antes, solo cambia cuándo se dispara.
--
-- Horario: pg_cron corre en UTC. Viernes 10:00 pm hora Bogotá (UTC-5, Colombia no tiene
-- horario de verano) = sábado 03:00 UTC  ->  cron '0 3 * * 6'.
--
-- Pegar COMPLETO en el SQL Editor de Supabase y ejecutar (se puede correr más de una vez:
-- cron.schedule con un nombre que ya existe lo actualiza en vez de duplicarlo).
-- ==========================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- 1) Quitar el programa anterior (si existe) para que no lleguen backups de más
do $$
begin
  if exists (select 1 from cron.job where jobname = 'backup-quincenal') then
    perform cron.unschedule('backup-quincenal');
  end if;
end $$;

-- 2) Programar el nuevo: viernes 10 pm Bogotá
do $$
declare
  -- Misma anon key pública y mismo proyecto que migracion_cron_informes.sql / backup quincenal
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cXNrY2VjeXllZWZ4dnVpbGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjg1OTAsImV4cCI6MjEwMjY0NDU5MH0.kap_k25bLqJj4Q0xW60j1tljYO1SPpbPA2aafdYYxNQ';
  fn_url text := 'https://qwqskcecyyeefxvuilkz.supabase.co/functions/v1/send-backup';
begin
  perform cron.schedule(
    'backup-viernes-noche',
    '0 3 * * 6',
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

-- Revisar que quedó (debe verse SOLO 'backup-viernes-noche', schedule '0 3 * * 6', active = true):
--   select jobname, schedule, active from cron.job where jobname like 'backup%';
-- Ver si se ejecutó (el sábado después de las 3 am UTC):
--   select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname='backup-viernes-noche') order by start_time desc limit 5;
-- Para borrarlo:
--   select cron.unschedule('backup-viernes-noche');
