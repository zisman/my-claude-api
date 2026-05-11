-- ============================================================
-- AdPilot — Full Production Schema
-- Migration: 003_full_schema_extended.sql
-- ============================================================
-- Extends and supersedes the initial schema with the complete
-- entity graph: org hierarchy, platform accounts, ad structure,
-- granular metrics, audit trail, and scheduling infrastructure.
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";   -- for full-text search on names

-- ============================================================
-- SECTION 1: ORGANIZATIONS
-- ============================================================

create table if not exists public.organizations (
  id                  uuid        primary key default uuid_generate_v4(),
  name                text        not null,
  slug                text        not null unique,
  logo_url            text,
  plan                text        not null default 'starter'
                                  check (plan in ('starter','growth','enterprise','custom')),
  billing_email       text,
  billing_status      text        not null default 'active'
                                  check (billing_status in ('active','past_due','cancelled','trialing')),
  max_users           integer     not null default 5,
  max_clients         integer     not null default 10,
  trial_ends_at       timestamptz,
  settings            jsonb       not null default '{}',
  metadata            jsonb       not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.organizations is 'Top-level tenant. Every resource belongs to exactly one organization.';

-- ============================================================
-- SECTION 2: USER PROFILES & ORGANIZATION MEMBERSHIP
-- ============================================================

create table if not exists public.user_profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  organization_id     uuid        not null references public.organizations(id) on delete cascade,
  email               text        not null,
  full_name           text        not null default '',
  avatar_url          text,
  job_title           text,
  phone               text,
  is_active           boolean     not null default true,
  last_seen_at        timestamptz,
  preferences         jsonb       not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Separate membership table so one user could be in multiple orgs
-- (future-proof; currently organization_id on user_profiles is the primary tenancy)
create table if not exists public.organization_users (
  id                  uuid        primary key default uuid_generate_v4(),
  organization_id     uuid        not null references public.organizations(id) on delete cascade,
  user_id             uuid        not null references public.user_profiles(id) on delete cascade,
  role                text        not null default 'analyst'
                                  check (role in ('owner','admin','manager','analyst','viewer')),
  invited_by          uuid        references public.user_profiles(id) on delete set null,
  invited_at          timestamptz not null default now(),
  accepted_at         timestamptz,
  is_active           boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (organization_id, user_id)
);

comment on table public.organization_users is 'Role assignment for a user within an organization.';

create index if not exists idx_org_users_org     on public.organization_users(organization_id, is_active);
create index if not exists idx_org_users_user    on public.organization_users(user_id);

-- ============================================================
-- SECTION 3: CLIENTS & CLIENT ACCESS
-- ============================================================

create table if not exists public.clients (
  id                      uuid        primary key default uuid_generate_v4(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  name                    text        not null,
  slug                    text,
  industry                text,
  website                 text,
  logo_url                text,
  description             text,
  monthly_budget          numeric(14,2),
  annual_budget           numeric(14,2),
  currency                text        not null default 'USD',
  timezone                text        not null default 'UTC',
  billing_contact_name    text,
  billing_contact_email   text,
  account_manager_id      uuid        references public.user_profiles(id) on delete set null,
  contract_start          date,
  contract_end            date,
  status                  text        not null default 'active'
                                      check (status in ('active','paused','churned','prospect')),
  tags                    text[]      not null default '{}',
  notes                   text,
  is_active               boolean     not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists idx_clients_org          on public.clients(organization_id, is_active);
create index if not exists idx_clients_manager      on public.clients(account_manager_id);
create index if not exists idx_clients_name_trgm    on public.clients using gin(name gin_trgm_ops);

-- Granular per-client access control (overrides org-level role for specific clients)
create table if not exists public.client_users (
  id                  uuid        primary key default uuid_generate_v4(),
  client_id           uuid        not null references public.clients(id) on delete cascade,
  user_id             uuid        not null references public.user_profiles(id) on delete cascade,
  organization_id     uuid        not null references public.organizations(id) on delete cascade,
  role                text        not null default 'analyst'
                                  check (role in ('manager','analyst','viewer')),
  is_primary          boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (client_id, user_id)
);

create index if not exists idx_client_users_client   on public.client_users(client_id);
create index if not exists idx_client_users_user     on public.client_users(user_id);

-- ============================================================
-- SECTION 4: PLATFORM CONNECTIONS & ACCOUNTS
-- ============================================================

create table if not exists public.platform_connections (
  id                      uuid        primary key default uuid_generate_v4(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  client_id               uuid        not null references public.clients(id) on delete cascade,
  platform                text        not null
                                      check (platform in ('google_ads','meta_ads','linkedin_ads','ga4','tiktok_ads','bing_ads')),
  display_name            text,
  status                  text        not null default 'disconnected'
                                      check (status in ('connected','disconnected','error','pending','revoked')),
  oauth_state             text,
  access_token_encrypted  text,
  refresh_token_encrypted text,
  token_expires_at        timestamptz,
  scopes                  text[]      not null default '{}',
  sync_enabled            boolean     not null default true,
  last_synced_at          timestamptz,
  error_code              text,
  error_message           text,
  metadata                jsonb       not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (client_id, platform)
);

create index if not exists idx_conn_org             on public.platform_connections(organization_id, status);
create index if not exists idx_conn_client          on public.platform_connections(client_id, platform);

-- One connection can have multiple advertising accounts (e.g. a Google MCC with sub-accounts)
create table if not exists public.platform_accounts (
  id                      uuid        primary key default uuid_generate_v4(),
  platform_connection_id  uuid        not null references public.platform_connections(id) on delete cascade,
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  client_id               uuid        not null references public.clients(id) on delete cascade,
  platform                text        not null,
  account_id              text        not null,
  account_name            text,
  account_type            text,          -- 'standard', 'mcc', 'bm', 'agency'
  currency                text        not null default 'USD',
  timezone                text        not null default 'UTC',
  status                  text        not null default 'active'
                                      check (status in ('active','paused','suspended','closed')),
  is_primary              boolean     not null default false,
  metadata                jsonb       not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (platform_connection_id, account_id)
);

create index if not exists idx_accounts_conn        on public.platform_accounts(platform_connection_id);
create index if not exists idx_accounts_client      on public.platform_accounts(client_id, platform);

-- ============================================================
-- SECTION 5: CAMPAIGN HIERARCHY
-- ============================================================

create table if not exists public.campaigns (
  id                      uuid        primary key default uuid_generate_v4(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  client_id               uuid        not null references public.clients(id) on delete cascade,
  platform_connection_id  uuid        not null references public.platform_connections(id) on delete cascade,
  platform_account_id     uuid        references public.platform_accounts(id) on delete set null,
  platform                text        not null,
  platform_campaign_id    text        not null,
  name                    text        not null,
  status                  text        not null default 'active'
                                      check (status in ('active','paused','ended','draft','error','removed')),
  objective               text,
  campaign_type           text,          -- 'search','display','video','shopping','pmax','awareness'
  start_date              date,
  end_date                date,
  daily_budget            numeric(14,2),
  total_budget            numeric(14,2),
  currency                text        not null default 'USD',
  bidding_strategy        text,
  bid_amount              numeric(14,4),
  target_cpa              numeric(14,4),
  target_roas             numeric(10,4),
  target_locations        text[]      not null default '{}',
  target_languages        text[]      not null default '{}',
  target_devices          text[]      not null default '{}',
  platform_metadata       jsonb       not null default '{}',
  is_archived             boolean     not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (platform_connection_id, platform_campaign_id)
);

create index if not exists idx_campaigns_org         on public.campaigns(organization_id, status);
create index if not exists idx_campaigns_client      on public.campaigns(client_id, status);
create index if not exists idx_campaigns_account     on public.campaigns(platform_account_id);
create index if not exists idx_campaigns_name_trgm   on public.campaigns using gin(name gin_trgm_ops);

-- Campaign Groups: logical groupings across campaigns/platforms
create table if not exists public.campaign_groups (
  id                  uuid        primary key default uuid_generate_v4(),
  organization_id     uuid        not null references public.organizations(id) on delete cascade,
  client_id           uuid        not null references public.clients(id) on delete cascade,
  name                text        not null,
  description         text,
  color               text        default '#3b82f6',
  tags                text[]      not null default '{}',
  created_by          uuid        references public.user_profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.campaign_group_members (
  id                  uuid        primary key default uuid_generate_v4(),
  campaign_group_id   uuid        not null references public.campaign_groups(id) on delete cascade,
  campaign_id         uuid        not null references public.campaigns(id) on delete cascade,
  added_at            timestamptz not null default now(),
  unique (campaign_group_id, campaign_id)
);

create index if not exists idx_cg_members_group      on public.campaign_group_members(campaign_group_id);
create index if not exists idx_cg_members_campaign   on public.campaign_group_members(campaign_id);

-- Ad Groups
create table if not exists public.ad_groups (
  id                      uuid        primary key default uuid_generate_v4(),
  campaign_id             uuid        not null references public.campaigns(id) on delete cascade,
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  client_id               uuid        not null references public.clients(id) on delete cascade,
  platform                text        not null,
  platform_ad_group_id    text        not null,
  name                    text        not null,
  status                  text        not null default 'active'
                                      check (status in ('active','paused','removed','error')),
  bidding_strategy        text,
  bid_amount              numeric(14,4),
  target_cpa              numeric(14,4),
  target_roas             numeric(10,4),
  platform_metadata       jsonb       not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (campaign_id, platform_ad_group_id)
);

create index if not exists idx_adgroups_campaign     on public.ad_groups(campaign_id, status);
create index if not exists idx_adgroups_org          on public.ad_groups(organization_id);

-- Ads (individual ad units)
create table if not exists public.ads (
  id                      uuid        primary key default uuid_generate_v4(),
  ad_group_id             uuid        not null references public.ad_groups(id) on delete cascade,
  campaign_id             uuid        not null references public.campaigns(id) on delete cascade,
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  client_id               uuid        not null references public.clients(id) on delete cascade,
  platform                text        not null,
  platform_ad_id          text        not null,
  name                    text,
  status                  text        not null default 'active'
                                      check (status in ('active','paused','removed','disapproved','under_review')),
  ad_type                 text,          -- 'rsa','esa','dsa','display','video','carousel','story'
  headline_1              text,
  headline_2              text,
  headline_3              text,
  description_1           text,
  description_2           text,
  display_url             text,
  final_url               text,
  final_mobile_url        text,
  call_to_action          text,
  platform_metadata       jsonb       not null default '{}',
  approval_status         text,
  disapproval_reasons     text[],
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (ad_group_id, platform_ad_id)
);

create index if not exists idx_ads_adgroup           on public.ads(ad_group_id, status);
create index if not exists idx_ads_campaign          on public.ads(campaign_id);
create index if not exists idx_ads_org               on public.ads(organization_id);

-- ============================================================
-- SECTION 6: CREATIVES
-- ============================================================

create table if not exists public.creatives (
  id                  uuid        primary key default uuid_generate_v4(),
  organization_id     uuid        not null references public.organizations(id) on delete cascade,
  client_id           uuid        not null references public.clients(id) on delete cascade,
  name                text        not null,
  type                text        not null
                                  check (type in ('image','video','html5','text','logo','carousel_card')),
  file_url            text,
  thumbnail_url       text,
  width_px            integer,
  height_px           integer,
  file_size_bytes     bigint,
  duration_seconds    numeric(8,2),
  mime_type           text,
  alt_text            text,
  tags                text[]      not null default '{}',
  is_archived         boolean     not null default false,
  metadata            jsonb       not null default '{}',
  uploaded_by         uuid        references public.user_profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_creatives_org         on public.creatives(organization_id, is_archived);
create index if not exists idx_creatives_client      on public.creatives(client_id);

-- Join: which creatives are used by which ads
create table if not exists public.ad_creatives (
  id                  uuid        primary key default uuid_generate_v4(),
  ad_id               uuid        not null references public.ads(id) on delete cascade,
  creative_id         uuid        not null references public.creatives(id) on delete cascade,
  position            integer     not null default 0,
  created_at          timestamptz not null default now(),
  unique (ad_id, creative_id)
);

create index if not exists idx_ad_creatives_ad       on public.ad_creatives(ad_id);
create index if not exists idx_ad_creatives_creative on public.ad_creatives(creative_id);

-- ============================================================
-- SECTION 7: METRICS
-- ============================================================

-- Primary metrics table — one row per (entity, date).
-- ad_group_id and ad_id are nullable so the same table covers
-- campaign-level, ad-group-level, and ad-level granularity.
create table if not exists public.daily_metrics (
  id                      uuid        primary key default uuid_generate_v4(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  client_id               uuid        not null references public.clients(id) on delete cascade,
  platform_account_id     uuid        references public.platform_accounts(id) on delete cascade,
  campaign_id             uuid        not null references public.campaigns(id) on delete cascade,
  ad_group_id             uuid        references public.ad_groups(id) on delete cascade,
  ad_id                   uuid        references public.ads(id) on delete cascade,
  platform                text        not null,
  date                    date        not null,
  -- Volume
  impressions             bigint      not null default 0,
  clicks                  bigint      not null default 0,
  spend                   numeric(14,4) not null default 0,
  conversions             numeric(14,4) not null default 0,
  conversion_value        numeric(14,4) not null default 0,
  -- Video
  video_views             bigint      not null default 0,
  video_view_rate         numeric(10,6) not null default 0,
  video_completions       bigint      not null default 0,
  video_completion_rate   numeric(10,6) not null default 0,
  -- Reach
  reach                   bigint      not null default 0,
  frequency               numeric(10,4) not null default 0,
  -- Derived (stored for query performance)
  ctr                     numeric(10,6) not null default 0,
  cpc                     numeric(14,4) not null default 0,
  cpm                     numeric(14,4) not null default 0,
  cpa                     numeric(14,4),
  roas                    numeric(10,4),
  -- Quality
  quality_score           numeric(4,2),
  impression_share        numeric(6,4),
  lost_is_budget          numeric(6,4),
  lost_is_rank            numeric(6,4),
  -- Raw platform data for forward-compat
  platform_data           jsonb       not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- Unique per (campaign, optional ad_group, optional ad, date)
  unique nulls not distinct (campaign_id, ad_group_id, ad_id, date)
);

create index if not exists idx_dm_campaign_date      on public.daily_metrics(campaign_id, date desc);
create index if not exists idx_dm_client_date        on public.daily_metrics(client_id, date desc);
create index if not exists idx_dm_org_date           on public.daily_metrics(organization_id, date desc);
create index if not exists idx_dm_adgroup_date       on public.daily_metrics(ad_group_id, date desc) where ad_group_id is not null;
create index if not exists idx_dm_ad_date            on public.daily_metrics(ad_id, date desc) where ad_id is not null;
create index if not exists idx_dm_platform_date      on public.daily_metrics(platform, date desc);

-- Conversion events: individual conversion records (if platform exposes them)
create table if not exists public.conversion_events (
  id                      uuid        primary key default uuid_generate_v4(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  client_id               uuid        not null references public.clients(id) on delete cascade,
  campaign_id             uuid        references public.campaigns(id) on delete cascade,
  ad_group_id             uuid        references public.ad_groups(id) on delete cascade,
  ad_id                   uuid        references public.ads(id) on delete cascade,
  platform                text        not null,
  platform_conversion_id  text,
  event_name              text        not null,
  event_category          text,          -- 'purchase','lead','signup','page_view','engagement'
  conversion_value        numeric(14,4),
  currency                text        not null default 'USD',
  attribution_window_days integer,
  occurred_at             timestamptz not null,
  platform_data           jsonb       not null default '{}',
  created_at              timestamptz not null default now()
);

create index if not exists idx_conv_client_date      on public.conversion_events(client_id, occurred_at desc);
create index if not exists idx_conv_campaign         on public.conversion_events(campaign_id, occurred_at desc);
create index if not exists idx_conv_event_name       on public.conversion_events(event_name, occurred_at desc);

-- ============================================================
-- SECTION 8: LANDING PAGES
-- ============================================================

create table if not exists public.landing_pages (
  id                      uuid        primary key default uuid_generate_v4(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  client_id               uuid        not null references public.clients(id) on delete cascade,
  url                     text        not null,
  name                    text,
  status                  text        not null default 'active'
                                      check (status in ('active','inactive','error')),
  -- Performance scores (populated by crawler/lighthouse)
  page_speed_score        numeric(5,2),
  mobile_score            numeric(5,2),
  seo_score               numeric(5,2),
  accessibility_score     numeric(5,2),
  -- Analytics (populated from GA4)
  conversion_rate         numeric(8,6),
  bounce_rate             numeric(8,6),
  avg_time_on_page_sec    numeric(10,2),
  sessions_30d            bigint,
  -- Metadata
  title                   text,
  meta_description        text,
  h1                      text,
  screenshot_url          text,
  last_crawled_at         timestamptz,
  crawl_error             text,
  metadata                jsonb       not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (client_id, url)
);

create index if not exists idx_lp_client             on public.landing_pages(client_id, status);
create index if not exists idx_lp_org                on public.landing_pages(organization_id);

-- Link campaigns → landing pages (many-to-many)
create table if not exists public.campaign_landing_pages (
  id                  uuid        primary key default uuid_generate_v4(),
  campaign_id         uuid        not null references public.campaigns(id) on delete cascade,
  landing_page_id     uuid        not null references public.landing_pages(id) on delete cascade,
  is_primary          boolean     not null default false,
  created_at          timestamptz not null default now(),
  unique (campaign_id, landing_page_id)
);

-- ============================================================
-- SECTION 9: ALERTS
-- ============================================================

create table if not exists public.alerts (
  id                      uuid        primary key default uuid_generate_v4(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  client_id               uuid        references public.clients(id) on delete cascade,
  campaign_id             uuid        references public.campaigns(id) on delete cascade,
  ad_group_id             uuid        references public.ad_groups(id) on delete cascade,
  platform_account_id     uuid        references public.platform_accounts(id) on delete cascade,
  severity                text        not null check (severity in ('critical','high','medium','low','info')),
  status                  text        not null default 'open'
                                      check (status in ('open','acknowledged','resolved','suppressed')),
  type                    text        not null,  -- 'budget_pacing','ctr_drop','spend_spike','quality_score','sync_error'
  category                text        not null default 'performance'
                                      check (category in ('budget','performance','technical','billing','compliance')),
  title                   text        not null,
  message                 text        not null,
  -- Threshold context for programmatic alerts
  threshold_metric        text,
  threshold_value         numeric(20,6),
  actual_value            numeric(20,6),
  auto_resolve            boolean     not null default false,
  metadata                jsonb       not null default '{}',
  acknowledged_by         uuid        references public.user_profiles(id) on delete set null,
  acknowledged_at         timestamptz,
  resolved_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_alerts_org_status     on public.alerts(organization_id, status, severity, created_at desc);
create index if not exists idx_alerts_client         on public.alerts(client_id, status);
create index if not exists idx_alerts_campaign       on public.alerts(campaign_id, status);

-- ============================================================
-- SECTION 10: TASKS
-- ============================================================

create table if not exists public.tasks (
  id                  uuid        primary key default uuid_generate_v4(),
  organization_id     uuid        not null references public.organizations(id) on delete cascade,
  client_id           uuid        references public.clients(id) on delete cascade,
  campaign_id         uuid        references public.campaigns(id) on delete cascade,
  parent_task_id      uuid        references public.tasks(id) on delete cascade,
  created_by          uuid        not null references public.user_profiles(id) on delete restrict,
  assigned_to         uuid        references public.user_profiles(id) on delete set null,
  title               text        not null,
  description         text,
  status              text        not null default 'todo'
                                  check (status in ('todo','in_progress','in_review','done','cancelled')),
  priority            text        not null default 'medium'
                                  check (priority in ('urgent','high','medium','low')),
  due_date            date,
  estimated_hours     numeric(6,2),
  actual_hours        numeric(6,2),
  completed_at        timestamptz,
  recurrence          text,          -- cron expression or null
  tags                text[]      not null default '{}',
  metadata            jsonb       not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_tasks_org_status      on public.tasks(organization_id, status, created_at desc);
create index if not exists idx_tasks_assigned        on public.tasks(assigned_to, status);
create index if not exists idx_tasks_client          on public.tasks(client_id, status);
create index if not exists idx_tasks_parent          on public.tasks(parent_task_id) where parent_task_id is not null;

-- Task comments
create table if not exists public.task_comments (
  id                  uuid        primary key default uuid_generate_v4(),
  task_id             uuid        not null references public.tasks(id) on delete cascade,
  user_id             uuid        not null references public.user_profiles(id) on delete cascade,
  body                text        not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_task_comments_task    on public.task_comments(task_id, created_at desc);

-- ============================================================
-- SECTION 11: AI INSIGHTS & RECOMMENDATIONS
-- ============================================================

create table if not exists public.ai_insights (
  id                  uuid        primary key default uuid_generate_v4(),
  organization_id     uuid        not null references public.organizations(id) on delete cascade,
  client_id           uuid        references public.clients(id) on delete cascade,
  campaign_id         uuid        references public.campaigns(id) on delete cascade,
  ad_group_id         uuid        references public.ad_groups(id) on delete cascade,
  type                text        not null
                                  check (type in ('performance','anomaly','opportunity','risk','trend','competitive')),
  title               text        not null,
  summary             text        not null,
  details             text        not null,
  data_points         jsonb       not null default '{}',
  confidence          numeric(5,4) not null check (confidence between 0 and 1),
  model_version       text,          -- 'claude-opus-4-7' etc.
  is_read             boolean     not null default false,
  is_dismissed        boolean     not null default false,
  generated_at        timestamptz not null default now(),
  expires_at          timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists idx_insights_org          on public.ai_insights(organization_id, is_read, is_dismissed, created_at desc);
create index if not exists idx_insights_client       on public.ai_insights(client_id, created_at desc);
create index if not exists idx_insights_campaign     on public.ai_insights(campaign_id, created_at desc);

create table if not exists public.recommendations (
  id                      uuid        primary key default uuid_generate_v4(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  client_id               uuid        references public.clients(id) on delete cascade,
  campaign_id             uuid        references public.campaigns(id) on delete cascade,
  ad_group_id             uuid        references public.ad_groups(id) on delete cascade,
  ai_insight_id           uuid        references public.ai_insights(id) on delete set null,
  priority                text        not null check (priority in ('critical','high','medium','low')),
  category                text        not null default 'performance'
                                      check (category in ('budget','bidding','targeting','creative','landing_page','structure','performance')),
  title                   text        not null,
  description             text        not null,
  expected_impact         text        not null,
  implementation_steps    text[]      not null default '{}',
  estimated_lift          numeric(6,4),
  estimated_lift_unit     text,          -- 'roas_x','cpa_pct','ctr_pct','conversions_pct'
  effort_level            text        default 'medium' check (effort_level in ('low','medium','high')),
  model_version           text,
  is_dismissed            boolean     not null default false,
  is_implemented          boolean     not null default false,
  dismissed_at            timestamptz,
  implemented_at          timestamptz,
  implemented_by          uuid        references public.user_profiles(id) on delete set null,
  generated_at            timestamptz not null default now(),
  expires_at              timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists idx_recs_org              on public.recommendations(organization_id, is_dismissed, is_implemented, priority, created_at desc);
create index if not exists idx_recs_client           on public.recommendations(client_id, is_dismissed, is_implemented);

-- ============================================================
-- SECTION 12: REPORTS
-- ============================================================

create table if not exists public.reports (
  id                  uuid        primary key default uuid_generate_v4(),
  organization_id     uuid        not null references public.organizations(id) on delete cascade,
  client_id           uuid        references public.clients(id) on delete cascade,
  created_by          uuid        not null references public.user_profiles(id) on delete restrict,
  title               text        not null,
  description         text,
  status              text        not null default 'pending'
                                  check (status in ('pending','generating','ready','failed')),
  type                text        not null
                                  check (type in ('performance','budget','creative','competitive','executive','custom')),
  format              text        not null default 'pdf'
                                  check (format in ('pdf','csv','xlsx','html','json')),
  date_range_start    date        not null,
  date_range_end      date        not null,
  platforms           text[]      not null default '{}',
  campaign_ids        uuid[]      not null default '{}',
  campaign_group_ids  uuid[]      not null default '{}',
  include_ad_groups   boolean     not null default false,
  include_ads         boolean     not null default false,
  config              jsonb       not null default '{}',
  file_url            text,
  file_size_bytes     bigint,
  generated_at        timestamptz,
  -- Scheduling
  is_scheduled        boolean     not null default false,
  schedule_cron       text,          -- '0 9 * * 1' = every Monday 9am
  schedule_timezone   text        default 'UTC',
  next_run_at         timestamptz,
  last_run_at         timestamptz,
  recipients          text[]      not null default '{}',   -- email addresses
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_reports_org           on public.reports(organization_id, created_at desc);
create index if not exists idx_reports_client        on public.reports(client_id);
create index if not exists idx_reports_scheduled     on public.reports(is_scheduled, next_run_at) where is_scheduled = true;

-- ============================================================
-- SECTION 13: SYNC INFRASTRUCTURE
-- ============================================================

-- High-level sync job (one per trigger/schedule)
create table if not exists public.sync_jobs (
  id                      uuid        primary key default uuid_generate_v4(),
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  platform_connection_id  uuid        not null references public.platform_connections(id) on delete cascade,
  platform_account_id     uuid        references public.platform_accounts(id) on delete cascade,
  job_type                text        not null
                                      check (job_type in ('full','incremental','campaigns','ad_groups','ads','metrics','creatives')),
  status                  text        not null default 'pending'
                                      check (status in ('pending','queued','running','success','partial','failed','cancelled')),
  priority                integer     not null default 5 check (priority between 1 and 10),
  triggered_by            text        not null default 'schedule'
                                      check (triggered_by in ('schedule','manual','webhook','system')),
  triggered_by_user_id    uuid        references public.user_profiles(id) on delete set null,
  date_range_start        date,
  date_range_end          date,
  scheduled_at            timestamptz,
  started_at              timestamptz,
  completed_at            timestamptz,
  next_run_at             timestamptz,
  is_scheduled            boolean     not null default false,
  schedule_cron           text,
  campaigns_synced        integer     not null default 0,
  ad_groups_synced        integer     not null default 0,
  ads_synced              integer     not null default 0,
  metrics_synced          integer     not null default 0,
  records_failed          integer     not null default 0,
  error_summary           text,
  metadata                jsonb       not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_sync_jobs_conn        on public.sync_jobs(platform_connection_id, status, started_at desc);
create index if not exists idx_sync_jobs_org         on public.sync_jobs(organization_id, status);
create index if not exists idx_sync_jobs_scheduled   on public.sync_jobs(is_scheduled, next_run_at) where is_scheduled = true;

-- Granular log lines within a sync job
create table if not exists public.sync_job_logs (
  id                      uuid        primary key default uuid_generate_v4(),
  sync_job_id             uuid        not null references public.sync_jobs(id) on delete cascade,
  organization_id         uuid        not null references public.organizations(id) on delete cascade,
  level                   text        not null default 'info'
                                      check (level in ('debug','info','warning','error')),
  message                 text        not null,
  entity_type             text,          -- 'campaign','ad_group','ad','metric'
  entity_id               text,          -- platform entity ID
  internal_id             uuid,          -- our DB row id
  details                 jsonb       not null default '{}',
  created_at              timestamptz not null default now()
);

create index if not exists idx_sjl_job               on public.sync_job_logs(sync_job_id, level, created_at desc);
create index if not exists idx_sjl_org               on public.sync_job_logs(organization_id, level, created_at desc);

-- ============================================================
-- SECTION 14: AUDIT LOGS
-- ============================================================

create table if not exists public.audit_logs (
  id                  uuid        primary key default uuid_generate_v4(),
  organization_id     uuid        not null references public.organizations(id) on delete cascade,
  user_id             uuid        references public.user_profiles(id) on delete set null,
  action              text        not null,   -- 'create','update','delete','login','logout','export','connect','disconnect'
  resource_type       text        not null,   -- 'client','campaign','alert','task','report','platform_connection'
  resource_id         uuid,
  resource_label      text,                   -- human-readable name snapshot
  old_values          jsonb,
  new_values          jsonb,
  changed_fields      text[],
  ip_address          inet,
  user_agent          text,
  session_id          text,
  metadata            jsonb       not null default '{}',
  created_at          timestamptz not null default now()
);

-- Audit logs are append-only — no update, no delete via application
create index if not exists idx_audit_org             on public.audit_logs(organization_id, created_at desc);
create index if not exists idx_audit_user            on public.audit_logs(user_id, created_at desc);
create index if not exists idx_audit_resource        on public.audit_logs(resource_type, resource_id, created_at desc);
create index if not exists idx_audit_action          on public.audit_logs(action, created_at desc);

-- ============================================================
-- SECTION 15: HEALTH SCORES (retained from initial schema)
-- ============================================================

create table if not exists public.health_scores (
  id                  uuid        primary key default uuid_generate_v4(),
  campaign_id         uuid        not null references public.campaigns(id) on delete cascade,
  score               numeric(5,2) not null check (score between 0 and 100),
  components          jsonb       not null default '{}',
  trend               text        not null default 'stable'
                                  check (trend in ('improving','stable','declining')),
  calculated_at       timestamptz not null default now()
);

create index if not exists idx_health_campaign       on public.health_scores(campaign_id, calculated_at desc);

-- ============================================================
-- SECTION 16: HELPER FUNCTIONS
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at trigger to all tables that have the column
do $$ declare
  t text;
begin
  foreach t in array array[
    'organizations','user_profiles','organization_users',
    'clients','client_users',
    'platform_connections','platform_accounts',
    'campaigns','campaign_groups','ad_groups','ads','creatives',
    'daily_metrics','landing_pages',
    'alerts','tasks','task_comments',
    'recommendations','reports','sync_jobs'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- Convenience: get current user's organization_id
create or replace function public.current_org_id()
returns uuid language sql security definer stable as $$
  select organization_id from public.user_profiles where id = auth.uid()
$$;

-- Convenience: get current user's role in their org
create or replace function public.current_user_role()
returns text language sql security definer stable as $$
  select role from public.organization_users
  where organization_id = public.current_org_id()
    and user_id = auth.uid()
    and is_active = true
$$;

-- Check if current user can access a specific client (org-level or explicit grant)
create or replace function public.user_can_access_client(p_client_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client_id
      and c.organization_id = public.current_org_id()
      and (
        -- org-level roles always have access
        public.current_user_role() in ('owner','admin','manager')
        or
        -- explicit client grant
        exists (
          select 1 from public.client_users cu
          where cu.client_id = p_client_id
            and cu.user_id = auth.uid()
        )
      )
  )
$$;
