import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUserProfile, signOut as authSignOut } from '@/lib/supabase/auth'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile, UserRole } from '@/types'

const ROLE_RANK: Record<UserRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  analyst: 2,
  viewer: 1,
}

interface AuthContextValue {
  session: Session | null
  user: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  /** True if the current user has at least the specified role */
  canAccess: (minimum: UserRole) => boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async (s: Session | null) => {
    if (!s) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const profile = await getCurrentUserProfile()
      setUser(profile)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadUser(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      loadUser(s)
    })

    return () => subscription.unsubscribe()
  }, [loadUser])

  const canAccess = useCallback((minimum: UserRole): boolean => {
    if (!user) return false
    return (ROLE_RANK[user.role] ?? 0) >= (ROLE_RANK[minimum] ?? 0)
  }, [user])

  const signOut = useCallback(async () => {
    await authSignOut()
    setSession(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!session) return
    const profile = await getCurrentUserProfile()
    setUser(profile)
  }, [session])

  return (
    <AuthContext.Provider value={{ session, user, loading, isAuthenticated: !!session, canAccess, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
