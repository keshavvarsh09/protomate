-- =====================================================================
-- COMET VIDEO PIPELINE - SUPABASE SCHEMA
-- run this in the Supabase dashboard: SQL Editor -> New query -> Run.
-- =====================================================================

create extension if not exists "pgcrypto";

-- projects -------------------------------------------------------------
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  status        text not null default 'pending',   -- pending|running|paused|done|failed
  current_stage text not null default 'script',    -- script|scenes|images|voice|captions|render|export
  total_cost    numeric not null default 0,
  budget_cap    numeric not null default 2.0,
  thumbnail_url text,
  -- pipeline inputs so the worker can run it:
  script_text   text,
  topic         text,
  style         text,
  layout        text default 'fullscreen',
  caption_style text default '2',
  font_style    text default 'opensans',
  highlight     text default 'blue',
  fps           int default 30,
  zoom_total    numeric default 0.06,
  image_source  text default 'zimage_hosted',
  hosted_provider text default 'wavespeed',
  created_at    timestamptz not null default now()
);

-- scenes ---------------------------------------------------------------
create table if not exists scenes (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  order_index    int not null,
  narration      text not null default '',
  visual_prompt  text not null default '',
  image_url      text,
  image_provider text,
  image_status   text not null default 'pending',  -- pending|running|done|failed
  error_msg      text,
  cost           numeric not null default 0,
  start_time     numeric,
  end_time       numeric,
  created_at     timestamptz not null default now()
);
create index if not exists scenes_project_idx on scenes(project_id, order_index);

-- logs (live feed) -----------------------------------------------------
create table if not exists logs (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  level      text not null default 'info',         -- ok|err|run|info
  message    text not null,
  created_at timestamptz not null default now()
);
create index if not exists logs_project_idx on logs(project_id, created_at);

-- cost ledger (audit trail - this is what catches over-charging) --------
create table if not exists costs (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  provider   text not null,
  amount     numeric not null,
  ref_id     text,                                  -- e.g. prediction id
  created_at timestamptz not null default now()
);

-- provider status (read by the settings screen) ------------------------
create table if not exists provider_status (
  provider      text primary key,
  label         text not null,
  has_key       boolean not null default false,
  balance_text  text,
  balance_state text default 'unknown'             -- good|low|expired|unknown
);

-- turn on realtime so the UI updates live without a websocket server ----
alter publication supabase_realtime add table scenes;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table logs;

-- NOTE on keys/security:
-- do NOT store provider API keys in this database for a public app.
-- keep them in the worker's local .env (the gpu box). this table only
-- holds whether a key exists and its balance text, never the key value.
