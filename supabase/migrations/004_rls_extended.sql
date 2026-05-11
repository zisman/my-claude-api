-- ============================================================
-- AdPilot — Extended RLS Policies
-- Migration: 004_rls_extended.sql
-- ============================================================
-- Applies Row Level Security to every table in the extended
-- schema. Strategy:
--   SELECT  — organization isolation via current_org_id()
--   INSERT  — organization isolation + role check
--   UPDATE  — organization isolation + role check
--   DELETE  — organization isolation + elevated role only
--
-- Client-scoped tables additionally respect client_users grants
-- via user_can_access_client().
--
-- Audit logs and sync logs are append-only from the application
-- layer; deletion is owner-only (or blocked entirely).
-- ============================================================

-- ── Helpers ──────────────────────────────────────────────────
-- is_at_least(required) → true if user's role >= required
create or replace function public.is_at_least(required text)
returns boolean language sql security definer stable as $$
  select case required
    when 'viewer'  then public.current_user_role() in ('owner','admin','manager','analyst','viewer')
    when 'analyst' then public.current_user_role() in ('owner','admin','manager','analyst')
    when 'manager' then public.current_user_role() in ('owner','admin','manager')
    when 'admin'   then public.current_user_role() in ('owner','admin')
    when 'owner'   then public.current_user_role() = 'owner'
    else false
  end
$$;

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================

alter table public.organizations enable row level security;

create policy "org_select"
  on public.organizations for select
  using (id = public.current_org_id());

create policy "org_update"
  on public.organizations for update
  using (id = public.current_org_id() and public.is_at_least('admin'));

-- No insert/delete via application (handled by onboarding Edge Function)

-- ============================================================
-- 2. USER PROFILES
-- ============================================================

alter table public.user_profiles enable row level security;

create policy "profiles_select"
  on public.user_profiles for select
  using (organization_id = public.current_org_id());

create policy "profiles_update_own"
  on public.user_profiles for update
  using (id = auth.uid());

create policy "profiles_update_admin"
  on public.user_profiles for update
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

create policy "profiles_insert"
  on public.user_profiles for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('admin'));

-- ============================================================
-- 3. ORGANIZATION USERS
-- ============================================================

alter table public.organization_users enable row level security;

create policy "org_users_select"
  on public.organization_users for select
  using (organization_id = public.current_org_id());

create policy "org_users_insert"
  on public.organization_users for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('admin'));

create policy "org_users_update"
  on public.organization_users for update
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

create policy "org_users_delete"
  on public.organization_users for delete
  using (organization_id = public.current_org_id() and public.is_at_least('owner'));

-- ============================================================
-- 4. CLIENTS
-- ============================================================

alter table public.clients enable row level security;

create policy "clients_select"
  on public.clients for select
  using (public.user_can_access_client(id));

create policy "clients_insert"
  on public.clients for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('manager'));

create policy "clients_update"
  on public.clients for update
  using (public.user_can_access_client(id) and public.is_at_least('manager'));

create policy "clients_delete"
  on public.clients for delete
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

-- ============================================================
-- 5. CLIENT USERS
-- ============================================================

alter table public.client_users enable row level security;

create policy "client_users_select"
  on public.client_users for select
  using (organization_id = public.current_org_id());

create policy "client_users_insert"
  on public.client_users for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('manager'));

create policy "client_users_update"
  on public.client_users for update
  using (organization_id = public.current_org_id() and public.is_at_least('manager'));

create policy "client_users_delete"
  on public.client_users for delete
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

-- ============================================================
-- 6. PLATFORM CONNECTIONS
-- ============================================================

alter table public.platform_connections enable row level security;

create policy "connections_select"
  on public.platform_connections for select
  using (public.user_can_access_client(client_id));

create policy "connections_insert"
  on public.platform_connections for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('manager'));

create policy "connections_update"
  on public.platform_connections for update
  using (public.user_can_access_client(client_id) and public.is_at_least('manager'));

