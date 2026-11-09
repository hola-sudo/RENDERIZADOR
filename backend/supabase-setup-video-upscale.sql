-- ============================================================================
--  Migración: upscaling de video como proceso aparte
--  Ejecuta este script en Supabase: Dashboard > SQL Editor > New query > Run
--  (Requiere haber corrido antes supabase-setup-video.sql)
--
--  El video de Veo siempre se guarda en 1080p. La versión escalada (4K) vive
--  en la MISMA fila: así el historial muestra un solo video con sus dos
--  calidades en vez de duplicar registros.
-- ============================================================================

-- 1) Columnas nuevas en video_renders ----------------------------------------
alter table public.video_renders
  add column if not exists resolution          text not null default '1080p', -- resolución con la que se generó
  add column if not exists upscaled_video_path text,          -- ruta del 4K en el bucket "videos"
  add column if not exists upscale_resolution  text,          -- '4k' | '1080p'
  add column if not exists upscale_status       text,          -- 'processing' | 'done' | 'error'
  add column if not exists upscale_error        text,          -- motivo del fallo, para poder reintentar
  add column if not exists upscale_operation    text;          -- id de la predicción en Replicate

alter table public.video_renders
  drop constraint if exists video_renders_upscale_status_check;
alter table public.video_renders
  add constraint video_renders_upscale_status_check
  check (upscale_status is null or upscale_status in ('processing', 'done', 'error'));

-- 2) Policy de UPDATE: el upscaling actualiza la fila del video --------------
--    (supabase-setup-video.sql solo creó select/insert/delete; sin esta policy
--    RLS bloquearía silenciosamente el guardado del 4K)
drop policy if exists "video_renders_update_own" on public.video_renders;
create policy "video_renders_update_own" on public.video_renders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Backfill: los videos existentes se generaron en 1080p -------------------
update public.video_renders set resolution = '1080p' where resolution is null;
