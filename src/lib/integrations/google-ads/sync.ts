// Google Ads sync — runs in Supabase Edge Functions, types shared here for reference

export interface GoogleAdsCampaign {
  id: string
  name: string
  status: 'ENABLED' | 'PAUSED' | 'REMOVED'
  campaign_budget: { amount_micros: number }
  advertising_channel_type: string
  start_date: string
  end_date: string
  metrics?: GoogleAdsMetrics
}

export interface GoogleAdsMetrics {
  impressions: number
  clicks: number
  cost_micros: number
  conversions: number
  conversions_value: number
  ctr: number
  average_cpc: number
  average_cpm: number
  search_impression_share?: number
}

export function normalizeGoogleAdsCampaign(raw: GoogleAdsCampaign) {
  return {
    platform: 'google_ads' as const,
    platform_campaign_id: raw.id,
    name: raw.name,
    status: normalizeStatus(raw.status),
    daily_budget: raw.campaign_budget?.amount_micros ? raw.campaign_budget.amount_micros / 1_000_000 : null,
    objective: raw.advertising_channel_type,
    start_date: raw.start_date || null,
    end_date: raw.end_date || null,
    platform_metadata: raw,
  }
}

export function normalizeGoogleAdsMetrics(raw: GoogleAdsMetrics, date: string) {
  const spend = raw.cost_micros / 1_000_000
  const ctr = raw.ctr ?? (raw.impressions > 0 ? raw.clicks / raw.impressions : 0)
  const cpc = raw.average_cpc ? raw.average_cpc / 1_000_000 : spend > 0 && raw.clicks > 0 ? spend / raw.clicks : 0
  const cpm = raw.average_cpm ? raw.average_cpm / 1_000_000 : spend > 0 && raw.impressions > 0 ? (spend / raw.impressions) * 1000 : 0
  const roas = spend > 0 && raw.conversions_value > 0 ? raw.conversions_value / spend : null

  return {
    date,
    impressions: raw.impressions,
    clicks: raw.clicks,
    spend,
    conversions: raw.conversions,
    conversion_value: raw.conversions_value,
    ctr: ctr * 100,
    cpc,
    cpm,
    roas,
    platform_data: raw,
  }
}

function normalizeStatus(status: GoogleAdsCampaign['status']) {
  const map: Record<string, string> = { ENABLED: 'active', PAUSED: 'paused', REMOVED: 'ended' }
  return map[status] ?? 'error'
}
