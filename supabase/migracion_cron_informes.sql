-- ==========================================================================
-- TACTICAL ERP -- Cron de informes automáticos por correo (Conde 2026-08-24)
--
-- Programa los 15 informes (5 roles x 3 cadencias, ver supabase/functions/
-- send-reports/index.ts) para que se disparen solos, llamando la Edge
-- Function con el rol/cadencia correspondiente. Requiere que ya hayas
-- desplegado esa Edge Function actualizada (Dashboard -> Edge Functions ->
-- send-reports -> pegar el código nuevo -> Deploy) ANTES de correr esto --
-- si el cron llama a una función que todavía tiene el código viejo (el
-- informe único de Contabilidad), va a fallar con "rol/cadencia inválidos".
--
-- ⚠️ HORARIOS EN UTC: Postgres/pg_cron corren en UTC, no en hora de Colombia.
-- Colombia es UTC-5 todo el año (sin horario de verano), así que 7:20am en
-- Bogotá = 12:20 UTC -- por eso todos los cron de abajo dicen "20 12".
-- ==========================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- La anon key es pública a propósito (ver tactical-supabase.js) -- la seguridad
-- real la da RLS, no que esta clave esté escondida. Se necesita en el header
-- porque la Edge Function, por defecto, exige un JWT válido para invocarse.
do $$
declare
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cXNrY2VjeXllZWZ4dnVpbGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjg1OTAsImV4cCI6MjEwMjY0NDU5MH0.kap_k25bLqJj4Q0xW60j1tljYO1SPpbPA2aafdYYxNQ';
  fn_url text := 'https://qwqskcecyyeefxvuilkz.supabase.co/functions/v1/send-reports';
  roles text[] := array['contabilidad','comercial','diseno','produccion','administrador'];
  r text;
begin
  -- DIARIO -- lunes a viernes (Conde 2026-08-24: "de lunes a viernes, excepto festivos") a las
  -- 12:20 UTC (7:20am Bogotá). El "1-5" en el campo de día de la semana es lo que excluye
  -- sábado/domingo -- los festivos NO se pueden resolver con una expresión de cron (cambian cada
  -- año, Semana Santa se mueve, Ley Emiliani corre varios al lunes siguiente), así que ese chequeo
  -- vive DENTRO de la Edge Function (esFestivoColombiaHoy() en index.ts) -- el cron sigue
  -- disparando todos los días hábiles, pero la función responde sin enviar nada si es festivo.
  foreach r in array roles loop
    perform cron.schedule(
      'informe-diario-' || r,
      '20 12 * * 1-5',
      format(
        $c$select net.http_post(
          url := %L,
          headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
          body := jsonb_build_object('rol', %L, 'cadencia', 'diario')
        );$c$,
        fn_url, anon_key, r
      )
    );
  end loop;

  -- SEMANAL -- todos los viernes a las 12:20 UTC (7:20am Bogotá). Si un viernes cae festivo, la
  -- Edge Function lo detecta sola (esFestivoColombiaHoy()) y no manda nada ese día.
  foreach r in array roles loop
    perform cron.schedule(
      'informe-semanal-' || r,
      '20 12 * * 5',
      format(
        $c$select net.http_post(
          url := %L,
          headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
          body := jsonb_build_object('rol', %L, 'cadencia', 'semanal')
        );$c$,
        fn_url, anon_key, r
      )
    );
  end loop;

  -- MENSUAL -- el día 1 de cada mes a las 12:20 UTC (7:20am Bogotá). Igual que el semanal, si el
  -- día 1 cae festivo (o fin de semana), la Edge Function no manda nada ese día -- para el mensual
  -- no se reprograma al siguiente día hábil (se pidió "no enviar", no "enviar el día siguiente");
  -- avisar si Conde prefiere que sí se corra al siguiente hábil en vez de saltarse el mes.
  foreach r in array roles loop
    perform cron.schedule(
      'informe-mensual-' || r,
      '20 12 1 * *',
      format(
        $c$select net.http_post(
          url := %L,
          headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
          body := jsonb_build_object('rol', %L, 'cadencia', 'mensual')
        );$c$,
        fn_url, anon_key, r
      )
    );
  end loop;
end $$;

-- Nota: cron.schedule() con un nombre que ya existe ACTUALIZA ese job en vez
-- de duplicarlo -- este script se puede volver a correr sin problema si algo
-- cambia (ej. la URL de la función).

-- Para revisar que los 15 jobs quedaron creados:
--   select jobname, schedule, active from cron.job order by jobname;
-- Para ver si de verdad se están ejecutando (después de que pase la hora):
--   select * from cron.job_run_details order by start_time desc limit 20;
-- Para borrar uno si algo sale mal:
--   select cron.unschedule('informe-diario-contabilidad');

-- ==========================================================================
-- FIN. Corre este script igual que los anteriores (pegar + Run en el SQL
-- Editor de Supabase) -- pero SOLO después de desplegar la Edge Function
-- actualizada. Después avísame y verifico desde aquí.
-- ==========================================================================
