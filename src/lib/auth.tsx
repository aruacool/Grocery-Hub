import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isMissingEnv } from './supabase'

export type UserRole = 'admin' | 'viewer'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  role: UserRole | null
  isViewer: boolean
  signInWithDiscord: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function checkUserRole(user: User): Promise<UserRole | null> {
  const discordId = user.user_metadata?.provider_id || user.user_metadata?.sub
  if (!discordId) return null

  const { data } = await supabase
    .from('allowed_users')
    .select('role')
    .eq('discord_id', discordId)
    .single()

  return data?.role || null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  const handleSession = async (session: Session | null) => {
    if (!session?.user) {
      setSession(null)
      setUser(null)
      setRole(null)
      setLoading(false)
      return
    }

    const userRole = await checkUserRole(session.user)

    if (!userRole) {
      // Not in allowed_users table — kick them out
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setRole(null)
      setLoading(false)
      return
    }

    setSession(session)
    setUser(session.user)
    setRole(userRole)
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

  return (
    <AuthContext.Provider value={{ user, session, loading, role, isViewer: role === 'viewer', signInWithDiscord, signOut }}>
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
