import { useState } from 'react'
import { Plus, CheckSquare } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, updateTask } from '@/lib/api/tasks'
import { useAuth } from '@/hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import type { TaskStatus, TaskPriority } from '@/types'

export function TasksPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [activeStatus, setActiveStatus] = useState<TaskStatus | 'all'>('todo')

  const orgId = user?.organization_id

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', orgId, activeStatus],
    queryFn: () => getTasks({
      organizationId: orgId,
      ...(activeStatus !== 'all' && { status: [activeStatus] }),
    }),
    enabled: !!orgId,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<{ status: TaskStatus }> }) =>
      updateTask(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const tabs: { id: TaskStatus | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'done', label: 'Done' },
  ]

  return (
    <div>
      <Header
        title="Tasks"
        subtitle="Track action items across clients and campaigns"
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        }
      />

      <div className="p-8">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveStatus(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeStatus === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-slate-400">Loading tasks…</div>
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center">
                <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No tasks here. Add your first task.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={e => updateMutation.mutate({
                        id: task.id,
                        updates: { status: e.target.checked ? 'done' : 'todo' }
                      })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <StatusBadge status={task.priority as TaskPriority} />
                        {(task as { client?: { name: string } }).client && (
                          <span className="text-xs text-slate-400">
                            {(task as { client?: { name: string } }).client?.name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="text-xs text-slate-400">
                            Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={task.status as TaskStatus} />
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
