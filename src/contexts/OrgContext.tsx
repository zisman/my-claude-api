import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import type { Organization } from '@/types'

const PLAN_LIMITS = {
  starter: { maxUsers: 5, maxClients: 10 },
  growth: { maxUsers: 25, maxClients: 50 },
  enterprise: { maxUsers: 999, maxClients: 999 },
  custom: { maxUsers: 999, maxClients: 999 },
} as const

interface OrgContextValue {
  organization: Organization | null
  loading: boolean
  planLimits: { maxUsers: number; maxClients: number }
  refresh: () => Promise<void>
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrg = async () => {
    if (!user?.organization_id) {
      setOrganization(null)
      setLoading(false)
      return
    }
    try {
      const db = supabase as any
      const { data } = await db
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single()
      setOrganization(data ?? null)
    } catch {
      setOrganization(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchOrg()
    } else {
      setOrganization(null)
      setLoading(false)
    }
  }, [user?.organization_id, isAuthenticated])

  const plan = (organization?.plan ?? 'starter') as keyof typeof PLAN_LIMITS
  const planLimits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter

  return (
    <OrgContext.Provider value={{ organization, loading, planLimits, refresh: fetchOrg }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}
