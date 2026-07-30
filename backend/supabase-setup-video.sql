-- ============================================================================
--  Setup de historial de videos de transición (Veo) para Event Render AI
--  Ejecuta este script en Supabase: Dashboard > SQL Editor > New query > Run
--  (Requiere haber corrido antes supabase-setup.sql)
-- ============================================================================

-- 1) Tabla de video_renders ---------------------------------------------------
create table if not exists public.video_renders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  video_path        text not null,           -- ruta dentro del bucket "videos"
  start_description text,
  camera_movement   text,
  duration_seconds  integer,
  created_at        timestamptz not null default now()
);

create index if not exists video_renders_user_created_idx
  on public.video_renders (user_id, created_at desc);

-- 2) Row Level Security: cada usuario solo ve/gestiona lo suyo ---------------
alter table public.video_renders enable row level security;

drop policy if exists "video_renders_select_own" on public.video_renders;
create policy "video_renders_select_own" on public.video_renders
  for select using (auth.uid() = user_id);

drop policy if exists "video_renders_insert_own" on public.video_renders;
create policy "video_renders_insert_own" on public.video_renders
  for insert with check (auth.uid() = user_id);

drop policy if exists "video_renders_delete_own" on public.video_renders;
create policy "video_renders_delete_own" on public.video_renders
  for delete using (auth.uid() = user_id);

-- 3) Bucket de Storage (privado) para los videos -----------------------------
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

-- 4) Policies de Storage: acceso solo a la carpeta {user_id}/... ------------
--    Los videos se guardan como "<user_id>/<uuid>.mp4".
drop policy if exists "video_renders_storage_select_own" on storage.objects;
create policy "video_renders_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "video_renders_storage_insert_own" on storage.objects;
create policy "video_renders_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "video_renders_storage_delete_own" on storage.objects;
create policy "video_renders_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text
  );
