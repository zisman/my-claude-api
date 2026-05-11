-- ============================================================
-- 006: Scheduled sync configuration
-- ============================================================
-- Registers pg_cron jobs for each connected platform's sync schedule.
-- pg_cron must be enabled in your Supabase project (Database > Extensions).
--
-- Each platform_connection with is_scheduled=true and a schedule_cron
-- will be picked up by this planner function. The cron runner itself
-- is a pg_cron job that fires every 15 minutes and dispatches
-- any due sync_jobs as Edge Function calls via pg_net.
-- ============================================================

-- ─── Helper: mark overdue scheduled jobs as pending ────────────────────────────

create or replace function public.schedule_due_syncs()
returns void
language plpgsql
security definer
as $$
declare
  rec record;
begin
  -- Find connections with auto-sync enabled and a past next_run_at
  for rec in
    select
      sj.id          as job_id,
      sj.organization_id,
      sj.platform_connection_id
    from public.sync_jobs sj
    where sj.is_scheduled    = true
      and sj.status          = 'pending'
      and sj.next_run_at     <= now()
    order by sj.next_run_at
    limit 50
  loop
    -- Mark it queued (the Edge Function caller handles actual dispatch)
    update public.sync_jobs
    set status = 'queued', scheduled_at = now()
    where id = rec.job_id;
  end loop;
end;
$$;

-- ─── Helper: create next scheduled job after completion ───────────────────────

create or replace function public.create_next_scheduled_sync()
returns trigger
language plpgsql
security definer
as $$
declare
  conn record;
  next_run timestamptz;
begin
  -- Only act when a scheduled job succeeds or fails
  if new.is_scheduled = true and new.status in ('success','partial','failed')
     and new.schedule_cron is not null
  then
    -- Compute next run from cron expression using pg_cron helper
    -- (Approximated here as +1 hour for hourly, +24h for daily)
    -- In production: use pg_cron.next_run(new.schedule_cron)
    next_run := case
      when new.schedule_cron like '*/15 *%' then now() + interval '15 minutes'
      when new.schedule_cron like '0 * *%'  then now() + interval '1 hour'
      when new.schedule_cron like '0 2 *%'  then now() + interval '24 hours'
      else                                       now() + interval '6 hours'
    end;

    -- Create the successor job
    insert into public.sync_jobs (
      organization_id,
      platform_connection_id,
      job_type,
      status,
      priority,
      triggered_by,
      is_scheduled,
      schedule_cron,
      next_run_at,
      campaigns_synced,
      ad_groups_synced,
      ads_synced,
      metrics_synced,
      records_failed
    )
    values (
      new.organization_id,
      new.platform_connection_id,
      'incremental',
      'pending',
      5,
      'schedule',
      true,
      new.schedule_cron,
      next_run,
      0, 0, 0, 0, 0
    );
  end if;

  return new;
end;
$$;

-- Attach trigger on sync_jobs completion
create trigger trg_create_next_scheduled_sync
  after update of status on public.sync_jobs
  for each row
  execute function public.create_next_scheduled_sync();

-- ─── Bootstrap: create initial scheduled jobs for existing connections ──────

create or replace function public.bootstrap_scheduled_syncs(
  p_organization_id uuid,
  p_cron_expression text default '0 2 * * *'  -- 2am daily by default
)
returns int
language plpgsql
security definer
as $$
declare
  conn     record;
  inserted int := 0;
begin
  for conn in
    select id
    from public.platform_connections
    where organization_id = p_organization_id
      and status          = 'connected'
      and sync_enabled    = true
  loop
    -- Skip if an active scheduled job already exists
    if not exists (
      select 1 from public.sync_jobs
      where platform_connection_id = conn.id
        and is_scheduled            = true
        and status in ('pending','queued','running')
    ) then
      insert into public.sync_jobs (
        organization_id,
        platform_connection_id,
        job_type,
        status,
        triggered_by,
        is_scheduled,
        schedule_cron,
        next_run_at,
        campaigns_synced,
        ad_groups_synced,
        ads_synced,
        metrics_synced,
        records_failed
      ) values (
        p_organization_id,
        conn.id,
        'incremental',
        'pending',
        'schedule',
        true,
        p_cron_expression,
        now() + interval '24 hours',
        0, 0, 0, 0, 0
      );
      inserted := inserted + 1;
    end if;
  end loop;

  return inserted;
end;
$$;

-- ─── pg_cron job (uncomment after enabling pg_cron extension) ─────────────────
-- Run schedule_due_syncs() every 15 minutes to enqueue overdue scheduled jobs.
-- The actual HTTP dispatch to the Edge Function is handled by a separate
-- pg_net call or by the sync-trigger function polling the sync_jobs table.
--
-- select cron.schedule(
--   'schedule-due-syncs',
--   '*/15 * * * *',
--   $$select public.schedule_due_syncs()$$
-- );
