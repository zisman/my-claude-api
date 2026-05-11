import { Plus, FileText, Download, Trash2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReports, deleteReport } from '@/lib/api/reports'
import { formatDistanceToNow } from 'date-fns'
import type { ReportStatus } from '@/types'

export function ReportsPage() {
  const qc = useQueryClient()
  const { data: reports = [], isLoading } = useQuery({ queryKey: ['reports'], queryFn: getReports })

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })

  const statusVariant = (s: ReportStatus) => ({
    pending: 'secondary', generating: 'warning', ready: 'success', failed: 'destructive'
  }[s] as 'secondary' | 'warning' | 'success' | 'destructive')

  return (
    <div>
      <Header
        title="Reports"
        subtitle="Generate and download performance reports"
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" /> New Report
          </Button>
        }
      />

      <div className="p-8">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-slate-400">Loading reports…</div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No reports yet. Generate your first performance report.</p>
                <Button size="sm" className="mt-4">
                  <Plus className="w-4 h-4" /> New Report
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reports.map(report => (
                  <div key={report.id} className="flex items-center gap-4 p-5 hover:bg-slate-50">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{report.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">{report.type}</Badge>
                        <span className="text-xs text-slate-400">
                          {report.date_range_start} – {report.date_range_end}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Badge variant={statusVariant(report.status as ReportStatus)}>
                      {report.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {report.file_url && report.status === 'ready' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={report.file_url} download>
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-400 hover:text-red-500"
                        onClick={() => deleteMutation.mutate(report.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
