import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isMissingEnv } from './supabase'

export type InstanceRole = 'owner' | 'editor' | 'viewer'

interface Membership {
  instanceId: string
  role: InstanceRole
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  membership: Membership | null
  isMember: boolean
  isSuperAdmin: boolean
  isViewer: boolean
  signInWithDiscord: () => Promise<void>
  signOut: () => Promise<void>
  refreshMembership: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function loadMembership(userId: string): Promise<Membership | null> {
  const { data } = await supabase
    .from('instance_members')
    .select('instance_id, role')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return null
  return { instanceId: data.instance_id, role: data.role as InstanceRole }
}

async function loadIsSuperAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('super_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const handleSession = async (newSession: Session | null) => {
    if (!newSession?.user) {
      setSession(null)
      setUser(null)
      setMembership(null)
      setIsSuperAdmin(false)
      setLoading(false)
      return
    }

    setSession(newSession)
    setUser(newSession.user)

    const [m, s] = await Promise.all([
      loadMembership(newSession.user.id),
      loadIsSuperAdmin(newSession.user.id),
    ])
    setMembership(m)
    setIsSuperAdmin(s)
    setLoading(false)
  }

  useEffect(() => {
    if (isMissingEnv) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: false,
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshMembership = async () => {
    if (!user) return
    const m = await loadMembership(user.id)
    setMembership(m)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        membership,
        isMember: !!membership,
        isSuperAdmin,
        isViewer: membership?.role === 'viewer',
        signInWithDiscord,
        signOut,
        refreshMembership,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function getDiscordUsername(user: User): string {
  return user.user_metadata?.full_name || user.user_metadata?.name || 'User'
}

export function getDiscordAvatar(user: User): string | null {
  return user.user_metadata?.avatar_url || null
}
