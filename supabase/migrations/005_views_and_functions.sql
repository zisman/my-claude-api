-- ============================================================
-- AdPilot — Analytical Views & Utility Functions
-- Migration: 005_views_and_functions.sql
-- ============================================================

-- ============================================================
-- VIEWS
-- ============================================================

-- Active campaigns with latest health score
create or replace view public.v_campaign_summary as
select
  c.id,
  c.organization_id,
  c.client_id,
  c.platform,
  c.name,
  c.status,
  c.objective,
  c.campaign_type,
  c.daily_budget,
  c.total_budget,
  c.currency,
  c.start_date,
  c.end_date,
  c.bidding_strategy,
  c.target_cpa,
  c.target_roas,
  cl.name                           as client_name,
  hs.score                          as health_score,
  hs.trend                          as health_trend,
  hs.components                     as health_components,
  -- 30-day aggregates from daily_metrics (campaign level only)
  coalesce(agg.impressions,0)       as impressions_30d,
  coalesce(agg.clicks,0)            as clicks_30d,
  coalesce(agg.spend,0)             as spend_30d,
  coalesce(agg.conversions,0)       as conversions_30d,
  coalesce(agg.conversion_value,0)  as conversion_value_30d,
  case when coalesce(agg.impressions,0) > 0
       then (agg.clicks::numeric / agg.impressions) * 100
       else 0 end                   as ctr_30d,
  case when coalesce(agg.clicks,0) > 0
       then agg.spend / agg.clicks
       else 0 end                   as cpc_30d,
  case when coalesce(agg.spend,0) > 0 and coalesce(agg.conversion_value,0) > 0
       then agg.conversion_value / agg.spend
       else null end                as roas_30d,
  c.created_at,
  c.updated_at
from public.campaigns c
join public.clients cl on cl.id = c.client_id
-- Latest health score
left join lateral (
  select score, trend, components
  from public.health_scores
  where campaign_id = c.id
  order by calculated_at desc
  limit 1
) hs on true
-- 30-day metric aggregates (campaign level: ad_group_id IS NULL, ad_id IS NULL)
left join lateral (
  select
    sum(impressions)      as impressions,
    sum(clicks)           as clicks,
    sum(spend)            as spend,
    sum(conversions)      as conversions,
    sum(conversion_value) as conversion_value
  from public.daily_metrics
  where campaign_id = c.id
    and ad_group_id is null
    and ad_id is null
    and date >= current_date - interval '30 days'
) agg on true
where c.is_archived = false;

comment on view public.v_campaign_summary is 'One row per campaign with 30d aggregates and latest health score.';

-- Client overview with counts and MTD spend
create or replace view public.v_client_overview as
select
  cl.id,
  cl.organization_id,
  cl.name,
  cl.industry,
  cl.status,
  cl.monthly_budget,
  cl.currency,
  cl.account_manager_id,
  up.full_name                      as account_manager_name,
  -- Counts
  (select count(*) from public.platform_connections pc where pc.client_id = cl.id)         as platform_count,
  (select count(*) from public.platform_connections pc where pc.client_id = cl.id and pc.status = 'connected') as connected_platform_count,
  (select count(*) from public.campaigns ca where ca.client_id = cl.id and ca.is_archived = false)              as campaign_count,
  (select count(*) from public.campaigns ca where ca.client_id = cl.id and ca.status = 'active')               as active_campaign_count,
  (select count(*) from public.alerts al where al.client_id = cl.id and al.status = 'open')                    as open_alert_count,
  (select count(*) from public.tasks ta where ta.client_id = cl.id and ta.status in ('todo','in_progress'))     as open_task_count,
  -- MTD spend
  coalesce((
    select sum(dm.spend)
    from public.daily_metrics dm
    join public.campaigns ca on ca.id = dm.campaign_id
    where ca.client_id = cl.id
      and dm.ad_group_id is null
      and dm.ad_id is null
      and date_trunc('month', dm.date) = date_trunc('month', current_date)
  ), 0)                             as spend_mtd,
  -- Average health score across active campaigns
  (
    select avg(hs.score)
    from public.health_scores hs
    join public.campaigns ca on ca.id = hs.campaign_id
    where ca.client_id = cl.id
      and ca.status = 'active'
      and hs.calculated_at = (
        select max(h2.calculated_at) from public.health_scores h2 where h2.campaign_id = ca.id
      )
  )                                 as avg_health_score,
  cl.created_at,
  cl.updated_at
