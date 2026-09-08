-- ==========================================================================
-- Conde 2026-09-08: "quiero que la foto que esta en la cotizacion hecha a
-- mano al ser aprobada sea la que quede en el kanban"
--
-- Las 8 calculadoras ya guardaban la foto/video elegidos en el objeto "opp"
-- en memoria (usados para el PDF y para armar la ficha de Kanban al marcar
-- Ganado, ver crearFichaKanbanDesdeOpp en el Hub) -- pero la tabla "opps" de
-- Supabase nunca tuvo columnas para guardarlos. Si la cotización se aprueba
-- en la MISMA sesión del navegador donde se guardó, la foto sí pasaba al
-- Kanban (vivía en memoria); pero si el navegador se recarga o pasa a otra
-- sesión antes de aprobar (lo normal -- un cliente puede tardar días en
-- responder), la foto se perdía porque nunca se guardó de verdad.
--
-- Esta migración agrega esas 2 columnas para que sobrevivan la recarga.
-- ==========================================================================

alter table opps add column if not exists foto_url text;
alter table opps add column if not exists video_url text;
