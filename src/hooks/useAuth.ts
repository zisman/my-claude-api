import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUserProfile } from '@/lib/supabase/auth'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile } from '@/types'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async (s: Session | null) => {
    if (!s) {
      setUser(null)
      setLoading(false)
      return
    }
    const profile = await getCurrentUserProfile()
    setUser(profile)
    setLoading(false)
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

  return { session, user, loading, isAuthenticated: !!session }
}
