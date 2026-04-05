import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isMissingEnv } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithDiscord: () => Promise<void>
  signOut: () => Promise<void>
}

// Allowed Discord user IDs
const ALLOWED_DISCORD_IDS = new Set([
  '247114953524248576',
  '282234209764900865',
])

function isAllowedUser(user: User): boolean {
  const discordId = user.user_metadata?.provider_id || user.user_metadata?.sub
  return ALLOWED_DISCORD_IDS.has(discordId)
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isMissingEnv) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !isAllowedUser(session.user)) {
        supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !isAllowedUser(session.user)) {
        supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
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
    <AuthContext.Provider value={{ user, session, loading, signInWithDiscord, signOut }}>
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
