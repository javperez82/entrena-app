-- ===== ENTRENA · Esquema Supabase =====
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run

create table if not exists sesiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  fecha date not null,
  dia text not null,            -- torso_a | pierna_a | torso_b | pierna_b | caminata
  semana int,
  completada boolean default false,
  created_at timestamptz default now()
);

create table if not exists series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  sesion_id uuid references sesiones(id) on delete cascade,
  ejercicio text not null,      -- slug del catálogo
  serie int not null,
  peso numeric not null,
  reps int not null,
  created_at timestamptz default now()
);

create table if not exists metricas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  fecha date not null,
  peso numeric not null,
  cintura numeric,
  ta_sis int,
  ta_dia int,
  notas text,
  created_at timestamptz default now()
);

create table if not exists tomas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  fecha date not null,
  med text not null,
  created_at timestamptz default now()
);

create table if not exists inyecciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  fecha date not null,
  tipo text not null,           -- mounjaro | testosterona
  created_at timestamptz default now()
);

create table if not exists meditaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  fecha date not null,
  tipo text,
  minutos numeric,
  created_at timestamptz default now()
);

create table if not exists enlaces_meditacion (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  titulo text not null,
  url text not null,
  created_at timestamptz default now()
);

-- ===== RLS: cada usuario solo ve y toca lo suyo =====
do $$
declare t text;
begin
  foreach t in array array['sesiones','series','metricas','tomas','inyecciones','meditaciones','enlaces_meditacion']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "propio_%s" on %I', t, t);
    execute format('create policy "propio_%s" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
  end loop;
end $$;
