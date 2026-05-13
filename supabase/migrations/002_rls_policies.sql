-- Row Level Security Policies
-- All tables are scoped to organization_id from the user's profile

alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.clients enable row level security;
alter table public.platform_connections enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_metrics enable row level security;
alter table public.daily_performance enable row level security;
alter table public.budget_tracking enable row level security;
alter table public.health_scores enable row level security;
alter table public.alerts enable row level security;
alter table public.ai_insights enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.tasks enable row level security;
alter table public.reports enable row level security;
alter table public.sync_job_logs enable row level security;
alter table public.api_errors enable row level security;

-- Helper to get current user's organization_id
create or replace function public.current_org_id()
returns uuid as $$
  select organization_id from public.user_profiles where id = auth.uid()
$$ language sql security definer stable;

-- Helper to check user role
create or replace function public.current_user_role()
returns text as $$
  select role from public.user_profiles where id = auth.uid()
$$ language sql security definer stable;

-- Organizations: users can only see their own org
create policy "org_select" on public.organizations for select
  using (id = public.current_org_id());

create policy "org_update" on public.organizations for update
  using (id = public.current_org_id() and public.current_user_role() in ('owner', 'admin'));

-- User Profiles
create policy "profile_select" on public.user_profiles for select
  using (organization_id = public.current_org_id());

create policy "profile_update_own" on public.user_profiles for update
  using (id = auth.uid());

create policy "profile_update_admin" on public.user_profiles for update
  using (organization_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin'));

-- Clients
create policy "clients_select" on public.clients for select
  using (organization_id = public.current_org_id());

create policy "clients_insert" on public.clients for insert
  with check (organization_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'manager'));

create policy "clients_update" on public.clients for update
  using (organization_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'manager'));

create policy "clients_delete" on public.clients for delete
  using (organization_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin'));

-- Platform Connections
create policy "connections_select" on public.platform_connections for select
  using (organization_id = public.current_org_id());

create policy "connections_insert" on public.platform_connections for insert
  with check (organization_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'manager'));

create policy "connections_update" on public.platform_connections for update
  using (organization_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'manager'));

create policy "connections_delete" on public.platform_connections for delete
  using (organization_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin'));

-- Campaigns
create policy "campaigns_select" on public.campaigns for select
  using (organization_id = public.current_org_id());

create policy "campaigns_insert" on public.campaigns for insert
  with check (organization_id = public.current_org_id());

create policy "campaigns_update" on public.campaigns for update
  using (organization_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'manager'));

-- Campaign Metrics (read-only for users, written by sync jobs via service role)
create policy "metrics_select" on public.campaign_metrics for select
  using (exists (
    select 1 from public.campaigns c where c.id = campaign_id and c.organization_id = public.current_org_id()
  ));

-- Daily Performance
create policy "daily_perf_select" on public.daily_performance for select
  using (client_id in (select id from public.clients where organization_id = public.current_org_id()));

-- Budget Tracking
create policy "budget_select" on public.budget_tracking for select
  using (client_id in (select id from public.clients where organization_id = public.current_org_id()));

-- Health Scores
create policy "health_select" on public.health_scores for select
  using (campaign_id in (select id from public.campaigns where organization_id = public.current_org_id()));

-- Alerts
create policy "alerts_select" on public.alerts for select
  using (organization_id = public.current_org_id());

create policy "alerts_update" on public.alerts for update
  using (organization_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'manager', 'analyst'));

-- AI Insights
create policy "insights_select" on public.ai_insights for select
  using (organization_id = public.current_org_id());

create policy "insights_update" on public.ai_insights for update
  using (organization_id = public.current_org_id());

-- AI Recommendations
create policy "recommendations_select" on public.ai_recommendations for select
  using (organization_id = public.current_org_id());

create policy "recommendations_update" on public.ai_recommendations for update
  using (organization_id = public.current_org_id());

-- Tasks
create policy "tasks_select" on public.tasks for select
  using (organization_id = public.current_org_id());

create policy "tasks_insert" on public.tasks for insert
  with check (organization_id = public.current_org_id() and created_by = auth.uid());

create policy "tasks_update" on public.tasks for update
  using (organization_id = public.current_org_id() and (
    created_by = auth.uid() or assigned_to = auth.uid() or public.current_user_role() in ('owner', 'admin', 'manager')
  ));

-- Reports
create policy "reports_select" on public.reports for select
  using (organization_id = public.current_org_id());

create policy "reports_insert" on public.reports for insert
  with check (organization_id = public.current_org_id() and created_by = auth.uid());

-- Sync Job Logs
create policy "sync_logs_select" on public.sync_job_logs for select
  using (organization_id = public.current_org_id());

-- API Errors
create policy "api_errors_select" on public.api_errors for select
  using (organization_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin'));
