import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Plus, Ticket } from 'lucide-react'
import { useAuth, getDiscordUsername } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function OnboardingPage() {
  const { user, signOut, refreshMembership } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setError('')
    if (!name.trim()) {
      setError('יש לתת שם לרשימה')
      return
    }
    setSubmitting(true)
    const { error: rpcErr } = await supabase.rpc('create_instance', { p_name: name.trim() })
    setSubmitting(false)
    if (rpcErr) {
      setError(rpcErr.message)
      return
    }
    await refreshMembership()
    navigate('/')
  }

  const handleJoin = () => {
    setError('')
    const trimmed = code.trim()
    if (!trimmed) {
      setError('יש להזין קוד')
      return
    }
    navigate(`/join/${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="bg-surface-800 rounded-2xl p-8 max-w-md w-full border border-surface-700 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👋</div>
          <h1 className="text-xl font-bold mb-1">
            {user ? `שלום ${getDiscordUsername(user)}` : 'שלום'}
          </h1>
          <p className="text-surface-400 text-sm">
            {mode === 'choose' && 'יצירה או הצטרפות לרשימת קניות'}
            {mode === 'create' && 'צור רשימה חדשה'}
            {mode === 'join' && 'הצטרף עם קוד הזמנה'}
          </p>
        </div>

        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary p-4 rounded-xl transition-colors"
            >
              <Plus size={22} />
              <div className="text-right flex-1">
                <div className="font-medium">צור רשימה חדשה</div>
                <div className="text-xs text-surface-400">פתח רשימה משלך</div>
              </div>
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full flex items-center gap-3 bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent p-4 rounded-xl transition-colors"
            >
              <Ticket size={22} />
              <div className="text-right flex-1">
                <div className="font-medium">הצטרף עם קוד</div>
                <div className="text-xs text-surface-400">קיבלת הזמנה ממישהו?</div>
              </div>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="שם הרשימה"
              className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 focus:outline-none focus:border-primary"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              {submitting ? 'יוצר...' : 'צור רשימה'}
            </button>
            <button
              onClick={() => { setMode('choose'); setError('') }}
              className="w-full text-surface-400 hover:text-surface-200 text-sm py-1"
            >
              חזור
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="קוד הזמנה"
              dir="ltr"
              className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-surface-100 focus:outline-none focus:border-accent text-center tracking-wider font-mono"
              autoFocus
            />
            <button
              onClick={handleJoin}
              className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              הצטרף
            </button>
            <button
              onClick={() => { setMode('choose'); setError('') }}
              className="w-full text-surface-400 hover:text-surface-200 text-sm py-1"
            >
              חזור
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 bg-error/10 border border-error/30 text-error text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          onClick={signOut}
          className="mt-6 w-full flex items-center justify-center gap-2 text-surface-500 hover:text-surface-300 text-sm py-2"
        >
          <LogOut size={14} /> התנתק
        </button>
      </div>
    </div>
  )
}
