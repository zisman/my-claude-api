import { runAnalysis } from './analysis-service'
import type { Recommendation, GeneratedTask } from './types'

const PRIORITY_MAP: Record<Recommendation['priority'], GeneratedTask['priority']> = {
  critical: 'urgent',
  high: 'high',
  medium: 'normal',
  low: 'low',
}

const DUE_IN_DAYS: Record<Recommendation['priority'], number> = {
  critical: 1,
  high: 3,
  medium: 7,
  low: 14,
}

export async function generateTasksFromRecommendations(
  recommendations: Recommendation[],
  entityName: string
): Promise<GeneratedTask[]> {
  if (recommendations.length === 0) return []

  const result = await runAnalysis<GeneratedTask[]>({
    type: 'generate_tasks',
    recommendations,
    entity_name: entityName,
  })

  return result
}

/**
 * Synchronous fallback: derive tasks directly from recommendation fields without
 * an extra Claude call. Use when a quick conversion is sufficient.
 */
export function deriveTasksFromRecommendations(
  recommendations: Recommendation[],
  entityName: string
): GeneratedTask[] {
  return recommendations.flatMap(rec => {
    const tasks: GeneratedTask[] = [{
      title: rec.title,
      description: `${rec.description}\n\nExpected Impact: ${rec.expected_impact}`,
      priority: PRIORITY_MAP[rec.priority],
      category: rec.category,
      due_in_days: DUE_IN_DAYS[rec.priority],
      source_recommendation_id: rec.id,
    }]

    if (rec.implementation_steps.length > 1 && rec.effort_level !== 'low') {
      tasks.push({
        title: `Implement: ${rec.title}`,
        description: rec.implementation_steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
        priority: rec.priority === 'critical' ? 'urgent' : 'normal',
        category: rec.category,
        due_in_days: DUE_IN_DAYS[rec.priority] + 3,
        source_recommendation_id: rec.id,
      })
    }

    return tasks
  })
}

export function mapTaskToSupabaseInsert(
  task: GeneratedTask,
  organizationId: string,
  campaignId?: string,
  clientId?: string,
  assignedTo?: string
) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + task.due_in_days)

  return {
    organization_id: organizationId,
    campaign_id: campaignId ?? null,
    client_id: clientId ?? null,
    title: task.title,
    description: task.description,
    priority: task.priority,
    category: task.category,
    due_date: dueDate.toISOString().slice(0, 10),
    assigned_to: assignedTo ?? null,
    status: 'open',
    source: 'ai_recommendation',
    source_reference: task.source_recommendation_id,
  }
}