create policy "connections_delete"
  on public.platform_connections for delete
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

-- ============================================================
-- 7. PLATFORM ACCOUNTS
-- ============================================================

alter table public.platform_accounts enable row level security;

create policy "accounts_select"
  on public.platform_accounts for select
  using (public.user_can_access_client(client_id));

create policy "accounts_insert"
  on public.platform_accounts for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('manager'));

create policy "accounts_update"
  on public.platform_accounts for update
  using (public.user_can_access_client(client_id) and public.is_at_least('manager'));

create policy "accounts_delete"
  on public.platform_accounts for delete
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

-- ============================================================
-- 8. CAMPAIGNS
-- ============================================================

alter table public.campaigns enable row level security;

create policy "campaigns_select"
  on public.campaigns for select
  using (public.user_can_access_client(client_id));

-- Campaigns are created by sync jobs (service role) or managers
create policy "campaigns_insert"
  on public.campaigns for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('manager'));

create policy "campaigns_update"
  on public.campaigns for update
  using (public.user_can_access_client(client_id) and public.is_at_least('manager'));

create policy "campaigns_delete"
  on public.campaigns for delete
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

-- ============================================================
-- 9. CAMPAIGN GROUPS
-- ============================================================

alter table public.campaign_groups enable row level security;

create policy "cg_select"
  on public.campaign_groups for select
  using (public.user_can_access_client(client_id));

create policy "cg_insert"
  on public.campaign_groups for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('analyst'));

create policy "cg_update"
  on public.campaign_groups for update
  using (public.user_can_access_client(client_id) and public.is_at_least('analyst'));

create policy "cg_delete"
  on public.campaign_groups for delete
  using (organization_id = public.current_org_id() and public.is_at_least('manager'));

alter table public.campaign_group_members enable row level security;

create policy "cgm_select"
  on public.campaign_group_members for select
  using (
    exists (
      select 1 from public.campaign_groups cg
      where cg.id = campaign_group_id
        and public.user_can_access_client(cg.client_id)
    )
  );

create policy "cgm_insert"
  on public.campaign_group_members for insert
  with check (
    exists (
      select 1 from public.campaign_groups cg
      where cg.id = campaign_group_id
        and cg.organization_id = public.current_org_id()
        and public.is_at_least('analyst')
    )
  );

create policy "cgm_delete"
  on public.campaign_group_members for delete
  using (
    exists (
      select 1 from public.campaign_groups cg
      where cg.id = campaign_group_id
        and cg.organization_id = public.current_org_id()
        and public.is_at_least('analyst')
    )
  );

-- ============================================================
-- 10. AD GROUPS
-- ============================================================

alter table public.ad_groups enable row level security;

create policy "adgroups_select"
  on public.ad_groups for select
  using (public.user_can_access_client(client_id));

create policy "adgroups_insert"
  on public.ad_groups for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('manager'));

create policy "adgroups_update"
  on public.ad_groups for update
  using (public.user_can_access_client(client_id) and public.is_at_least('manager'));

create policy "adgroups_delete"
  on public.ad_groups for delete
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

-- ============================================================
-- 11. ADS
-- ============================================================

alter table public.ads enable row level security;

create policy "ads_select"
  on public.ads for select
  using (public.user_can_access_client(client_id));

create policy "ads_insert"
  on public.ads for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('manager'));

create policy "ads_update"
  on public.ads for update
  using (public.user_can_access_client(client_id) and public.is_at_least('manager'));

create policy "ads_delete"
  on public.ads for delete
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

-- ============================================================
-- 12. CREATIVES
-- ============================================================

alter table public.creatives enable row level security;

create policy "creatives_select"
  on public.creatives for select
  using (public.user_can_access_client(client_id));

create policy "creatives_insert"
  on public.creatives for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('analyst'));

create policy "creatives_update"
  on public.creatives for update
  using (public.user_can_access_client(client_id) and public.is_at_least('analyst'));

