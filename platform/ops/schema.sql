-- CRM Ops Desk — Schema
-- Rodar no SQL Editor do Supabase

-- Tabela de usuários (squad + stakeholders)
create table if not exists ops_users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  name         text not null,
  role         text not null check (role in ('squad', 'stakeholder')),
  bu           text,
  created_at   timestamptz default now()
);

-- Tabela de tasks
create table if not exists ops_tasks (
  id                    uuid primary key default gen_random_uuid(),
  protocol              text unique not null,
  title                 text not null,
  type                  text not null,
  description           text,
  bu                    text not null,
  links                 text[] default '{}',
  status                text not null default 'recebida'
                        check (status in ('recebida','em_analise','em_execucao','concluida','cancelada')),
  priority_score        int,
  priority_label        text default 'Pendente',
  priority_justification text,
  ai_suggested_deadline date,
  ai_suggested_profile  text,
  requested_deadline    date,
  is_deadline_flexible  bool default false,
  consequences_of_delay text,
  is_campaign_linked    bool default false,
  campaign_linked       text,
  is_recurrent          bool default false,
  impact_type           text,
  requester_name        text not null,
  requester_email       text not null,
  assigned_to           uuid references ops_users(id),
  assignee_name         text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Tabela de anexos
create table if not exists ops_attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid references ops_tasks(id) on delete cascade not null,
  filename     text not null,
  storage_path text not null,
  file_size    int,
  uploaded_by  text,
  created_at   timestamptz default now()
);

-- Tabela de registro de tempo
create table if not exists ops_time_entries (
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid references ops_tasks(id) on delete cascade not null,
  user_id          uuid references ops_users(id),
  user_name        text,
  started_at       timestamptz not null,
  ended_at         timestamptz,
  duration_minutes int,
  note             text,
  created_at       timestamptz default now()
);

-- Trigger: atualiza updated_at automaticamente
create or replace function ops_update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger ops_tasks_updated_at
  before update on ops_tasks
  for each row execute function ops_update_updated_at();

-- RLS: habilitado, mas acesso via service_role_key no backend (bypassa RLS)
alter table ops_tasks        enable row level security;
alter table ops_attachments  enable row level security;
alter table ops_time_entries enable row level security;
alter table ops_users        enable row level security;

-- Notas internas da squad (visíveis apenas no painel interno)
alter table ops_tasks add column if not exists internal_notes text;

-- Campos adicionados na v2 do formulário de stakeholders
alter table ops_tasks add column if not exists bu_subdivision text;
alter table ops_tasks add column if not exists urgency_level int check (urgency_level between 1 and 5);
alter table ops_tasks add column if not exists urgency_details text;

-- --------------------------------------------------------
-- APÓS rodar o SQL, criar o bucket no Supabase Dashboard:
-- Storage → New bucket → nome: "ops-attachments" → Private
-- --------------------------------------------------------
