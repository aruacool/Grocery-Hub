import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface InviteInfo {
  instance_name: string
  expired: boolean
  used_up: boolean
}

export function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const { user, isMember, refreshMembership } = useAuth()
  const navigate = useNavigate()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [lookupDone, setLookupDone] = useState(false)
  const [status, setStatus] = useState<'idle' | 'redeeming' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!code) return
    supabase.rpc('get_invite_info', { p_code: code }).then(({ data }) => {
      if (data && data.length > 0) setInfo(data[0] as InviteInfo)
      setLookupDone(true)
    })
  }, [code])

  useEffect(() => {
    if (!user || !code || isMember || !info || info.expired || info.used_up) return
    setStatus('redeeming')
    supabase.rpc('redeem_invite', { p_code: code }).then(async ({ error }) => {
      if (error) {
        setStatus('error')
        setErrorMsg(error.message)
        return
      }
      await refreshMembership()
      setStatus('success')
      setTimeout(() => navigate('/'), 1200)
    })
  }, [user, isMember, code, info, refreshMembership, navigate])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.href },
    })
  }

  const inviteName = info?.instance_name ?? '...'

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="bg-surface-800 rounded-2xl p-8 max-w-md w-full text-center border border-surface-700 shadow-2xl">
        <div className="text-5xl mb-3">🎟️</div>

        {!lookupDone && (
          <div className="text-surface-400 text-sm">בודק קוד...</div>
        )}

        {lookupDone && !info && (
          <>
            <h1 className="text-xl font-bold mb-2">קוד לא תקין</h1>
            <p className="text-surface-400 text-sm mb-4">לא מצאנו הזמנה כזו.</p>
            <button onClick={() => navigate('/')} className="text-primary text-sm">
              חזור
            </button>
          </>
        )}

        {lookupDone && info && info.expired && (
          <>
            <h1 className="text-xl font-bold mb-2">קוד פג תוקף</h1>
            <p className="text-surface-400 text-sm">בקש קוד חדש מבעל הרשימה.</p>
          </>
        )}

        {lookupDone && info && info.used_up && (
          <>
            <h1 className="text-xl font-bold mb-2">הקוד נוצל</h1>
            <p className="text-surface-400 text-sm">בקש קוד חדש מבעל הרשימה.</p>
          </>
        )}

        {lookupDone && info && !info.expired && !info.used_up && (
          <>
            <h1 className="text-xl font-bold mb-2">הוזמנת ל</h1>
            <p className="text-primary text-lg mb-6">{inviteName}</p>

            {!user && (
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-6 rounded-xl transition-all"
              >
                התחבר עם Discord להצטרפות
              </button>
            )}

            {user && isMember && status === 'idle' && (
              <p className="text-surface-400 text-sm">אתה כבר חבר ברשימה. צא מהרשימה הנוכחית כדי להצטרף לחדשה.</p>
            )}

            {user && status === 'redeeming' && (
              <p className="text-surface-400 text-sm">מצרף אותך...</p>
            )}

            {status === 'success' && (
              <p className="text-success text-sm">הצטרפת! מעביר אותך לרשימה...</p>
            )}

            {status === 'error' && (
              <p className="text-error text-sm">{errorMsg}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