create policy "creatives_delete"
  on public.creatives for delete
  using (organization_id = public.current_org_id() and public.is_at_least('manager'));

alter table public.ad_creatives enable row level security;

create policy "ad_creatives_select"
  on public.ad_creatives for select
  using (
    exists (
      select 1 from public.ads a
      where a.id = ad_id and public.user_can_access_client(a.client_id)
    )
  );

create policy "ad_creatives_insert"
  on public.ad_creatives for insert
  with check (
    exists (
      select 1 from public.ads a
      where a.id = ad_id
        and a.organization_id = public.current_org_id()
        and public.is_at_least('manager')
    )
  );

create policy "ad_creatives_delete"
  on public.ad_creatives for delete
  using (
    exists (
      select 1 from public.ads a
      where a.id = ad_id
        and a.organization_id = public.current_org_id()
        and public.is_at_least('manager')
    )
  );

-- ============================================================
-- 13. DAILY METRICS
-- ============================================================

-- Metrics are written by sync jobs via service role.
-- Users can only read metrics for clients they can access.
alter table public.daily_metrics enable row level security;

create policy "metrics_select"
  on public.daily_metrics for select
  using (public.user_can_access_client(client_id));

-- Insert/update via service role only (sync Edge Functions) — no user policies.
-- Analysts+ can query but not mutate.

-- ============================================================
-- 14. CONVERSION EVENTS
-- ============================================================

alter table public.conversion_events enable row level security;

create policy "conv_events_select"
  on public.conversion_events for select
  using (public.user_can_access_client(client_id));

-- ============================================================
-- 15. LANDING PAGES
-- ============================================================

alter table public.landing_pages enable row level security;

create policy "lp_select"
  on public.landing_pages for select
  using (public.user_can_access_client(client_id));

create policy "lp_insert"
  on public.landing_pages for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('analyst'));

create policy "lp_update"
  on public.landing_pages for update
  using (public.user_can_access_client(client_id) and public.is_at_least('analyst'));

create policy "lp_delete"
  on public.landing_pages for delete
  using (organization_id = public.current_org_id() and public.is_at_least('manager'));

alter table public.campaign_landing_pages enable row level security;

create policy "clp_select"
  on public.campaign_landing_pages for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and public.user_can_access_client(c.client_id)
    )
  );

create policy "clp_insert"
  on public.campaign_landing_pages for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.organization_id = public.current_org_id()
        and public.is_at_least('analyst')
    )
  );

create policy "clp_delete"
  on public.campaign_landing_pages for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and c.organization_id = public.current_org_id()
        and public.is_at_least('analyst')
    )
  );

-- ============================================================
-- 16. ALERTS
-- ============================================================

alter table public.alerts enable row level security;

create policy "alerts_select"
  on public.alerts for select
  using (
    organization_id = public.current_org_id()
    and (client_id is null or public.user_can_access_client(client_id))
  );

-- Alerts are created by the system (Edge Functions via service role)
-- Users can update status (acknowledge, resolve) but not insert.
create policy "alerts_update"
  on public.alerts for update
  using (
    organization_id = public.current_org_id()
    and public.is_at_least('analyst')
    and (client_id is null or public.user_can_access_client(client_id))
  );

create policy "alerts_delete"
  on public.alerts for delete
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

-- ============================================================
-- 17. TASKS
-- ============================================================

alter table public.tasks enable row level security;

create policy "tasks_select"
  on public.tasks for select
  using (
    organization_id = public.current_org_id()
    and (client_id is null or public.user_can_access_client(client_id))
  );

create policy "tasks_insert"
  on public.tasks for insert
  with check (
    organization_id = public.current_org_id()
    and created_by = auth.uid()
  );

create policy "tasks_update"
  on public.tasks for update
  using (
    organization_id = public.current_org_id()
    and (
      created_by = auth.uid()
      or assigned_to = auth.uid()
      or public.is_at_least('manager')
    )
  );