from public.clients cl
left join public.user_profiles up on up.id = cl.account_manager_id
where cl.is_active = true;

comment on view public.v_client_overview is 'One row per client with MTD spend, health score, and entity counts.';

-- Daily cross-platform aggregate (for dashboard trend chart)
create or replace view public.v_org_daily_totals as
select
  dm.organization_id,
  dm.date,
  sum(dm.impressions)       as impressions,
  sum(dm.clicks)            as clicks,
  sum(dm.spend)             as spend,
  sum(dm.conversions)       as conversions,
  sum(dm.conversion_value)  as conversion_value,
  case when sum(dm.impressions) > 0
       then (sum(dm.clicks)::numeric / sum(dm.impressions)) * 100
       else 0 end           as ctr,
  case when sum(dm.clicks) > 0
       then sum(dm.spend) / sum(dm.clicks)
       else 0 end           as cpc,
  case when sum(dm.spend) > 0 and sum(dm.conversion_value) > 0
       then sum(dm.conversion_value) / sum(dm.spend)
       else null end        as roas
from public.daily_metrics dm
where dm.ad_group_id is null   -- campaign-level rows only to avoid double-count
  and dm.ad_id is null
group by dm.organization_id, dm.date;

comment on view public.v_org_daily_totals is 'Cross-client daily totals per org for dashboard trend charts.';

-- Spend by platform per org per month
create or replace view public.v_spend_by_platform as
select
  dm.organization_id,
  dm.platform,
  date_trunc('month', dm.date)::date  as month,
  sum(dm.spend)                       as spend,
  sum(dm.clicks)                      as clicks,
  sum(dm.impressions)                 as impressions,
  sum(dm.conversions)                 as conversions
from public.daily_metrics dm
where dm.ad_group_id is null
  and dm.ad_id is null
group by dm.organization_id, dm.platform, date_trunc('month', dm.date);

-- Open alert summary per org
create or replace view public.v_open_alert_counts as
select
  organization_id,
  count(*)                                              as total_open,
  count(*) filter (where severity = 'critical')         as critical,
  count(*) filter (where severity = 'high')             as high,
  count(*) filter (where severity = 'medium')           as medium,
  count(*) filter (where severity = 'low')              as low,
  count(*) filter (where severity = 'info')             as info
from public.alerts
where status = 'open'
group by organization_id;

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

-- Compute derived metrics (ctr, cpc, cpm, cpa, roas) from raw
-- counts; called by sync Edge Functions before insert.
create or replace function public.compute_derived_metrics(
  p_impressions   bigint,
  p_clicks        bigint,
  p_spend         numeric,
  p_conversions   numeric,
  p_conv_value    numeric
) returns table (
  ctr   numeric,
  cpc   numeric,
  cpm   numeric,
  cpa   numeric,
  roas  numeric
) language sql immutable as $$
  select
    case when p_impressions > 0 then (p_clicks::numeric / p_impressions) * 100 else 0 end,
    case when p_clicks > 0      then p_spend / p_clicks else 0 end,
    case when p_impressions > 0 then (p_spend / p_impressions) * 1000 else 0 end,
    case when p_conversions > 0 then p_spend / p_conversions else null end,
    case when p_spend > 0 and p_conv_value > 0 then p_conv_value / p_spend else null end
$$;

-- Budget pacing: percentage of budget consumed relative to time elapsed
create or replace function public.budget_pacing_rate(
  p_spend         numeric,
  p_budget        numeric,
  p_start_date    date,
  p_end_date      date,
  p_as_of         date default current_date
) returns numeric language sql immutable as $$
  select case
    when p_budget is null or p_budget = 0 then null
    when p_end_date <= p_start_date then null
    else
      -- actual spend fraction vs. time fraction
      (p_spend / p_budget) /
      nullif(
        (least(p_as_of, p_end_date) - p_start_date)::numeric /
        (p_end_date - p_start_date),
        0
      )
  end
$$;

comment on function public.budget_pacing_rate is
  'Returns pacing ratio (1.0 = on pace). >1.3 = overpacing, <0.7 = underpacing.';

