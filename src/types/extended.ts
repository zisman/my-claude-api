// Extended entity types matching the 003/004/005 migrations
// Import alongside types/index.ts

import type { PlatformType, UserRole } from './index'

// ─── Organization ─────────────────────────────────────────────────────────────

export type BillingStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'
export type OrgPlan = 'starter' | 'growth' | 'enterprise' | 'custom'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: OrgPlan
  billing_email: string | null
  billing_status: BillingStatus
  max_users: number
  max_clients: number
  trial_ends_at: string | null
  settings: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── Organization Users ───────────────────────────────────────────────────────

export interface OrganizationUser {
  id: string
  organization_id: string
  user_id: string
  role: UserRole
  invited_by: string | null
  invited_at: string
  accepted_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Client Users ─────────────────────────────────────────────────────────────

export interface ClientUser {
  id: string
  client_id: string
  user_id: string
  organization_id: string
  role: 'manager' | 'analyst' | 'viewer'
  is_primary: boolean
  created_at: string
  updated_at: string
}

// ─── Platform Accounts ────────────────────────────────────────────────────────

export type AccountType = 'standard' | 'mcc' | 'bm' | 'agency'
export type AccountStatus = 'active' | 'paused' | 'suspended' | 'closed'

export interface PlatformAccount {
  id: string
  platform_connection_id: string
  organization_id: string
  client_id: string
  platform: PlatformType
  account_id: string
  account_name: string | null
  account_type: AccountType | null
  currency: string
  timezone: string
  status: AccountStatus
  is_primary: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── Campaign Groups ──────────────────────────────────────────────────────────

export interface CampaignGroup {
  id: string
  organization_id: string
  client_id: string
  name: string
  description: string | null
  color: string
  tags: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CampaignGroupMember {
  id: string
  campaign_group_id: string
  campaign_id: string
  added_at: string
}

// ─── Ad Groups ────────────────────────────────────────────────────────────────

export type AdGroupStatus = 'active' | 'paused' | 'removed' | 'error'

export interface AdGroup {
  id: string
  campaign_id: string
  organization_id: string
  client_id: string
  platform: PlatformType
  platform_ad_group_id: string
  name: string
  status: AdGroupStatus
  bidding_strategy: string | null
  bid_amount: number | null
  target_cpa: number | null
  target_roas: number | null
  platform_metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── Ads ──────────────────────────────────────────────────────────────────────

export type AdStatus = 'active' | 'paused' | 'removed' | 'disapproved' | 'under_review'
export type AdType = 'rsa' | 'esa' | 'dsa' | 'display' | 'video' | 'carousel' | 'story'

export interface Ad {
  id: string
  ad_group_id: string
  campaign_id: string
  organization_id: string
  client_id: string
  platform: PlatformType
  platform_ad_id: string
  name: string | null
  status: AdStatus
  ad_type: AdType | null
  headline_1: string | null
  headline_2: string | null
  headline_3: string | null
  description_1: string | null
  description_2: string | null
  display_url: string | null
  final_url: string | null
  final_mobile_url: string | null
  call_to_action: string | null
  platform_metadata: Record<string, unknown>
  approval_status: string | null
  disapproval_reasons: string[] | null
  created_at: string
  updated_at: string
}

// ─── Creatives ────────────────────────────────────────────────────────────────

export type CreativeType = 'image' | 'video' | 'html5' | 'text' | 'logo' | 'carousel_card'

export interface Creative {
  id: string
  organization_id: string
  client_id: string
  name: string
  type: CreativeType
  file_url: string | null
  thumbnail_url: string | null
  width_px: number | null
  height_px: number | null
  file_size_bytes: number | null
  duration_seconds: number | null
  mime_type: string | null
  alt_text: string | null
  tags: string[]
  is_archived: boolean
  metadata: Record<string, unknown>
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface AdCreative {
  id: string
  ad_id: string
  creative_id: string
  position: number
  created_at: string
}

// ─── Daily Metrics ────────────────────────────────────────────────────────────

export interface DailyMetric {
  id: string
  organization_id: string
  client_id: string
  platform_account_id: string | null
  campaign_id: string
  ad_group_id: string | null
  ad_id: string | null
  platform: PlatformType
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  conversion_value: number
  video_views: number
  video_view_rate: number
  video_completions: number
  video_completion_rate: number
  reach: number
  frequency: number
  ctr: number
  cpc: number
  cpm: number
  cpa: number | null
  roas: number | null
  quality_score: number | null
  impression_share: number | null
  lost_is_budget: number | null
  lost_is_rank: number | null
  platform_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── Conversion Events ────────────────────────────────────────────────────────

export type EventCategory = 'purchase' | 'lead' | 'signup' | 'page_view' | 'engagement'

export interface ConversionEvent {
  id: string
  organization_id: string
  client_id: string
  campaign_id: string | null
  ad_group_id: string | null
  ad_id: string | null
  platform: PlatformType
  platform_conversion_id: string | null
  event_name: string
  event_category: EventCategory | null
  conversion_value: number | null
  currency: string
  attribution_window_days: number | null
  occurred_at: string
  platform_data: Record<string, unknown>
  created_at: string
}

// ─── Landing Pages ────────────────────────────────────────────────────────────

export type LandingPageStatus = 'active' | 'inactive' | 'error'

export interface LandingPage {
  id: string
  organization_id: string
  client_id: string
  url: string
  name: string | null
  status: LandingPageStatus
  page_speed_score: number | null
  mobile_score: number | null
  seo_score: number | null
  accessibility_score: number | null
  conversion_rate: number | null
  bounce_rate: number | null
  avg_time_on_page_sec: number | null
  sessions_30d: number | null
  title: string | null
  meta_description: string | null
  h1: string | null
  screenshot_url: string | null
  last_crawled_at: string | null
  crawl_error: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── Extended Alert ───────────────────────────────────────────────────────────

export type AlertCategory = 'budget' | 'performance' | 'technical' | 'billing' | 'compliance'

export interface AlertExtended {
  id: string
  organization_id: string
  client_id: string | null
  campaign_id: string | null
  ad_group_id: string | null
  platform_account_id: string | null
  severity: import('./index').AlertSeverity
  status: import('./index').AlertStatus
  type: string
  category: AlertCategory
  title: string
  message: string
  threshold_metric: string | null
  threshold_value: number | null
  actual_value: number | null
  auto_resolve: boolean
  metadata: Record<string, unknown>
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

// ─── Extended Task ────────────────────────────────────────────────────────────

export interface TaskExtended {
  id: string
  organization_id: string
  client_id: string | null
  campaign_id: string | null
  parent_task_id: string | null
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  status: import('./index').TaskStatus | 'in_review'
  priority: import('./index').TaskPriority
  due_date: string | null
  estimated_hours: number | null
  actual_hours: number | null
  completed_at: string | null
  recurrence: string | null
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
}

// ─── Extended Recommendations ─────────────────────────────────────────────────

export type RecommendationCategory =
  | 'budget' | 'bidding' | 'targeting' | 'creative'
  | 'landing_page' | 'structure' | 'performance'

export type EffortLevel = 'low' | 'medium' | 'high'

export interface Recommendation {
  id: string
  organization_id: string
  client_id: string | null
  campaign_id: string | null
  ad_group_id: string | null
  ai_insight_id: string | null
  priority: import('./index').RecommendationPriority
  category: RecommendationCategory
  title: string
  description: string
  expected_impact: string
  implementation_steps: string[]
  estimated_lift: number | null
  estimated_lift_unit: string | null
  effort_level: EffortLevel
  model_version: string | null
  is_dismissed: boolean
  is_implemented: boolean
  dismissed_at: string | null
  implemented_at: string | null
  implemented_by: string | null
  generated_at: string
  expires_at: string | null
  created_at: string
}

// ─── Sync Jobs ────────────────────────────────────────────────────────────────

export type SyncJobType = 'full' | 'incremental' | 'campaigns' | 'ad_groups' | 'ads' | 'metrics' | 'creatives'
export type SyncJobStatus = 'pending' | 'queued' | 'running' | 'success' | 'partial' | 'failed' | 'cancelled'
export type SyncTrigger = 'schedule' | 'manual' | 'webhook' | 'system'
export type LogLevel = 'debug' | 'info' | 'warning' | 'error'

export interface SyncJob {
  id: string
  organization_id: string
  platform_connection_id: string
  platform_account_id: string | null
  job_type: SyncJobType
  status: SyncJobStatus
  priority: number
  triggered_by: SyncTrigger
  triggered_by_user_id: string | null
  date_range_start: string | null
  date_range_end: string | null
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  next_run_at: string | null
  is_scheduled: boolean
  schedule_cron: string | null
  campaigns_synced: number
  ad_groups_synced: number
  ads_synced: number
  metrics_synced: number
  records_failed: number
  error_summary: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SyncJobLog {
  id: string
  sync_job_id: string
  organization_id: string
  level: LogLevel
  message: string
  entity_type: string | null
  entity_id: string | null
  internal_id: string | null
  details: Record<string, unknown>
  created_at: string
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  resource_label: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changed_fields: string[] | null
  ip_address: string | null
  user_agent: string | null
  session_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ─── View Types ───────────────────────────────────────────────────────────────

export interface CampaignSummaryRow {
  id: string
  organization_id: string
  client_id: string
  platform: PlatformType
  name: string
  status: string
  objective: string | null
  campaign_type: string | null
  daily_budget: number | null
  total_budget: number | null
  currency: string
  start_date: string | null
  end_date: string | null
  bidding_strategy: string | null
  target_cpa: number | null
  target_roas: number | null
  client_name: string
  health_score: number | null
  health_trend: 'improving' | 'stable' | 'declining' | null
  health_components: Record<string, number> | null
  impressions_30d: number
  clicks_30d: number
  spend_30d: number
  conversions_30d: number
  conversion_value_30d: number
  ctr_30d: number
  cpc_30d: number
  roas_30d: number | null
  created_at: string
  updated_at: string
}

export interface ClientOverviewRow {
  id: string
  organization_id: string
  name: string
  industry: string | null
  status: string
  monthly_budget: number | null
  currency: string
  account_manager_id: string | null
  account_manager_name: string | null
  platform_count: number
  connected_platform_count: number
  campaign_count: number
  active_campaign_count: number
  open_alert_count: number
  open_task_count: number
  spend_mtd: number
  avg_health_score: number | null
  created_at: string
  updated_at: string
}

export interface OrgDailyTotalsRow {
  organization_id: string
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  conversion_value: number
  ctr: number
  cpc: number
  roas: number | null
}

export interface OpenAlertCounts {
  organization_id: string
  total_open: number
  critical: number
  high: number
  medium: number
  low: number
  info: number
}