create policy "tasks_delete"
  on public.tasks for delete
  using (
    organization_id = public.current_org_id()
    and (created_by = auth.uid() or public.is_at_least('manager'))
  );

alter table public.task_comments enable row level security;

create policy "task_comments_select"
  on public.task_comments for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.organization_id = public.current_org_id()
    )
  );

create policy "task_comments_insert"
  on public.task_comments for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.organization_id = public.current_org_id()
    )
  );

create policy "task_comments_update"
  on public.task_comments for update
  using (user_id = auth.uid());

create policy "task_comments_delete"
  on public.task_comments for delete
  using (
    user_id = auth.uid()
    or public.is_at_least('manager')
  );

-- ============================================================
-- 18. AI INSIGHTS
-- ============================================================

alter table public.ai_insights enable row level security;

create policy "insights_select"
  on public.ai_insights for select
  using (
    organization_id = public.current_org_id()
    and (client_id is null or public.user_can_access_client(client_id))
  );

-- Written by service role; users can only mark as read/dismissed
create policy "insights_update"
  on public.ai_insights for update
  using (
    organization_id = public.current_org_id()
    and public.is_at_least('viewer')
  );

-- ============================================================
-- 19. RECOMMENDATIONS
-- ============================================================

alter table public.recommendations enable row level security;

create policy "recs_select"
  on public.recommendations for select
  using (
    organization_id = public.current_org_id()
    and (client_id is null or public.user_can_access_client(client_id))
  );

create policy "recs_update"
  on public.recommendations for update
  using (
    organization_id = public.current_org_id()
    and public.is_at_least('analyst')
  );

-- ============================================================
-- 20. REPORTS
-- ============================================================

alter table public.reports enable row level security;

create policy "reports_select"
  on public.reports for select
  using (
    organization_id = public.current_org_id()
    and (client_id is null or public.user_can_access_client(client_id))
  );

create policy "reports_insert"
  on public.reports for insert
  with check (
    organization_id = public.current_org_id()
    and created_by = auth.uid()
    and public.is_at_least('analyst')
  );

create policy "reports_update"
  on public.reports for update
  using (
    organization_id = public.current_org_id()
    and (created_by = auth.uid() or public.is_at_least('manager'))
  );

create policy "reports_delete"
  on public.reports for delete
  using (
    organization_id = public.current_org_id()
    and (created_by = auth.uid() or public.is_at_least('manager'))
  );

-- ============================================================
-- 21. SYNC JOBS
-- ============================================================

alter table public.sync_jobs enable row level security;

create policy "sync_jobs_select"
  on public.sync_jobs for select
  using (organization_id = public.current_org_id() and public.is_at_least('analyst'));

-- Sync jobs created by Edge Functions (service role); users can trigger manually
create policy "sync_jobs_insert"
  on public.sync_jobs for insert
  with check (organization_id = public.current_org_id() and public.is_at_least('manager'));

-- Only service role or admin can update (cancel) a sync job
create policy "sync_jobs_update"
  on public.sync_jobs for update
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

alter table public.sync_job_logs enable row level security;

create policy "sjl_select"
  on public.sync_job_logs for select
  using (organization_id = public.current_org_id() and public.is_at_least('analyst'));

-- Logs are append-only from service role; no user insert/update/delete policies

-- ============================================================
-- 22. AUDIT LOGS
-- ============================================================

alter table public.audit_logs enable row level security;

-- Audit logs are read-only for admins and owners; written only by service role
create policy "audit_select"
  on public.audit_logs for select
  using (organization_id = public.current_org_id() and public.is_at_least('admin'));

-- No insert/update/delete from user sessions; only service role writes audit logs

-- ============================================================
-- 23. HEALTH SCORES
-- ============================================================

alter table public.health_scores enable row level security;

create policy "health_select"
  on public.health_scores for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id
        and public.user_can_access_client(c.client_id)
    )
  );

-- Health scores written by scoring Edge Function via service role