-- Campaign health score: weighted composite of 5 components.
-- Returns (score 0-100, components jsonb, trend text).
create or replace function public.compute_health_score(
  p_campaign_id   uuid,
  p_days          integer default 30
) returns table (
  score       numeric,
  components  jsonb,
  trend       text
) language plpgsql security definer as $$
declare
  v_impressions   bigint;
  v_clicks        bigint;
  v_spend         numeric;
  v_conversions   numeric;
  v_conv_value    numeric;
  v_quality_score numeric;
  v_roas          numeric;
  v_budget        numeric;
  v_start_date    date;
  v_end_date      date;

  v_ctr_score     numeric;
  v_cr_score      numeric;
  v_pacing_score  numeric;
  v_qs_score      numeric;
  v_roas_score    numeric;
  v_total_score   numeric;
  v_trend         text;

  v_first_half_roas numeric;
  v_second_half_roas numeric;
begin
  -- Fetch campaign budget info
  select c.daily_budget, c.start_date, c.end_date
  into v_budget, v_start_date, v_end_date
  from public.campaigns c where c.id = p_campaign_id;

  -- Aggregate metrics for the period
  select
    coalesce(sum(dm.impressions),0),
    coalesce(sum(dm.clicks),0),
    coalesce(sum(dm.spend),0),
    coalesce(sum(dm.conversions),0),
    coalesce(sum(dm.conversion_value),0),
    avg(dm.quality_score)
  into v_impressions, v_clicks, v_spend, v_conversions, v_conv_value, v_quality_score
  from public.daily_metrics dm
  where dm.campaign_id = p_campaign_id
    and dm.ad_group_id is null
    and dm.date >= current_date - p_days;

  -- CTR score (benchmark: <0.5% poor, >5% excellent)
  if v_impressions > 0 then
    v_ctr_score := least(100, greatest(0,
      ((v_clicks::numeric / v_impressions * 100) - 0.5) / (5.0 - 0.5) * 100
    ));
  else
    v_ctr_score := 50;
  end if;

  -- Conversion rate score (benchmark: <1% poor, >7% excellent)
  if v_clicks > 0 then
    v_cr_score := least(100, greatest(0,
      ((v_conversions / v_clicks * 100) - 1.0) / (7.0 - 1.0) * 100
    ));
  else
    v_cr_score := 50;
  end if;

  -- Budget pacing score (1.0 = perfect; <0.7 or >1.3 = 0)
  if v_budget is not null and v_start_date is not null then
    declare
      v_pacing numeric;
    begin
      v_pacing := public.budget_pacing_rate(
        v_spend, v_budget * p_days, v_start_date,
        coalesce(v_end_date, current_date + 30)
      );
      if v_pacing is null then
        v_pacing_score := 50;
      elsif v_pacing between 0.9 and 1.1 then
        v_pacing_score := 100;
      elsif v_pacing < 0.7 or v_pacing > 1.3 then
        v_pacing_score := 0;
      elsif v_pacing < 0.9 then
        v_pacing_score := ((v_pacing - 0.7) / 0.2) * 100;
      else
        v_pacing_score := ((1.3 - v_pacing) / 0.2) * 100;
      end if;
    end;
  else
    v_pacing_score := 50;
  end if;

  -- Quality score (0-10 scale → 0-100)
  v_qs_score := coalesce(v_quality_score * 10, 50);

  -- ROAS score (0 = no spend, >4x = excellent)
  if v_spend > 0 and v_conv_value > 0 then
    v_roas := v_conv_value / v_spend;
    v_roas_score := least(100, (v_roas / 4.0) * 100);
  else
    v_roas_score := 50;
  end if;

  -- Weighted composite
  v_total_score := round(
    v_ctr_score  * 0.25 +
    v_cr_score   * 0.30 +
    v_pacing_score * 0.20 +
    v_qs_score   * 0.15 +
    v_roas_score * 0.10,
  1);

  -- Trend: compare first-half vs second-half ROAS over period
  select
    avg(dm.roas) filter (where dm.date < current_date - (p_days / 2)),
    avg(dm.roas) filter (where dm.date >= current_date - (p_days / 2))
  into v_first_half_roas, v_second_half_roas
  from public.daily_metrics dm
  where dm.campaign_id = p_campaign_id
    and dm.ad_group_id is null
    and dm.date >= current_date - p_days;

  if v_first_half_roas is null or v_second_half_roas is null then
    v_trend := 'stable';
  elsif v_second_half_roas > v_first_half_roas + 0.1 then
    v_trend := 'improving';
  elsif v_second_half_roas < v_first_half_roas - 0.1 then
    v_trend := 'declining';
  else
    v_trend := 'stable';
  end if;

  return query select
    v_total_score,
    jsonb_build_object(
      'ctr_benchmark',    round(v_ctr_score, 1),
      'conversion_rate',  round(v_cr_score, 1),
      'budget_pacing',    round(v_pacing_score, 1),
      'quality_score',    round(v_qs_score, 1),
      'spend_efficiency', round(v_roas_score, 1)
    ),
    v_trend;
