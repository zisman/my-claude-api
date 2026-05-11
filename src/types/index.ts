// ─── Core Entity Types ───────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'manager' | 'analyst' | 'viewer'
export type PlatformType = 'google_ads' | 'meta_ads' | 'linkedin_ads' | 'ga4'
export type CampaignStatus = 'active' | 'paused' | 'ended' | 'draft' | 'error'
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'suppressed'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'
export type ReportStatus = 'pending' | 'generating' | 'ready' | 'failed'
export type SyncStatus = 'pending' | 'running' | 'success' | 'partial' | 'failed'
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending'
export type InsightType = 'performance' | 'anomaly' | 'opportunity' | 'risk' | 'trend'
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'

// ─── Organization & Users ────────────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: 'starter' | 'growth' | 'enterprise' | 'custom'
  billing_status: 'active' | 'past_due' | 'cancelled' | 'trialing' | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  organization_id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  last_seen_at: string | null
  preferences: {
    theme?: 'light' | 'dark' | 'system'
    notifications?: boolean
    default_date_range?: string
  }
  created_at: string
  updated_at: string
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface Client {
  id: string
  organization_id: string
  name: string
  industry: string | null
  website: string | null
  logo_url: string | null
  monthly_budget: number | null
  currency: string
  timezone: string
  account_manager_id: string | null
  tags: string[]
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ClientWithStats extends Client {
  platform_count: number
  campaign_count: number
  total_spend: number
  total_impressions: number
  total_clicks: number
  avg_health_score: number | null
  open_alert_count: number
  account_manager?: UserProfile
}

// ─── Platform Connections ─────────────────────────────────────────────────────

export interface PlatformConnection {
  id: string
  client_id: string
  organization_id: string
  platform: PlatformType
  status: ConnectionStatus
  account_id: string | null
  account_name: string | null
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  token_expires_at: string | null
  scopes: string[]
  metadata: Record<string, unknown>
  last_sync_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string
  client_id: string
  organization_id: string
  platform_connection_id: string
  platform: PlatformType
  platform_campaign_id: string
  name: string
  status: CampaignStatus
  objective: string | null
  start_date: string | null
  end_date: string | null
  daily_budget: number | null
  total_budget: number | null
  currency: string
  target_locations: string[]
  target_languages: string[]
  platform_metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CampaignWithMetrics extends Campaign {
  latest_metrics?: CampaignMetrics
  health_score?: HealthScore
  client?: Client
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface CampaignMetrics {
  id: string
  campaign_id: string
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  conversion_value: number
  ctr: number
  cpc: number
  cpm: number
  roas: number | null
  quality_score: number | null
  platform_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DailyPerformance {
  id: string
  campaign_id: string
  client_id: string
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  conversion_value: number
  ctr: number
  cpc: number
  cpm: number
  roas: number | null
  created_at: string
}

export interface BudgetTracking {
  id: string
  campaign_id: string
  client_id: string
  period_start: string
  period_end: string
  budgeted_amount: number
  spent_amount: number
  projected_spend: number
  pacing_rate: number
  currency: string
  updated_at: string
}

// ─── Health Scores ────────────────────────────────────────────────────────────

export interface HealthScore {
  id: string
  campaign_id: string
  score: number
  components: {
    budget_pacing: number
    ctr_benchmark: number
    conversion_rate: number
    quality_score: number
    spend_efficiency: number
  }
  trend: 'improving' | 'stable' | 'declining'
  calculated_at: string
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export interface Alert {
  id: string
  organization_id: string
  client_id: string | null
  campaign_id: string | null
  severity: AlertSeverity
  status: AlertStatus
  type: string
  title: string
  message: string
  metadata: Record<string, unknown>
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface AlertWithContext extends Alert {
  client?: Client
  campaign?: Campaign
  acknowledged_by_user?: UserProfile
}

// ─── AI Insights ──────────────────────────────────────────────────────────────

export interface AIInsight {
  id: string
  organization_id: string
  client_id: string | null
  campaign_id: string | null
  type: InsightType
  title: string
  summary: string
  details: string
  data_points: Record<string, unknown>
  confidence: number
  is_read: boolean
  generated_at: string
  expires_at: string | null
  created_at: string
}

export interface AIRecommendation {
  id: string
  organization_id: string
  client_id: string | null
  campaign_id: string | null
  priority: RecommendationPriority
  title: string
  description: string
  expected_impact: string
  implementation_steps: string[]
  estimated_lift: number | null
  is_dismissed: boolean
  is_implemented: boolean
  implemented_at: string | null
  generated_at: string
  created_at: string
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  organization_id: string
  client_id: string | null
  campaign_id: string | null
  created_by: string
  assigned_to: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TaskWithContext extends Task {
  client?: Client
  campaign?: Campaign
  created_by_user?: UserProfile
  assigned_to_user?: UserProfile
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface Report {
  id: string
  organization_id: string
  client_id: string | null
  created_by: string
  title: string
  description: string | null
  status: ReportStatus
  type: 'performance' | 'budget' | 'competitive' | 'custom'
  date_range_start: string
  date_range_end: string
  platforms: PlatformType[]
  campaign_ids: string[]
  config: Record<string, unknown>
  file_url: string | null
  generated_at: string | null
  created_at: string
  updated_at: string
}

// ─── Sync Jobs ────────────────────────────────────────────────────────────────

export interface SyncJobLog {
  id: string
  organization_id: string
  platform_connection_id: string
  job_type: 'full' | 'incremental' | 'campaigns' | 'metrics'
  status: SyncStatus
  started_at: string
  completed_at: string | null
  records_synced: number
  records_failed: number
  error_summary: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ApiError {
  id: string
  organization_id: string
  platform_connection_id: string | null
  endpoint: string
  error_code: string | null
  error_message: string
  request_payload: Record<string, unknown> | null
  response_body: Record<string, unknown> | null
  retry_count: number
  resolved: boolean
  created_at: string
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface DashboardMetrics {
  total_clients: number
  active_campaigns: number
  total_spend_mtd: number
  total_impressions_mtd: number
  total_clicks_mtd: number
  avg_ctr: number
  avg_cpc: number
  total_conversions_mtd: number
  open_alerts: number
  pending_tasks: number
  spend_change_pct: number
  clicks_change_pct: number
  conversions_change_pct: number
}

export interface SpendByPlatform {
  platform: PlatformType
  spend: number
  percentage: number
}

export interface PerformanceTrend {
  date: string
  spend: number
  clicks: number
  impressions: number
  conversions: number
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface CreateClientForm {
  name: string
  industry: string
  website: string
  monthly_budget: number | null
  currency: string
  timezone: string
  account_manager_id: string | null
  tags: string[]
  notes: string
}

export interface CreateTaskForm {
  title: string
  description: string
  client_id: string | null
  campaign_id: string | null
  assigned_to: string | null
  priority: TaskPriority
  due_date: string | null
  tags: string[]
}

export interface CreateReportForm {
  title: string
  description: string
  type: Report['type']
  client_id: string | null
  date_range_start: string
  date_range_end: string
  platforms: PlatformType[]
  campaign_ids: string[]
}

// ─── Filter / Query Types ─────────────────────────────────────────────────────

export interface DateRange {
  from: Date
  to: Date
}

export interface CampaignFilters {
  status?: CampaignStatus[]
  platforms?: PlatformType[]
  client_id?: string
  search?: string
  date_range?: DateRange
}

export interface AlertFilters {
  organizationId?: string
  severity?: AlertSeverity[]
  status?: AlertStatus[]
  client_id?: string
  search?: string
}

export interface TaskFilters {
  organizationId?: string
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assigned_to?: string
  client_id?: string
  search?: string
}
