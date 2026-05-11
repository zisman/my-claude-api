import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCampaigns, getCampaign, getCampaignMetrics, updateCampaignStatus, getDailyPerformance } from '@/lib/api/campaigns'
import type { CampaignFilters } from '@/types'

export function useCampaigns(filters?: CampaignFilters) {
  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => getCampaigns(filters),
    staleTime: 60_000,
  })
}

export function useCampaign(id: string) {
  return useQuery({ queryKey: ['campaigns', id], queryFn: () => getCampaign(id), enabled: !!id })
}

export function useCampaignMetrics(campaignId: string, days = 30) {
  return useQuery({
    queryKey: ['campaign-metrics', campaignId, days],
    queryFn: () => getCampaignMetrics(campaignId, days),
    enabled: !!campaignId,
  })
}

export function useDailyPerformance(clientId: string, days = 30) {
  return useQuery({
    queryKey: ['daily-performance', clientId, days],
    queryFn: () => getDailyPerformance(clientId, days),
    enabled: !!clientId,
  })
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: import('@/types').CampaignStatus }) =>
      updateCampaignStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}
