import { Brain } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { useCampaignSummaries } from '@/hooks/useMetrics'

export function InsightsPage() {
  const { data: campaigns = [], isLoading } = useCampaignSummaries()

  return (
    <div>
      <Header
        title="Insights"
        subtitle="AI-generated analysis of your campaigns"
      />
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading campaigns…</p>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                  <Brain className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {campaigns.length > 0
                    ? `${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''} ready for analysis`
                    : 'No campaigns found'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  AI insights are generated per-campaign. Open any campaign detail page and use the Insights panel to analyze performance.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