end;
$$;

comment on function public.compute_health_score is
  'Compute and return weighted health score (0-100) for a campaign. Used by scoring Edge Function.';

-- Upsert a daily_metrics row (sync idempotency helper)
create or replace function public.upsert_daily_metric(
  p_organization_id   uuid,
  p_client_id         uuid,
  p_campaign_id       uuid,
  p_platform          text,
  p_date              date,
  p_impressions       bigint,
  p_clicks            bigint,
  p_spend             numeric,
  p_conversions       numeric,
  p_conv_value        numeric,
  p_platform_data     jsonb  default '{}',
  p_ad_group_id       uuid   default null,
  p_ad_id             uuid   default null,
  p_platform_account_id uuid default null
) returns uuid language plpgsql security definer as $$
declare
  v_derived record;
  v_id uuid;
begin
  select * into v_derived
  from public.compute_derived_metrics(p_impressions, p_clicks, p_spend, p_conversions, p_conv_value);

  insert into public.daily_metrics (
    organization_id, client_id, platform_account_id, campaign_id, ad_group_id, ad_id,
    platform, date,
    impressions, clicks, spend, conversions, conversion_value,
    ctr, cpc, cpm, cpa, roas,
    platform_data
  ) values (
    p_organization_id, p_client_id, p_platform_account_id, p_campaign_id, p_ad_group_id, p_ad_id,
    p_platform, p_date,
    p_impressions, p_clicks, p_spend, p_conversions, p_conv_value,
    v_derived.ctr, v_derived.cpc, v_derived.cpm, v_derived.cpa, v_derived.roas,
    p_platform_data
  )
  on conflict (campaign_id, ad_group_id, ad_id, date) do update set
    impressions       = excluded.impressions,
    clicks            = excluded.clicks,
    spend             = excluded.spend,
    conversions       = excluded.conversions,
    conversion_value  = excluded.conversion_value,
    ctr               = excluded.ctr,
    cpc               = excluded.cpc,
    cpm               = excluded.cpm,
    cpa               = excluded.cpa,
    roas              = excluded.roas,
    platform_data     = excluded.platform_data,
    updated_at        = now()
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.upsert_daily_metric is
  'Idempotent insert/update for a single daily_metrics row. Called by sync Edge Functions.';

-- Write an audit log entry (called by triggers or Edge Functions)
create or replace function public.write_audit_log(
  p_organization_id uuid,
  p_user_id         uuid,
  p_action          text,
  p_resource_type   text,
  p_resource_id     uuid,
  p_resource_label  text default null,
  p_old_values      jsonb default null,
  p_new_values      jsonb default null,
  p_metadata        jsonb default '{}'
) returns void language plpgsql security definer as $$
begin
  insert into public.audit_logs (
    organization_id, user_id, action, resource_type, resource_id,
    resource_label, old_values, new_values,
    changed_fields, metadata
  ) values (
    p_organization_id, p_user_id, p_action, p_resource_type, p_resource_id,
    p_resource_label, p_old_values, p_new_values,
    case
      when p_old_values is not null and p_new_values is not null then
        array(select key from jsonb_each(p_new_values)
              where p_new_values->key is distinct from p_old_values->key)
      else null
    end,
    p_metadata
  );
end;
$$;

-- Trigger: auto-audit updates on key tables
create or replace function public.audit_trigger_fn()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'UPDATE') then
    perform public.write_audit_log(
      coalesce(new.organization_id, old.organization_id),
      auth.uid(),
      'update',
      tg_table_name,
      coalesce(new.id, old.id),
      null,
      to_jsonb(old),
      to_jsonb(new)
    );
  elsif (tg_op = 'DELETE') then
    perform public.write_audit_log(
      old.organization_id,
      auth.uid(),
      'delete',
      tg_table_name,
      old.id,
      null,
      to_jsonb(old),
      null
    );
  end if;
  return coalesce(new, old);
end;
$$;

-- Apply audit trigger to business-critical tables
do $$ declare t text; begin
  foreach t in array array['clients','platform_connections','campaigns','alerts','tasks','reports'] loop
    execute format(
      'drop trigger if exists audit_changes on public.%I;
       create trigger audit_changes
       after update or delete on public.%I
       for each row execute function public.audit_trigger_fn();',
      t, t
    );
  end loop;
end $$;
