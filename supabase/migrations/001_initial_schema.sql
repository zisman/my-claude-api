-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "pgcrypto";

-- ─── Organizations ────────────────────────────────────────────────────────────

create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  logo_url text,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'enterprise')),
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── User Profiles ────────────────────────────────────────────────────────────

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'analyst' check (role in ('owner', 'admin', 'manager', 'analyst', 'viewer')),
  is_active boolean not null default true,
  last_seen_at timestamptz,
  preferences jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Clients ─────────────────────────────────────────────────────────────────

create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  industry text,
  website text,
  logo_url text,
  monthly_budget numeric(14, 2),
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  account_manager_id uuid references public.user_profiles(id) on delete set null,
  tags text[] not null default '{}',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Platform Connections ─────────────────────────────────────────────────────

create table public.platform_connections (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null check (platform in ('google_ads', 'meta_ads', 'linkedin_ads', 'ga4')),
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error', 'pending')),
  account_id text,
  account_name text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}',
  last_sync_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, platform)
);

-- ─── Campaigns ────────────────────────────────────────────────────────────────

create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform_connection_id uuid not null references public.platform_connections(id) on delete cascade,
  platform text not null check (platform in ('google_ads', 'meta_ads', 'linkedin_ads', 'ga4')),
  platform_campaign_id text not null,
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'ended', 'draft', 'error')),
  objective text,
  start_date date,
  end_date date,
  daily_budget numeric(14, 2),
  total_budget numeric(14, 2),
  currency text not null default 'USD',
  target_locations text[] not null default '{}',
  target_languages text[] not null default '{}',
  platform_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform_connection_id, platform_campaign_id)
);

-- ─── Campaign Metrics (aggregated) ───────────────────────────────────────────

create table public.campaign_metrics (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  date date not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  spend numeric(14, 4) not null default 0,
  conversions numeric(14, 4) not null default 0,
  conversion_value numeric(14, 4) not null default 0,
  ctr numeric(10, 6) not null default 0,
  cpc numeric(14, 4) not null default 0,
  cpm numeric(14, 4) not null default 0,
  roas numeric(10, 4),
  quality_score numeric(4, 2),
  platform_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, date)
);

create index idx_campaign_metrics_campaign_date on public.campaign_metrics(campaign_id, date desc);
create index idx_campaign_metrics_date on public.campaign_metrics(date desc);

-- ─── Daily Performance ────────────────────────────────────────────────────────

create table public.daily_performance (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  spend numeric(14, 4) not null default 0,
  conversions numeric(14, 4) not null default 0,
  conversion_value numeric(14, 4) not null default 0,
  ctr numeric(10, 6) not null default 0,
  cpc numeric(14, 4) not null default 0,
  cpm numeric(14, 4) not null default 0,
  roas numeric(10, 4),
  created_at timestamptz not null default now(),
  unique (campaign_id, date)
);

create index idx_daily_perf_client_date on public.daily_performance(client_id, date desc);
create index idx_daily_perf_campaign_date on public.daily_performance(campaign_id, date desc);

-- ─── Budget Tracking ─────────────────────────────────────────────────────────

create table public.budget_tracking (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  budgeted_amount numeric(14, 2) not null default 0,
  spent_amount numeric(14, 4) not null default 0,
  projected_spend numeric(14, 4) not null default 0,
  pacing_rate numeric(6, 4) not null default 0,
  currency text not null default 'USD',
  updated_at timestamptz not null default now(),
  unique (campaign_id, period_start)
);

-- ─── Health Scores ────────────────────────────────────────────────────────────

create table public.health_scores (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  components jsonb not null default '{}',
  trend text not null default 'stable' check (trend in ('improving', 'stable', 'declining')),
  calculated_at timestamptz not null default now()
);

create index idx_health_scores_campaign on public.health_scores(campaign_id, calculated_at desc);

-- ─── Alerts ──────────────────────────────────────────────────────────────────

create table public.alerts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'suppressed')),
  type text not null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}',
  acknowledged_by uuid references public.user_profiles(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_alerts_org_status on public.alerts(organization_id, status, created_at desc);
create index idx_alerts_client on public.alerts(client_id, status);

-- ─── AI Insights ──────────────────────────────────────────────────────────────

create table public.ai_insights (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  type text not null check (type in ('performance', 'anomaly', 'opportunity', 'risk', 'trend')),
  title text not null,
  summary text not null,
  details text not null,
  data_points jsonb not null default '{}',
  confidence numeric(5, 4) not null check (confidence >= 0 and confidence <= 1),
  is_read boolean not null default false,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_ai_insights_org on public.ai_insights(organization_id, is_read, created_at desc);

-- ─── AI Recommendations ──────────────────────────────────────────────────────

create table public.ai_recommendations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  priority text not null check (priority in ('critical', 'high', 'medium', 'low')),
  title text not null,
  description text not null,
  expected_impact text not null,
  implementation_steps text[] not null default '{}',
  estimated_lift numeric(6, 4),
  is_dismissed boolean not null default false,
  is_implemented boolean not null default false,
  implemented_at timestamptz,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ─── Tasks ────────────────────────────────────────────────────────────────────

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  assigned_to uuid references public.user_profiles(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  due_date date,
  completed_at timestamptz,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_org_status on public.tasks(organization_id, status, created_at desc);
create index idx_tasks_assigned on public.tasks(assigned_to, status);

-- ─── Reports ─────────────────────────────────────────────────────────────────

create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'generating', 'ready', 'failed')),
  type text not null check (type in ('performance', 'budget', 'competitive', 'custom')),
  date_range_start date not null,
  date_range_end date not null,
  platforms text[] not null default '{}',
  campaign_ids uuid[] not null default '{}',
  config jsonb not null default '{}',
  file_url text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Sync Job Logs ────────────────────────────────────────────────────────────

create table public.sync_job_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform_connection_id uuid not null references public.platform_connections(id) on delete cascade,
  job_type text not null check (job_type in ('full', 'incremental', 'campaigns', 'metrics')),
  status text not null default 'pending' check (status in ('pending', 'running', 'success', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_synced integer not null default 0,
  records_failed integer not null default 0,
  error_summary text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_sync_logs_connection on public.sync_job_logs(platform_connection_id, started_at desc);

-- ─── API Errors ───────────────────────────────────────────────────────────────

create table public.api_errors (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform_connection_id uuid references public.platform_connections(id) on delete cascade,
  endpoint text not null,
  error_code text,
  error_message text not null,
  request_payload jsonb,
  response_body jsonb,
  retry_count integer not null default 0,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Updated At Trigger ───────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.platform_connections for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.campaign_metrics for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.alerts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reports for each row execute function public.set_updated_at();
