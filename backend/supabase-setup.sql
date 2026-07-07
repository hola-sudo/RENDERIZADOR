-- ============================================================================
--  Setup de historial de renders para Event Render AI
--  Ejecuta este script en Supabase: Dashboard > SQL Editor > New query > Run
-- ============================================================================

-- 1) Tabla de renders --------------------------------------------------------
create table if not exists public.renders (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  image_path           text not null,           -- ruta dentro del bucket "renders"
  scene_description    text,
  lighting_type        text,
  color_temperature    text,
  contrast_enhancement text,
  created_at           timestamptz not null default now()
);

create index if not exists renders_user_created_idx
  on public.renders (user_id, created_at desc);

-- 2) Row Level Security: cada usuario solo ve/gestiona lo suyo ---------------
alter table public.renders enable row level security;

drop policy if exists "renders_select_own" on public.renders;
create policy "renders_select_own" on public.renders
  for select using (auth.uid() = user_id);

drop policy if exists "renders_insert_own" on public.renders;
create policy "renders_insert_own" on public.renders
  for insert with check (auth.uid() = user_id);

drop policy if exists "renders_delete_own" on public.renders;
create policy "renders_delete_own" on public.renders
  for delete using (auth.uid() = user_id);

-- 3) Bucket de Storage (privado) para las imágenes --------------------------
insert into storage.buckets (id, name, public)
values ('renders', 'renders', false)
on conflict (id) do nothing;

-- 4) Policies de Storage: acceso solo a la carpeta {user_id}/... ------------
--    Las imágenes se guardan como "<user_id>/<uuid>.png".
drop policy if exists "renders_storage_select_own" on storage.objects;
create policy "renders_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "renders_storage_insert_own" on storage.objects;
create policy "renders_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "renders_storage_delete_own" on storage.objects;
create policy "renders_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'renders' and (storage.foldername(name))[1] = auth.uid()::text
  );
